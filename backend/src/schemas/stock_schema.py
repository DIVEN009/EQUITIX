from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StockBase(BaseModel):
    ticker: str = Field(..., max_length=10, description="Stock ticker symbol (e.g. AAPL)")
    company_name: str = Field(..., description="Full company name")
    sector: Optional[str] = Field(None, description="Industry sector")


class StockSearchItem(StockBase):
    model_config = ConfigDict(from_attributes=True)


class DailyPriceItem(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int

    model_config = ConfigDict(from_attributes=True)


class StockSummaryResponse(StockBase):
    current_price: Optional[float] = None
    previous_close: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    latest_trading_date: Optional[date] = None
    source: str = Field("live", description="'live' or 'db_fallback'")

    model_config = ConfigDict(from_attributes=True)


class StockHistoryResponse(BaseModel):
    ticker: str
    company_name: Optional[str] = None
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

