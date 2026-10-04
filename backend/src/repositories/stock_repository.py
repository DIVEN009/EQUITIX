from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.models.database_models import Stock, DailyPrice, Prediction


class StockRepository:
    """
    Repository layer handling database CRUD operations for Stocks,
    DailyPrices, and Predictions.
    """

    def get_stock(self, db: Session, ticker: str) -> Optional[Stock]:
        ticker_clean = ticker.upper().strip()
        stock = db.query(Stock).filter(Stock.ticker == ticker_clean).first()
        if not stock and "." not in ticker_clean:
            stock = db.query(Stock).filter(Stock.ticker == f"{ticker_clean}.NS").first()
            if not stock:
                stock = db.query(Stock).filter(Stock.ticker == f"{ticker_clean}.BO").first()
        return stock

    def upsert_stock(
        self,
        db: Session,
        ticker: str,
        company_name: str,
        sector: Optional[str] = None,
    ) -> Stock:
        ticker_clean = ticker.upper().strip()
        stmt = pg_insert(Stock).values(
            ticker=ticker_clean,
            company_name=company_name,
            sector=sector,
        )
        update_dict = {"company_name": company_name}
        if sector is not None:
            update_dict["sector"] = sector

        stmt = stmt.on_conflict_do_update(
            index_elements=["ticker"],
            set_=update_dict,
        )
        db.execute(stmt)
        db.commit()
        return self.get_stock(db, ticker_clean)

    def search_stocks(self, db: Session, query: str, limit: int = 10) -> List[Stock]:
        q = f"%{query.strip()}%"
        return (
            db.query(Stock)
            .filter((Stock.ticker.ilike(q)) | (Stock.company_name.ilike(q)))
            .limit(limit)
            .all()
        )

    def get_latest_daily_price(self, db: Session, ticker: str) -> Optional[DailyPrice]:
        ticker_clean = ticker.upper().strip()
        stock = self.get_stock(db, ticker_clean)
        actual_ticker = stock.ticker if stock else ticker_clean
        return (
            db.query(DailyPrice)
            .filter(DailyPrice.ticker == actual_ticker)
            .order_by(DailyPrice.date.desc())
            .first()
        )

    def get_daily_prices(
        self,
        db: Session,
        ticker: str,
        days: int = 365,
    ) -> List[DailyPrice]:
        ticker_clean = ticker.upper().strip()
        stock = self.get_stock(db, ticker_clean)
        actual_ticker = stock.ticker if stock else ticker_clean
        cutoff_date = date.today() - timedelta(days=days)
        return (
            db.query(DailyPrice)
            .filter(
                DailyPrice.ticker == actual_ticker,
                DailyPrice.date >= cutoff_date,
            )
            .order_by(DailyPrice.date.asc())
            .all()
        )

    def upsert_daily_prices(
        self,
        db: Session,
        ticker: str,
        records: List[Dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        ticker_clean = ticker.upper().strip()
        prepared_records = []
        for r in records:
            prepared_records.append({
                "ticker": ticker_clean,
                "date": r["date"],
                "open": r["open"],
                "high": r["high"],
                "low": r["low"],
                "close": r["close"],
                "volume": r["volume"],
            })

        stmt = pg_insert(DailyPrice).values(prepared_records)
        stmt = stmt.on_conflict_do_update(
            index_elements=["ticker", "date"],
            set_={
                "open": stmt.excluded.open,
                "high": stmt.excluded.high,
                "low": stmt.excluded.low,
                "close": stmt.excluded.close,
                "volume": stmt.excluded.volume,
            },
        )
        db.execute(stmt)
        db.commit()
        return len(prepared_records)

    def get_predictions(self, db: Session, ticker: str) -> List[Prediction]:
        return (
            db.query(Prediction)
            .filter(Prediction.ticker == ticker.upper().strip())
            .order_by(Prediction.target_date.asc())
            .all()
        )


stock_repository = StockRepository()
