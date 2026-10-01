import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import yfinance as yf

from src.core.database import SessionLocal
from src.models.database_models import Stock, DailyPrice
from src.repositories.stock_repository import StockRepository, stock_repository
from src.schemas.stock_schema import (
    StockSummaryResponse,
    StockHistoryResponse,
    DailyPriceItem,
    StockPredictionsResponse,
    PredictionItem,
)

logger = logging.getLogger(__name__)

YFINANCE_TIMEOUT_SECONDS = 1.5


class StockService:
    """
    Business logic layer for Stock Market operations.
    Implements yfinance integration with strict 1.5s timeout and PostgreSQL fallback caching.
    """

    def __init__(self, repo: StockRepository = stock_repository):
        self.repo = repo

    def _sync_yfinance_fetch(self, ticker: str, days: int = 365) -> Optional[Dict[str, Any]]:
        """
        Synchronous helper to fetch data from yfinance ticker.
        Designed to run inside an asyncio executor thread.
        """
        try:
            ticker_clean = ticker.upper().strip()
            yf_ticker = yf.Ticker(ticker_clean)

            # Determine period parameter
            if days <= 5:
                period = "5d"
            elif days <= 30:
                period = "1mo"
            elif days <= 90:
                period = "3mo"
            elif days <= 180:
                period = "6mo"
            elif days <= 365:
                period = "1y"
            elif days <= 730:
                period = "2y"
            else:
                period = "5y"

            history_df = yf_ticker.history(period=period)
            if history_df.empty:
                return None

            # Fast info or fallback info
            fast_info = getattr(yf_ticker, "fast_info", None)
            current_price = None
            previous_close = None

            if fast_info:
                current_price = getattr(fast_info, "last_price", None)
                previous_close = getattr(fast_info, "previous_close", None)

            # Parse historical prices
            price_records = []
            for index, row in history_df.iterrows():
                try:
                    price_date = index.date() if hasattr(index, "date") else index
                    price_records.append({
                        "date": price_date,
                        "open": round(float(row["Open"]), 2),
                        "high": round(float(row["High"]), 2),
                        "low": round(float(row["Low"]), 2),
                        "close": round(float(row["Close"]), 2),
                        "volume": int(row["Volume"]),
                    })
                except Exception as row_err:
                    logger.debug(f"Skipping malformed row for {ticker_clean}: {row_err}")
                    continue

            if not current_price and price_records:
                current_price = price_records[-1]["close"]
                if len(price_records) > 1:
                    previous_close = price_records[-2]["close"]

            # Try to fetch company details
            company_name = ticker_clean
            sector = None
            try:
                info = yf_ticker.info
                if info:
                    company_name = info.get("shortName") or info.get("longName") or ticker_clean
                    sector = info.get("sector")
            except Exception:
                pass

            return {
                "ticker": ticker_clean,
                "company_name": company_name,
                "sector": sector,
                "current_price": round(float(current_price), 2) if current_price else None,
                "previous_close": round(float(previous_close), 2) if previous_close else None,
                "price_records": price_records,
            }

        except Exception as exc:
            logger.warning(f"Error fetching yfinance data for {ticker}: {exc}")
            return None

    async def fetch_with_timeout(
        self,
        ticker: str,
        days: int = 365,
        timeout: float = YFINANCE_TIMEOUT_SECONDS,
    ) -> Optional[Dict[str, Any]]:
        """
        Executes yfinance data fetch in a thread executor with a strict timeout.
        Returns data if finished within `timeout` seconds, or None if timed out / failed.
        """
        loop = asyncio.get_running_loop()
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(None, self._sync_yfinance_fetch, ticker, days),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            logger.info(f"yfinance fetch timed out after {timeout}s for ticker '{ticker}'")
            return None
        except Exception as exc:
            logger.warning(f"Async yfinance fetch exception for '{ticker}': {exc}")
            return None

    def sync_stock_data_background(self, ticker: str, days: int = 365) -> None:
        """
        Background task worker to fetch and persist fresh stock data without blocking the user.
        Uses an isolated DB session.
        """
        logger.info(f"Starting background data sync for ticker '{ticker}'")
        data = self._sync_yfinance_fetch(ticker, days=days)
        if not data:
            logger.warning(f"Background sync failed for ticker '{ticker}' (no data returned)")
            return

        db = SessionLocal()
        try:
            self.repo.upsert_stock(
                db=db,
                ticker=data["ticker"],
                company_name=data["company_name"],
                sector=data["sector"],
            )
            if data["price_records"]:
                self.repo.upsert_daily_prices(
                    db=db,
                    ticker=data["ticker"],
                    records=data["price_records"],
                )
            logger.info(
                f"Successfully completed background sync for {ticker}: "
                f"saved {len(data['price_records'])} price records"
            )
        except Exception as db_err:
            logger.error(f"Error persisting background sync for {ticker}: {db_err}")
            db.rollback()
        finally:
            db.close()

    def _is_price_fresh(self, latest_date: Optional[date]) -> bool:
        """
        Checks if the latest available price is reasonably fresh
        (taking weekends and market close into account).
        """
        if not latest_date:
            return False
        today = date.today()
        # If Saturday or Sunday, Friday's date is fresh
        weekday = today.weekday()
        if weekday == 5:  # Saturday
            return (today - latest_date).days <= 1
        elif weekday == 6:  # Sunday
            return (today - latest_date).days <= 2
        elif weekday == 0:  # Monday
            return (today - latest_date).days <= 3
        else:
            return (today - latest_date).days <= 1

    async def get_stock_quote(
        self,
        ticker: str,
        db: Session,
        background_tasks: BackgroundTasks,
    ) -> StockSummaryResponse:
        """
        Retrieve company info and latest price.
        Tries yfinance with a 1.5s timeout. If timeout expires, falls back to DB data
        and schedules an asynchronous background update.
        """
        ticker_clean = ticker.upper().strip()
        existing_stock = self.repo.get_stock(db, ticker_clean)
        latest_price_rec = self.repo.get_latest_daily_price(db, ticker_clean)

        # 1. Attempt yfinance with 1.5s timeout
        yf_data = await self.fetch_with_timeout(ticker_clean, days=5, timeout=YFINANCE_TIMEOUT_SECONDS)

        if yf_data:
            # yfinance returned in time: persist and return live data
            stock = self.repo.upsert_stock(
                db=db,
                ticker=yf_data["ticker"],
                company_name=yf_data["company_name"],
                sector=yf_data["sector"],
            )
            if yf_data["price_records"]:
                self.repo.upsert_daily_prices(db, yf_data["ticker"], yf_data["price_records"])

            current_price = yf_data["current_price"]
            previous_close = yf_data["previous_close"]
            change = round(current_price - previous_close, 2) if (current_price and previous_close) else None
            change_percent = round((change / previous_close) * 100, 2) if (change and previous_close) else None

            latest_trading_date = yf_data["price_records"][-1]["date"] if yf_data["price_records"] else date.today()

            return StockSummaryResponse(
                ticker=stock.ticker,
                company_name=stock.company_name,
                sector=stock.sector,
                current_price=current_price,
                previous_close=previous_close,
                change=change,
                change_percent=change_percent,
                latest_trading_date=latest_trading_date,
                source="live",
            )

        # 2. yfinance timed out or returned no data: DB Fallback Strategy
        if existing_stock and latest_price_rec:
            # Schedule background task to update cache asynchronously
            background_tasks.add_task(self.sync_stock_data_background, ticker_clean, 365)

            curr_price = float(latest_price_rec.close)
            prev_price = float(latest_price_rec.open)
            chg = round(curr_price - prev_price, 2)
            chg_pct = round((chg / prev_price) * 100, 2) if prev_price else None

            return StockSummaryResponse(
                ticker=existing_stock.ticker,
                company_name=existing_stock.company_name,
                sector=existing_stock.sector,
                current_price=curr_price,
                previous_close=prev_price,
                change=chg,
                change_percent=chg_pct,
                latest_trading_date=latest_price_rec.date,
                source="db_fallback",
            )

        # 3. Neither yfinance in 1.5s nor DB data exists: do a blocking fetch attempt
        fallback_data = await self.fetch_with_timeout(ticker_clean, days=5, timeout=5.0)
        if not fallback_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock ticker '{ticker_clean}' not found or market data unavailable.",
            )

        stock = self.repo.upsert_stock(
            db=db,
            ticker=fallback_data["ticker"],
            company_name=fallback_data["company_name"],
            sector=fallback_data["sector"],
        )
        if fallback_data["price_records"]:
            self.repo.upsert_daily_prices(db, fallback_data["ticker"], fallback_data["price_records"])

        return StockSummaryResponse(
            ticker=stock.ticker,
            company_name=stock.company_name,
            sector=stock.sector,
            current_price=fallback_data["current_price"],
            previous_close=fallback_data["previous_close"],
            latest_trading_date=fallback_data["price_records"][-1]["date"] if fallback_data["price_records"] else date.today(),
            source="live",
        )

    async def get_stock_history(
        self,
        ticker: str,
        days: int,
        db: Session,
        background_tasks: BackgroundTasks,
    ) -> StockHistoryResponse:
        """
        Retrieve historical price data for charting.
        If cached in DB and fresh, returns immediately (<200ms).
        If stale, attempts yfinance with 1.5s timeout. On timeout, returns DB data
        and triggers a background refresh.
        """
        ticker_clean = ticker.upper().strip()
        existing_stock = self.repo.get_stock(db, ticker_clean)
        db_prices = self.repo.get_daily_prices(db, ticker_clean, days=days)

        is_fresh = False
        if db_prices:
            latest_price = db_prices[-1]
            is_fresh = self._is_price_fresh(latest_price.date)

        # Fast path: data exists in DB and is already fresh
        if db_prices and is_fresh:
            return StockHistoryResponse(
                ticker=ticker_clean,
                company_name=existing_stock.company_name if existing_stock else ticker_clean,
                count=len(db_prices),
                source="live",
                data=[
                    DailyPriceItem(
                        date=p.date,
                        open=float(p.open),
                        high=float(p.high),
                        low=float(p.low),
                        close=float(p.close),
                        volume=int(p.volume),
                    )
                    for p in db_prices
                ],
            )

        # Stale or missing: try yfinance with 1.5s timeout
        yf_data = await self.fetch_with_timeout(ticker_clean, days=days, timeout=YFINANCE_TIMEOUT_SECONDS)

        if yf_data and yf_data["price_records"]:
            stock = self.repo.upsert_stock(
                db=db,
                ticker=yf_data["ticker"],
                company_name=yf_data["company_name"],
                sector=yf_data["sector"],
            )
            self.repo.upsert_daily_prices(db, yf_data["ticker"], yf_data["price_records"])

            return StockHistoryResponse(
                ticker=stock.ticker,
                company_name=stock.company_name,
                count=len(yf_data["price_records"]),
                source="live",
                data=[DailyPriceItem(**r) for r in yf_data["price_records"]],
            )

        # Timeout occurred: fall back to existing DB data if present
        if db_prices:
            background_tasks.add_task(self.sync_stock_data_background, ticker_clean, days)
            return StockHistoryResponse(
                ticker=ticker_clean,
                company_name=existing_stock.company_name if existing_stock else ticker_clean,
                count=len(db_prices),
                source="db_fallback",
                data=[
                    DailyPriceItem(
                        date=p.date,
                        open=float(p.open),
                        high=float(p.high),
                        low=float(p.low),
                        close=float(p.close),
                        volume=int(p.volume),
                    )
                    for p in db_prices
                ],
            )

        # No DB data: blocking one-off seed
        fallback_data = await self.fetch_with_timeout(ticker_clean, days=days, timeout=5.0)
        if not fallback_data or not fallback_data["price_records"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Historical price data for ticker '{ticker_clean}' could not be retrieved.",
            )

        stock = self.repo.upsert_stock(
            db=db,
            ticker=fallback_data["ticker"],
            company_name=fallback_data["company_name"],
            sector=fallback_data["sector"],
        )
        self.repo.upsert_daily_prices(db, fallback_data["ticker"], fallback_data["price_records"])

        return StockHistoryResponse(
            ticker=stock.ticker,
            company_name=stock.company_name,
            count=len(fallback_data["price_records"]),
            source="live",
            data=[DailyPriceItem(**r) for r in fallback_data["price_records"]],
        )

    def get_stock_predictions(self, ticker: str, db: Session) -> StockPredictionsResponse:
        """
        Retrieve offline-generated ML predictions for a ticker.
        """
        ticker_clean = ticker.upper().strip()
        predictions = self.repo.get_predictions(db, ticker_clean)
        return StockPredictionsResponse(
            ticker=ticker_clean,
            predictions=[
                PredictionItem(
                    target_date=p.target_date,
                    model_name=p.model_name,
                    predicted_price=float(p.predicted_price),
                    generated_at=p.generated_at,
                )
                for p in predictions
            ],
        )


stock_service = StockService()
