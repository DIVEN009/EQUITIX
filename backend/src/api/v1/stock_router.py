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
    ForexRatesResponse,
)
from src.services.stock_service import stock_service

router = APIRouter()


import asyncio
import logging

logger = logging.getLogger(__name__)

from src.data.popular_stocks import POPULAR_STOCKS



@router.get(
    "/search",
    response_model=List[StockSearchItem],
    status_code=status.HTTP_200_OK,
    summary="Search stocks",
    description="Search tracked stock tickers and companies by ticker symbol or name across all global & Indian markets.",
)
async def search_stocks(
    q: str = Query(..., min_length=1, description="Ticker symbol or company name keyword"),
    db: Session = Depends(get_db),
) -> List[StockSearchItem]:
    from src.services.security_master import security_master
    results = security_master.search(query=q, limit=15, db=db)
    return [StockSearchItem(**r) for r in results]


@router.get(
    "/resolve",
    status_code=status.HTTP_200_OK,
    summary="Resolve company name or bare ticker to canonical symbol",
    description="Dynamically resolves any company name, colloquial brand, or bare ticker to its official exchange-qualified trading symbol.",
)
def resolve_stock(
    q: str = Query(..., min_length=1, description="Company name or ticker to resolve"),
    db: Session = Depends(get_db),
):
    from src.services.security_master import security_master
    resolved = security_master.resolve(q, db=db)
    return resolved or {
        "ticker": q.upper().strip() if "." in q else f"{q.upper().strip()}.NS",
        "company_name": q.strip(),
        "exchange": "NSE" if q.upper().endswith(".NS") else "US",
        "currency": "INR" if q.upper().endswith((".NS", ".BO")) else "USD",
    }


@router.get(
    "/forex-rates",
    response_model=ForexRatesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get live forex exchange rates",
    description="Retrieve live forex conversion rates (USD, INR, EUR, GBP) with automatic in-memory caching.",
)
def get_forex_rates() -> ForexRatesResponse:
    return ForexRatesResponse(**stock_service.get_live_forex_rates())


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
    days: int = Query(365, ge=1, le=1825, description="Lookback window in calendar days"),
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
    db: Session = Depends(get_db),
) -> StockBenchmarksResponse:
    return stock_service.get_stock_benchmarks(ticker=ticker, db=db)

