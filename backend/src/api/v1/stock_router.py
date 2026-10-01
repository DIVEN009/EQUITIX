from typing import List
from fastapi import APIRouter, Depends, Query, BackgroundTasks, status
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.repositories.stock_repository import stock_repository
from src.schemas.stock_schema import (
    StockSummaryResponse,
    StockHistoryResponse,
    StockPredictionsResponse,
    StockSearchItem,
    StockBenchmarksResponse,
)
from src.services.stock_service import stock_service

router = APIRouter()


POPULAR_INDIAN_STOCKS = [
    {"ticker": "RELIANCE.NS", "company_name": "Reliance Industries Ltd", "sector": "Energy"},
    {"ticker": "TCS.NS", "company_name": "Tata Consultancy Services", "sector": "Technology"},
    {"ticker": "INFY.NS", "company_name": "Infosys Ltd", "sector": "Technology"},
    {"ticker": "HDFCBANK.NS", "company_name": "HDFC Bank Ltd", "sector": "Financial Services"},
    {"ticker": "TATAMOTORS.NS", "company_name": "Tata Motors Ltd", "sector": "Automotive"},
    {"ticker": "SBIN.NS", "company_name": "State Bank of India", "sector": "Financial Services"},
    {"ticker": "ICICIBANK.NS", "company_name": "ICICI Bank Ltd", "sector": "Financial Services"},
    {"ticker": "WIPRO.NS", "company_name": "Wipro Ltd", "sector": "Technology"},
    {"ticker": "ITC.NS", "company_name": "ITC Ltd", "sector": "Consumer Goods"},
    {"ticker": "BHARTIARTL.NS", "company_name": "Bharti Airtel Ltd", "sector": "Telecom"},
]


@router.get(
    "/search",
    response_model=List[StockSearchItem],
    status_code=status.HTTP_200_OK,
    summary="Search stocks",
    description="Search tracked stock tickers and companies by ticker symbol or name.",
)
def search_stocks(
    q: str = Query(..., min_length=1, description="Ticker symbol or company name keyword"),
    db: Session = Depends(get_db),
) -> List[StockSearchItem]:
    stocks = stock_repository.search_stocks(db, query=q)
    results = [StockSearchItem.model_validate(s) for s in stocks]
    existing_tickers = {r.ticker for r in results}

    # Match seeded Indian stocks
    query_lower = q.lower().strip()
    for s in POPULAR_INDIAN_STOCKS:
        if s["ticker"] not in existing_tickers:
            if (
                query_lower in s["ticker"].lower()
                or query_lower in s["company_name"].lower()
                or query_lower in s["ticker"].split(".")[0].lower()
            ):
                results.append(StockSearchItem(**s))
                # Auto-seed in background DB
                stock_repository.upsert_stock(
                    db=db,
                    ticker=s["ticker"],
                    company_name=s["company_name"],
                    sector=s["sector"],
                )
    return results


@router.get(
    "/{ticker}",
    response_model=StockSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get stock quote & details",
    description=(
        "Fetch real-time stock quote and company metadata. "
        "Enforces a strict 1.5s external API timeout with automatic DB fallback."
    ),
)
async def get_stock_quote(
    ticker: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> StockSummaryResponse:
    return await stock_service.get_stock_quote(
        ticker=ticker,
        db=db,
        background_tasks=background_tasks,
    )


@router.get(
    "/{ticker}/history",
    response_model=StockHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get stock historical prices",
    description=(
        "Retrieve time-series OHLCV candlestick data for charting. "
        "Returns DB cached data (<200ms) or updates via background task on timeout."
    ),
)
async def get_stock_history(
    ticker: str,
    background_tasks: BackgroundTasks,
    days: int = Query(365, ge=5, le=1825, description="Lookback window in calendar days"),
    db: Session = Depends(get_db),
) -> StockHistoryResponse:
    return await stock_service.get_stock_history(
        ticker=ticker,
        days=days,
        db=db,
        background_tasks=background_tasks,
    )


@router.get(
    "/{ticker}/predictions",
    response_model=StockPredictionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get stock ML forecasts",
    description="Retrieve offline-generated 7-day forecasts produced by LSTM and baseline regression models.",
)
def get_stock_predictions(
    ticker: str,
    db: Session = Depends(get_db),
) -> StockPredictionsResponse:
    return stock_service.get_stock_predictions(ticker=ticker, db=db)


@router.get(
    "/{ticker}/benchmarks",
    response_model=StockBenchmarksResponse,
    status_code=status.HTTP_200_OK,
    summary="Get model validation benchmarks",
    description="Retrieve test set evaluation metrics (RMSE, Directional Accuracy) and model training parameters.",
)
def get_stock_benchmarks(
    ticker: str,
) -> StockBenchmarksResponse:
    return stock_service.get_stock_benchmarks(ticker=ticker)

