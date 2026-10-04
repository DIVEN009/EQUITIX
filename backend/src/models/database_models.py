import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, Date, ForeignKey, BigInteger, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.core.database import Base


# --- USERS & PORTFOLIOS ---

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    cash_balance = Column(Numeric(12, 2), default=0.00)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")


# --- STOCKS & MARKET DATA ---

class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String, primary_key=True, index=True)  # e.g., "AAPL"
    company_name = Column(String, nullable=False)
    sector = Column(String, nullable=True)

    holdings = relationship("Holding", back_populates="stock")
    prices = relationship("DailyPrice", back_populates="stock")
    predictions = relationship("Prediction", back_populates="stock")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("portfolios.id"), nullable=False)
    ticker = Column(String, ForeignKey("stocks.ticker"), nullable=False)
    shares = Column(Numeric(12, 4), nullable=False, default=0)
    average_price = Column(Numeric(12, 2), nullable=False)

    portfolio = relationship("Portfolio", back_populates="holdings")
    stock = relationship("Stock", back_populates="holdings")


# --- TIME-SERIES DATA (PRICES & ML PREDICTIONS) ---

class DailyPrice(Base):
    __tablename__ = "daily_prices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String, ForeignKey("stocks.ticker"), nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Numeric(10, 2))
    high = Column(Numeric(10, 2))
    low = Column(Numeric(10, 2))
    close = Column(Numeric(10, 2))
    volume = Column(BigInteger)

    stock = relationship("Stock", back_populates="prices")

    # Critical for fast queries: Composite Index on ticker + date
    __table_args__ = (
        Index("idx_ticker_date", "ticker", "date", unique=True),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String, ForeignKey("stocks.ticker"), nullable=False)
    target_date = Column(Date, nullable=False)
    model_name = Column(String, nullable=False)  # e.g., "LSTM_v1", "LinearReg_v1"
    predicted_price = Column(Numeric(10, 2), nullable=False)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    stock = relationship("Stock", back_populates="predictions")

    # Composite Index to quickly look up predictions for a stock on a specific date
    __table_args__ = (
        Index("idx_pred_ticker_date", "ticker", "target_date"),
    )
