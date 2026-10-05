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

POPULAR_STOCKS = [
    # Top Indian Equities (NSE)
    {"ticker": "RELIANCE.NS", "company_name": "Reliance Industries Ltd", "sector": "Energy", "exchange": "NSE", "currency": "INR"},
    {"ticker": "TCS.NS", "company_name": "Tata Consultancy Services", "sector": "Technology", "exchange": "NSE", "currency": "INR"},
    {"ticker": "INFY.NS", "company_name": "Infosys Ltd", "sector": "Technology", "exchange": "NSE", "currency": "INR"},
    {"ticker": "HDFCBANK.NS", "company_name": "HDFC Bank Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "TATAMOTORS.NS", "company_name": "Tata Motors Ltd", "sector": "Automotive", "exchange": "NSE", "currency": "INR"},
    {"ticker": "TATASTEEL.NS", "company_name": "Tata Steel Ltd", "sector": "Basic Materials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "TATAPOWER.NS", "company_name": "Tata Power Co Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "MARUTI.NS", "company_name": "Maruti Suzuki India Ltd", "sector": "Automotive", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ADANIENT.NS", "company_name": "Adani Enterprises Ltd", "sector": "Energy", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ADANIPORTS.NS", "company_name": "Adani Ports & SEZ Ltd", "sector": "Industrials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ADANIPOWER.NS", "company_name": "Adani Power Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "SBIN.NS", "company_name": "State Bank of India", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ICICIBANK.NS", "company_name": "ICICI Bank Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "KOTAKBANK.NS", "company_name": "Kotak Mahindra Bank Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "AXISBANK.NS", "company_name": "Axis Bank Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "BAJFINANCE.NS", "company_name": "Bajaj Finance Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "BAJAJFINSV.NS", "company_name": "Bajaj Finserv Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "BHARTIARTL.NS", "company_name": "Bharti Airtel Ltd", "sector": "Telecom", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ITC.NS", "company_name": "ITC Ltd", "sector": "Consumer Goods", "exchange": "NSE", "currency": "INR"},
    {"ticker": "HINDUNILVR.NS", "company_name": "Hindustan Unilever Ltd", "sector": "Consumer Goods", "exchange": "NSE", "currency": "INR"},
    {"ticker": "LT.NS", "company_name": "Larsen & Toubro Ltd", "sector": "Industrials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "TITAN.NS", "company_name": "Titan Company Ltd", "sector": "Consumer Goods", "exchange": "NSE", "currency": "INR"},
    {"ticker": "SUNPHARMA.NS", "company_name": "Sun Pharmaceutical Industries", "sector": "Healthcare", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ASIANPAINT.NS", "company_name": "Asian Paints Ltd", "sector": "Consumer Goods", "exchange": "NSE", "currency": "INR"},
    {"ticker": "NTPC.NS", "company_name": "NTPC Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ONGC.NS", "company_name": "Oil and Natural Gas Corp", "sector": "Energy", "exchange": "NSE", "currency": "INR"},
    {"ticker": "POWERGRID.NS", "company_name": "Power Grid Corporation of India", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "COALINDIA.NS", "company_name": "Coal India Ltd", "sector": "Energy", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ETERNAL.NS", "company_name": "Eternal Ltd (formerly Zomato)", "sector": "Consumer Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "JIOFIN.NS", "company_name": "Jio Financial Services Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "HAL.NS", "company_name": "Hindustan Aeronautics Ltd", "sector": "Industrials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "BEL.NS", "company_name": "Bharat Electronics Ltd", "sector": "Industrials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "SUZLON.NS", "company_name": "Suzlon Energy Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "VEDL.NS", "company_name": "Vedanta Ltd", "sector": "Basic Materials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "WIPRO.NS", "company_name": "Wipro Ltd", "sector": "Technology", "exchange": "NSE", "currency": "INR"},
    {"ticker": "HCLTECH.NS", "company_name": "HCL Technologies Ltd", "sector": "Technology", "exchange": "NSE", "currency": "INR"},
    {"ticker": "NHPC.NS", "company_name": "NHPC Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "IRFC.NS", "company_name": "Indian Railway Finance Corp", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "IOC.NS", "company_name": "Indian Oil Corporation Ltd", "sector": "Energy", "exchange": "NSE", "currency": "INR"},
    {"ticker": "BPCL.NS", "company_name": "Bharat Petroleum Corp Ltd", "sector": "Energy", "exchange": "NSE", "currency": "INR"},
    {"ticker": "GAIL.NS", "company_name": "GAIL (India) Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "TRENT.NS", "company_name": "Trent Ltd", "sector": "Consumer Discretionary", "exchange": "NSE", "currency": "INR"},
    {"ticker": "ZOMATO.NS", "company_name": "Zomato Ltd", "sector": "Consumer Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "PFC.NS", "company_name": "Power Finance Corporation", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "REC.NS", "company_name": "REC Ltd", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "RTNPOWER.NS", "company_name": "RattanIndia Power Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "RTNINDIA.NS", "company_name": "RattanIndia Enterprises Ltd", "sector": "Industrials", "exchange": "NSE", "currency": "INR"},
    {"ticker": "SJVN.NS", "company_name": "SJVN Ltd", "sector": "Utilities", "exchange": "NSE", "currency": "INR"},
    {"ticker": "IREDA.NS", "company_name": "Indian Renewable Energy Dev Agency", "sector": "Financial Services", "exchange": "NSE", "currency": "INR"},
    {"ticker": "RVNL.NS", "company_name": "Rail Vikas Nigam Ltd", "sector": "Industrials", "exchange": "NSE", "currency": "INR"},
    # US & Global Tech Leaders
    {"ticker": "AAPL", "company_name": "Apple Inc.", "sector": "Technology", "exchange": "NASDAQ", "currency": "USD"},
    {"ticker": "MSFT", "company_name": "Microsoft Corporation", "sector": "Technology", "exchange": "NASDAQ", "currency": "USD"},
    {"ticker": "GOOGL", "company_name": "Alphabet Inc. (Google)", "sector": "Communication Services", "exchange": "NASDAQ", "currency": "USD"},
    {"ticker": "AMZN", "company_name": "Amazon.com Inc.", "sector": "Consumer Discretionary", "exchange": "NASDAQ", "currency": "USD"},
    {"ticker": "NVDA", "company_name": "NVIDIA Corporation", "sector": "Technology", "exchange": "NASDAQ", "currency": "USD"},
    {"ticker": "TSLA", "company_name": "Tesla Inc.", "sector": "Automotive", "exchange": "NASDAQ", "currency": "USD"},
    {"ticker": "META", "company_name": "Meta Platforms Inc.", "sector": "Communication Services", "exchange": "NASDAQ", "currency": "USD"},
]


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
) -> StockBenchmarksResponse:
    return stock_service.get_stock_benchmarks(ticker=ticker)

