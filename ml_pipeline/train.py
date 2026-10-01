import os
import sys
import json
import logging
import argparse
from typing import List, Dict, Any
import numpy as np
import joblib

# Ensure parent directory is in sys.path so ml_pipeline is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml_pipeline.data_pipeline import (
    fetch_historical_data,
    engineer_features,
    chronological_split,
    scale_datasets,
    create_sliding_sequences,
)
from ml_pipeline.models import (
    BaselineLinearRegressionModel,
    build_lstm_model,
    calculate_rmse,
    calculate_directional_accuracy,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
FEATURE_COLUMNS = ["Open", "High", "Low", "Close", "Volume", "SMA_20", "SMA_50", "RSI_14", "Volatility_20"]
LOOKBACK = 60
HORIZON = 7


def train_and_evaluate_ticker(
    ticker: str,
    period: str = "5y",
    epochs: int = 15,
    batch_size: int = 32,
) -> Dict[str, Any]:
    """
    Executes the complete end-to-end ML training pipeline for a given ticker:
    1. Ingestion: Fetch 5 years of historical data from yfinance
    2. Feature Engineering: Compute SMA_20, SMA_50, RSI_14, Volatility_20
    3. Chronological Split: 70% Train, 15% Val, 15% Test (No data leakage)
    4. Fit Scalers strictly on training data
    5. Generate 60-day sliding sequences for 7-day multi-step forecasts
    6. Train Baseline (Linear Regression) & Save
    7. Train Primary (TensorFlow LSTM) & Save
    8. Evaluate RMSE and Directional Accuracy % on untouched test set
    """
    ticker_clean = ticker.upper().strip()
    logger.info(f"=== Starting Training Pipeline for {ticker_clean} ===")
    os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

    # 1. Fetch & Engineer
    raw_df = fetch_historical_data(ticker_clean, period=period)
    df = engineer_features(raw_df)

    # 2. Chronological Split
    train_df, val_df, test_df = chronological_split(df, train_ratio=0.70, val_ratio=0.15)

    # 3. Fit Scalers ON TRAIN ONLY
    X_train_scaled, X_val_scaled, X_test_scaled, feat_scaler, target_scaler = scale_datasets(
        train_df, val_df, test_df, feature_cols=FEATURE_COLUMNS
    )

    # Save scalers for inference
    scaler_path = os.path.join(SAVED_MODELS_DIR, f"{ticker_clean}_scaler.pkl")
    joblib.dump({"feature_scaler": feat_scaler, "target_scaler": target_scaler, "features": FEATURE_COLUMNS}, scaler_path)
    logger.info(f"Saved feature and target scalers to {scaler_path}")

    # 4. Create 60-day sequences -> 7-day targets
    # Extract target Close prices for training sequences
    train_targets_scaled = target_scaler.transform(train_df[["Close"]].values)
    val_targets_scaled = target_scaler.transform(val_df[["Close"]].values)
    test_targets_scaled = target_scaler.transform(test_df[["Close"]].values)

    X_train, y_train = create_sliding_sequences(X_train_scaled, train_targets_scaled, lookback=LOOKBACK, horizon=HORIZON)
    X_val, y_val = create_sliding_sequences(X_val_scaled, val_targets_scaled, lookback=LOOKBACK, horizon=HORIZON)
    X_test, y_test = create_sliding_sequences(X_test_scaled, test_targets_scaled, lookback=LOOKBACK, horizon=HORIZON)

    logger.info(f"Sequences generated -> X_train: {X_train.shape}, y_train: {y_train.shape} | X_test: {X_test.shape}")

    # Reference prices for Directional Accuracy (last known close of lookback window)
    test_last_known_scaled = X_test[:, -1, FEATURE_COLUMNS.index("Close")].reshape(-1, 1)
    test_last_known_price = target_scaler.inverse_transform(test_last_known_scaled)
    y_test_actual_price = target_scaler.inverse_transform(y_test)

    # 5. Train Baseline Linear Regression
    logger.info(f"Training Baseline Linear Regression for {ticker_clean}...")
    baseline_model = BaselineLinearRegressionModel()
    baseline_model.fit(X_train, y_train)

    baseline_path = os.path.join(SAVED_MODELS_DIR, f"{ticker_clean}_baseline.pkl")
    baseline_model.save(baseline_path)

    # Evaluate Baseline
    y_pred_baseline_scaled = baseline_model.predict(X_test)
    y_pred_baseline_price = target_scaler.inverse_transform(y_pred_baseline_scaled)

    baseline_rmse = round(calculate_rmse(y_test_actual_price, y_pred_baseline_price), 2)
    baseline_dir_acc = calculate_directional_accuracy(y_test_actual_price, y_pred_baseline_price, test_last_known_price)

    # 6. Train TensorFlow / Keras LSTM
    logger.info(f"Training Primary LSTM Model for {ticker_clean} ({epochs} epochs)...")
    lstm_model = build_lstm_model(lookback=LOOKBACK, num_features=len(FEATURE_COLUMNS), horizon=HORIZON)

    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    lstm_keras_path = os.path.join(SAVED_MODELS_DIR, f"{ticker_clean}_lstm.keras")

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True, verbose=1),
        ModelCheckpoint(lstm_keras_path, monitor="val_loss", save_best_only=True, verbose=0),
    ]

    lstm_model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1,
    )

    # Evaluate LSTM
    y_pred_lstm_scaled = lstm_model.predict(X_test)
    y_pred_lstm_price = target_scaler.inverse_transform(y_pred_lstm_scaled)

    lstm_rmse = round(calculate_rmse(y_test_actual_price, y_pred_lstm_price), 2)
    lstm_dir_acc = calculate_directional_accuracy(y_test_actual_price, y_pred_lstm_price, test_last_known_price)

    report = {
        "ticker": ticker_clean,
        "sample_counts": {
            "train": len(X_train),
            "val": len(X_val),
            "test": len(X_test),
        },
        "models": {
            "baseline_linear_regression": {
                "rmse": baseline_rmse,
                "directional_accuracy_pct": baseline_dir_acc,
                "weights_file": os.path.basename(baseline_path),
            },
            "tensorflow_lstm": {
                "rmse": lstm_rmse,
                "directional_accuracy_pct": lstm_dir_acc,
                "weights_file": os.path.basename(lstm_keras_path),
            },
        },
    }

    logger.info(
        f"\n=========================================\n"
        f"  BENCHMARK RESULTS: {ticker_clean}\n"
        f"  LSTM:     RMSE = ${lstm_rmse:.2f} | Dir. Accuracy = {lstm_dir_acc}%\n"
        f"  Baseline: RMSE = ${baseline_rmse:.2f} | Dir. Accuracy = {baseline_dir_acc}%\n"
        f"========================================="
    )
    return report


def main():
    parser = argparse.ArgumentParser(description="Equitix ML Training Pipeline")
    parser.add_argument(
        "--tickers",
        nargs="+",
        default=["AAPL", "MSFT", "NVDA"],
        help="List of tickers to train models for",
    )
    parser.add_argument("--epochs", type=int, default=10, help="Epochs for LSTM training")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    args = parser.parse_args()

    benchmarks_summary = {}
    for ticker in args.tickers:
        report = train_and_evaluate_ticker(
            ticker=ticker,
            period="5y",
            epochs=args.epochs,
            batch_size=args.batch_size,
        )
        benchmarks_summary[ticker] = report

    # Save benchmarks summary for API and UI rendering
    benchmarks_file = os.path.join(SAVED_MODELS_DIR, "benchmarks.json")
    with open(benchmarks_file, "w") as f:
        json.dump(benchmarks_summary, f, indent=2)
    logger.info(f"Saved complete benchmarks report to {benchmarks_file}")


if __name__ == "__main__":
    main()
