from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Portfolio name")
    initial_cash: float = Field(
        default=10000.0,
        ge=0.0,
        description="Initial virtual cash balance allocated to the portfolio",
    )


class TransactionCreate(BaseModel):
    ticker: str = Field(..., max_length=30, description="Stock ticker symbol (e.g. AAPL, RELIANCE.NS)")
    action: Literal["BUY", "SELL"] = Field(..., description="Transaction action: BUY or SELL")
    shares: float = Field(..., gt=0, description="Number of shares to buy or sell")
    price: float = Field(..., gt=0, description="Execution price per share")


class HoldingResponse(BaseModel):
    id: UUID
    ticker: str
    company_name: Optional[str] = None
    shares: float
    average_price: float
    current_price: float
    invested_value: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float

    model_config = ConfigDict(from_attributes=True)


class PortfolioListItem(BaseModel):
    id: UUID
    name: str
    cash_balance: float
    holdings_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortfolioSummaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    cash_balance: float
    holdings_value: float
    total_value: float
    total_invested: float
    total_unrealized_pnl: float
    total_unrealized_pnl_percent: float
    created_at: datetime
    holdings: List[HoldingResponse] = []

    model_config = ConfigDict(from_attributes=True)
