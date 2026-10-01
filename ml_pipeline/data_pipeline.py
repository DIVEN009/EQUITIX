import os
import logging
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import yfinance as yf

logger = logging.getLogger(__name__)


def fetch_historical_data(ticker: str, period: str = "5y") -> pd.DataFrame:
    """
    Fetch raw OHLCV market data for a given ticker symbol using yfinance.
    Removes timezone offsets and validates completeness.
    """
    ticker_clean = ticker.upper().strip()
    logger.info(f"Fetching {period} historical data for {ticker_clean}...")
    
    t = yf.Ticker(ticker_clean)
    df = t.history(period=period)
    
    if df.empty:
        raise ValueError(f"No historical data returned for ticker '{ticker_clean}' with period '{period}'.")
    
    # Strip timezone info if present to maintain pure chronological dates
    if hasattr(df.index, "tz") and df.index.tz is not None:
        df.index = df.index.tz_localize(None)
        
    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.sort_index(inplace=True)
    return df


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate the 14-period Relative Strength Index (RSI).
    """
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    # Exponential weighted moving average (Wilder's smoothing)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature engineering pipeline:
    1. SMA_20: 20-day Simple Moving Average (short-term trend)
    2. SMA_50: 50-day Simple Moving Average (medium-term trend)
    3. RSI_14: 14-day Relative Strength Index (momentum/overbought/oversold)
    4. Daily_Return: Percentage close price change
    5. Volatility_20: 20-day rolling standard deviation of returns
    Drops NaN rows resulting from indicator lookback windows.
    """
    data = df.copy()
    
    data["SMA_20"] = data["Close"].rolling(window=20).mean()
    data["SMA_50"] = data["Close"].rolling(window=50).mean()
    data["RSI_14"] = compute_rsi(data["Close"], period=14)
    data["Daily_Return"] = data["Close"].pct_change()
    data["Volatility_20"] = data["Daily_Return"].rolling(window=20).std()
    
    initial_rows = len(data)
    data.dropna(inplace=True)
    logger.info(f"Engineered features: retained {len(data)} rows after dropping {initial_rows - len(data)} NaN burn-in rows.")
    return data


def chronological_split(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Strict chronological train/val/test split.
    Zero random shuffling to prevent data leakage in time-series forecasting.
    Default: 70% Train, 15% Validation, 15% Test.
    """
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    train_df = df.iloc[:train_end].copy()
    val_df = df.iloc[train_end:val_end].copy()
    test_df = df.iloc[val_end:].copy()
    
    logger.info(
        f"Chronological split -> Train: {len(train_df)} ({train_df.index[0].date()} to {train_df.index[-1].date()}), "
        f"Val: {len(val_df)} ({val_df.index[0].date()} to {val_df.index[-1].date()}), "
        f"Test: {len(test_df)} ({test_df.index[0].date()} to {test_df.index[-1].date()})"
    )
    return train_df, val_df, test_df


def scale_datasets(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: List[str],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, MinMaxScaler, MinMaxScaler]:
    """
    Scales features and target Close price between 0 and 1.
    CRITICAL: MinMaxScaler is strictly fitted ON TRAIN DATA ONLY, then used to
    transform validation and test sets to eliminate future-lookahead data leakage.
    Returns:
    (X_train_scaled, X_val_scaled, X_test_scaled, feature_scaler, target_scaler)
    """
    feature_scaler = MinMaxScaler(feature_range=(0, 1))
    target_scaler = MinMaxScaler(feature_range=(0, 1))
    
    # Fit strictly on train
    X_train_scaled = feature_scaler.fit_transform(train_df[feature_cols].values)
    target_scaler.fit(train_df[["Close"]].values)
    
    # Transform validation and test
    X_val_scaled = feature_scaler.transform(val_df[feature_cols].values)
    X_test_scaled = feature_scaler.transform(test_df[feature_cols].values)
    
    return X_train_scaled, X_val_scaled, X_test_scaled, feature_scaler, target_scaler


def create_sliding_sequences(
    feature_data: np.ndarray,
    target_prices: np.ndarray,
    lookback: int = 60,
    horizon: int = 7,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates supervised sliding window sequences:
    Input X: Past `lookback` (60) trading days of multidimensional features.
    Target y: Future `horizon` (7) trading days of Close price.
    Returns:
    X: shape (samples, lookback, num_features)
    y: shape (samples, horizon)
    """
    X_list, y_list = [], []
    num_samples = len(feature_data) - lookback - horizon + 1
    
    for i in range(num_samples):
        # Window of previous 60 days
        X_window = feature_data[i : i + lookback]
        # Target of next 7 days
        y_target = target_prices[i + lookback : i + lookback + horizon]
        
        X_list.append(X_window)
        y_list.append(y_target.flatten())
        
    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32)
