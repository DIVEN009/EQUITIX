from datetime import date, datetime
from typing import List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class StockBase(BaseModel):
    ticker: str = Field(..., max_length=30, description="Stock ticker symbol (e.g. AAPL, RELIANCE.NS)")
    company_name: str = Field(..., description="Full company name")
    sector: Optional[str] = Field(None, description="Industry sector")
    exchange: Optional[str] = Field("US", description="Exchange code (e.g. NSE, BSE, NASDAQ, NYSE)")
    currency: Optional[str] = Field("USD", description="Trading currency (e.g. INR, USD, EUR)")


class StockSearchItem(StockBase):
    model_config = ConfigDict(from_attributes=True)


class DailyPriceItem(BaseModel):
    date: Union[datetime, date, str]
    open: float
    high: float
    low: float
    close: float
    volume: int

    model_config = ConfigDict(from_attributes=True)


class MarketStatusResponse(BaseModel):
    ticker: Optional[str] = None
    exchange: str = "NSE"
    market_name: str
    timezone: str
    timezone_abbr: str
    is_open: bool
    status: str
    session: str
    reason: str
    message: str
    regular_hours: str
    current_exchange_time: str
    next_open: str
    next_open_iso: Optional[str] = None
    next_open_countdown_seconds: int

    model_config = ConfigDict(from_attributes=True)


class StockSummaryResponse(StockBase):
    current_price: Optional[float] = None
    previous_close: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    latest_trading_date: Optional[date] = None
    source: str = Field("live", description="'live' or 'db_fallback'")
    market_status: Optional[MarketStatusResponse] = None

    model_config = ConfigDict(from_attributes=True)


class StockHistoryResponse(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    currency: str = Field("USD", description="Native trading currency")
    count: int
    source: str = Field("live", description="'live' or 'db_fallback'")
    data: List[DailyPriceItem]

    model_config = ConfigDict(from_attributes=True)


class PredictionItem(BaseModel):
    target_date: date
    model_name: str
    predicted_price: float
    generated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StockPredictionsResponse(BaseModel):
    ticker: str
    predictions: List[PredictionItem]

    model_config = ConfigDict(from_attributes=True)


class ModelBenchmarkItem(BaseModel):
    model_name: str
    display_name: str
    rmse: float
    directional_accuracy_pct: float
    weights_file: Optional[str] = None
    lookback_window: int = Field(60, description="Input sequence length in trading days")
    forecast_horizon: int = Field(7, description="Forecast horizon in business days")
    description: Optional[str] = None


class StockBenchmarksResponse(BaseModel):
    ticker: str
    train_samples: int = 777
    val_samples: int = 115
    test_samples: int = 115
    models: List[ModelBenchmarkItem]


class ForexRatesResponse(BaseModel):
    base: str = "USD"
    rates: dict[str, float]
    timestamp: str

    model_config = ConfigDict(from_attributes=True)


