import os
import sys
import numpy as np
import pandas as pd
import pytest

# Ensure repo root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml_pipeline.data_pipeline import (
    engineer_features,
    chronological_split,
    scale_datasets,
    create_sliding_sequences,
    compute_rsi,
)
from ml_pipeline.models import (
    BaselineLinearRegressionModel,
    calculate_rmse,
    calculate_directional_accuracy,
)


@pytest.fixture
def sample_market_df():
    # Generate 150 days of synthetic OHLCV data
    dates = pd.date_range(start="2024-01-01", periods=150, freq="B")
    np.random.seed(42)
    close_prices = 150.0 + np.cumsum(np.random.normal(0.5, 2.0, size=len(dates)))
    df = pd.DataFrame(
        {
            "Open": close_prices - np.random.uniform(0.1, 1.0, size=len(dates)),
            "High": close_prices + np.random.uniform(0.5, 2.0, size=len(dates)),
            "Low": close_prices - np.random.uniform(0.5, 2.0, size=len(dates)),
            "Close": close_prices,
            "Volume": np.random.randint(1000000, 5000000, size=len(dates)),
        },
        index=dates,
    )
    return df


def test_feature_engineering(sample_market_df):
    featured_df = engineer_features(sample_market_df)
    assert "SMA_20" in featured_df.columns
    assert "SMA_50" in featured_df.columns
    assert "RSI_14" in featured_df.columns
    assert "Volatility_20" in featured_df.columns
    assert not featured_df.isnull().values.any()
    # 49 rows burned for 50-day rolling window
    assert len(featured_df) == len(sample_market_df) - 49


def test_chronological_split(sample_market_df):
    featured_df = engineer_features(sample_market_df)
    train_df, val_df, test_df = chronological_split(featured_df, train_ratio=0.70, val_ratio=0.15)

    assert len(train_df) + len(val_df) + len(test_df) == len(featured_df)
    # Check strict chronological ordering (no time overlap)
    assert train_df.index[-1] < val_df.index[0]
    assert val_df.index[-1] < test_df.index[0]


def test_scaler_fitting_leakage_prevention(sample_market_df):
    featured_df = engineer_features(sample_market_df)
    train_df, val_df, test_df = chronological_split(featured_df)
    feature_cols = ["Open", "High", "Low", "Close", "Volume", "SMA_20", "SMA_50", "RSI_14", "Volatility_20"]

    X_train_scaled, X_val_scaled, X_test_scaled, feat_scaler, target_scaler = scale_datasets(
        train_df, val_df, test_df, feature_cols
    )

    # Train bounds are [0, 1]
    assert np.min(X_train_scaled) >= -1e-6
    assert np.max(X_train_scaled) <= 1.0 + 1e-6


def test_sliding_sequences():
    # 100 timesteps, 5 features
    data = np.random.random((100, 5))
    targets = np.random.random((100, 1))
    lookback = 60
    horizon = 7

    X, y = create_sliding_sequences(data, targets, lookback=lookback, horizon=horizon)
    expected_samples = 100 - lookback - horizon + 1
    assert X.shape == (expected_samples, 60, 5)
    assert y.shape == (expected_samples, 7)


def test_baseline_model_training_and_metrics():
    np.random.seed(42)
    X = np.random.random((50, 60, 5))
    y = np.random.random((50, 7))

    model = BaselineLinearRegressionModel()
    model.fit(X, y)
    preds = model.predict(X)
    assert preds.shape == (50, 7)

    rmse = calculate_rmse(y, preds)
    assert rmse >= 0.0

    last_known = np.random.random(50)
    acc = calculate_directional_accuracy(y, preds, last_known)
    assert 0.0 <= acc <= 100.0


def test_prediction_engine_walk_forward_two_sided():
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from src.services.prediction_engine import PredictionEngine

    engine = PredictionEngine()
    dates = pd.date_range(start="2024-01-01", periods=300, freq="B")
    rng = np.random.default_rng(7)

    # Mean-reverting oscillating series ending on a sharp spike (expects pullback/two-sided)
    t = np.arange(300)
    base = 100.0 + 4.0 * np.sin(t / 6.0) + rng.normal(0, 0.3, size=300)
    base[-3:] = [105.0, 108.0, 111.0]
    df_spike = pd.DataFrame(
        {
            "Open": base - 0.2,
            "High": base + 0.5,
            "Low": base - 0.5,
            "Close": base,
            "Volume": np.full(300, 1_000_000.0),
        },
        index=[d.date() for d in dates],
    )

    res = engine._fit_and_evaluate_walk_forward("TEST_SPIKE", df_spike)
    assert len(res["linear_prices"]) == 7
    assert len(res["neural_prices"]) == 7
    # After an extreme spike in a mean-reverting series, models must be capable of predicting downward pullbacks
    assert min(res["linear_prices"]) < 111.0 or min(res["neural_prices"]) < 111.0
    assert res["benchmarks"].train_samples > 0
    assert res["benchmarks"].test_samples > 0
    for m in res["benchmarks"].models:
        assert m.rmse > 0
        assert 0.0 <= m.directional_accuracy_pct <= 100.0
