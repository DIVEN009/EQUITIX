import os
import sys
import argparse
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import joblib

# Add project root and backend to sys.path so modules can be imported
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ml_pipeline.data_pipeline import fetch_historical_data, engineer_features
from ml_pipeline.train import train_and_evaluate_ticker, SAVED_MODELS_DIR, LOOKBACK, HORIZON
try:
    from src.core.database import SessionLocal
    from src.models.database_models import Stock, Prediction
except ImportError:
    from backend.src.core.database import SessionLocal
    from backend.src.models.database_models import Stock, Prediction

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_batch_inference")


def get_next_trading_days(start_date: date, count: int = 7) -> List[date]:
    """
    Calculate the next `count` consecutive business trading days (Monday - Friday),
    skipping weekends.
    """
    trading_days = []
    curr = start_date + timedelta(days=1)
    while len(trading_days) < count:
        if curr.weekday() < 5:  # Monday through Friday
            trading_days.append(curr)
        curr += timedelta(days=1)
    return trading_days


def run_inference_for_ticker(ticker: str) -> Dict[str, Any]:
    """
    Executes offline inference for a specific ticker:
    1. Loads trained weights (or trains if missing)
    2. Pulls last 200 days of market data
    3. Engineers features and extracts the latest 60-day window
    4. Generates 7-day forward predictions using LSTM and Linear Regression
    5. Syncs predictions into Supabase PostgreSQL predictions table
    """
    ticker_clean = ticker.upper().strip()
    logger.info(f"--- Running batch inference for {ticker_clean} ---")

    scaler_file = os.path.join(SAVED_MODELS_DIR, f"{ticker_clean}_scaler.pkl")
    baseline_file = os.path.join(SAVED_MODELS_DIR, f"{ticker_clean}_baseline.pkl")
    lstm_file = os.path.join(SAVED_MODELS_DIR, f"{ticker_clean}_lstm.keras")

    # If models are not trained yet, train them automatically
    if not (os.path.exists(scaler_file) and os.path.exists(baseline_file) and os.path.exists(lstm_file)):
        logger.info(f"Model artifacts not found for {ticker_clean}. Triggering initial training...")
        train_and_evaluate_ticker(ticker_clean, epochs=10)

    # 1. Load Scalers and Models
    scaler_payload = joblib.load(scaler_file)
    feature_scaler = scaler_payload["feature_scaler"]
    target_scaler = scaler_payload["target_scaler"]
    feature_cols = scaler_payload["features"]

    baseline_model = joblib.load(baseline_file)

    from tensorflow.keras.models import load_model
    lstm_model = load_model(lstm_file)

    # 2. Pull last 200 days of market data
    df_raw = fetch_historical_data(ticker_clean, period="200d")
    df_featured = engineer_features(df_raw)

    if len(df_featured) < LOOKBACK:
        raise ValueError(f"Insufficient data for {ticker_clean}: required at least {LOOKBACK} rows, got {len(df_featured)}")

    # 3. Extract latest 60-day sequence
    latest_window_df = df_featured.iloc[-LOOKBACK:].copy()
    latest_trading_date = latest_window_df.index[-1].date()
    latest_close_price = float(latest_window_df["Close"].iloc[-1])

    # Scale window
    X_latest_scaled = feature_scaler.transform(latest_window_df[feature_cols].values)
    X_input_lstm = X_latest_scaled.reshape(1, LOOKBACK, len(feature_cols))
    X_input_baseline = X_latest_scaled.reshape(1, -1)

    # 4. Generate 7-day Predictions (reconstructed from relative returns anchored to today's Close)
    # Baseline
    y_pred_baseline_returns = baseline_model.predict(X_input_baseline).flatten()
    y_pred_baseline = [latest_close_price * (1.0 + float(r)) for r in y_pred_baseline_returns]

    # LSTM
    y_pred_lstm_returns = lstm_model.predict(X_input_lstm).flatten()
    y_pred_lstm = [latest_close_price * (1.0 + float(r)) for r in y_pred_lstm_returns]

    # 5. Determine target forecast dates
    forecast_dates = get_next_trading_days(latest_trading_date, count=HORIZON)

    # 6. Sync to Supabase PostgreSQL database
    db = SessionLocal()
    try:
        # Ensure Stock record exists in DB
        stock = db.query(Stock).filter(Stock.ticker == ticker_clean).first()
        if not stock:
            stock = Stock(ticker=ticker_clean, company_name=ticker_clean)
            db.add(stock)
            db.commit()

        synced_count = 0
        now_utc = datetime.now(timezone.utc)

        # Sync both models
        for model_name, predictions in [("LinearReg_v1", y_pred_baseline), ("LSTM_v1", y_pred_lstm)]:
            for target_dt, pred_price in zip(forecast_dates, predictions):
                pred_price_clean = round(float(pred_price), 2)
                existing = (
                    db.query(Prediction)
                    .filter(
                        Prediction.ticker == ticker_clean,
                        Prediction.target_date == target_dt,
                        Prediction.model_name == model_name,
                    )
                    .first()
                )
                if existing:
                    existing.predicted_price = pred_price_clean
                    existing.generated_at = now_utc
                else:
                    new_pred = Prediction(
                        ticker=ticker_clean,
                        target_date=target_dt,
                        model_name=model_name,
                        predicted_price=pred_price_clean,
                        generated_at=now_utc,
                    )
                    db.add(new_pred)
                synced_count += 1

        db.commit()
        logger.info(f"Synced {synced_count} predictions to PostgreSQL for {ticker_clean}")

    except Exception as db_err:
        db.rollback()
        logger.error(f"Error saving predictions to DB for {ticker_clean}: {db_err}")
        raise db_err
    finally:
        db.close()

    result = {
        "ticker": ticker_clean,
        "latest_trading_date": str(latest_trading_date),
        "latest_close_price": latest_close_price,
        "forecast_dates": [str(d) for d in forecast_dates],
        "predictions": {
            "LinearReg_v1": [round(float(p), 2) for p in y_pred_baseline],
            "LSTM_v1": [round(float(p), 2) for p in y_pred_lstm],
        },
    }
    return result


def main():
    parser = argparse.ArgumentParser(description="Equitix Daily ML Batch Inference")
    parser.add_argument(
        "--tickers",
        nargs="+",
        default=["AAPL", "MSFT", "NVDA"],
        help="List of tickers to generate 7-day predictions for",
    )
    args = parser.parse_args()

    logger.info("==================================================")
    logger.info("   Starting Equitix ML Offline Batch Inference    ")
    logger.info(f"   Target Tickers: {args.tickers}                 ")
    logger.info("==================================================")

    results = {}
    for ticker in args.tickers:
        try:
            res = run_inference_for_ticker(ticker)
            results[ticker] = res
            logger.info(
                f"Completed {ticker}: Latest Close = ${res['latest_close_price']:.2f} | "
                f"Day 7 LSTM = ${res['predictions']['LSTM_v1'][-1]:.2f} | "
                f"Day 7 Baseline = ${res['predictions']['LinearReg_v1'][-1]:.2f}"
            )
        except Exception as exc:
            logger.error(f"Inference failed for {ticker}: {exc}", exc_info=True)

    logger.info(f"Batch inference complete for {len(results)}/{len(args.tickers)} tickers.")


if __name__ == "__main__":
    main()
