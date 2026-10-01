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
)
from src.services.stock_service import stock_service

router = APIRouter()


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
    return [StockSearchItem.model_validate(s) for s in stocks]


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
