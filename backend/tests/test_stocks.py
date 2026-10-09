import time
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from src.main import app
from src.core.database import SessionLocal
from src.models.database_models import Stock, DailyPrice, Prediction
from datetime import date, timedelta

client = TestClient(app)


def test_get_stock_quote_live_and_db_fallback():
    # 1. Fetch quote for a valid ticker (e.g., AAPL)
    response = client.get("/api/v1/stocks/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert data["current_price"] is not None
    assert data["source"] in ["live", "db_fallback"]
    assert "Apple" in data["company_name"]

    # 2. Verify that the stock and price were stored in the database
    db = SessionLocal()
    try:
        db_stock = db.query(Stock).filter(Stock.ticker == "AAPL").first()
        assert db_stock is not None
        assert "Apple" in db_stock.company_name

        db_prices = db.query(DailyPrice).filter(DailyPrice.ticker == "AAPL").all()
        assert len(db_prices) > 0
    finally:
        db.close()

    # 3. Simulate yfinance timeout (>1.5s) to test DB fallback behavior
    with patch("src.services.stock_service.StockService.fetch_with_timeout", return_value=None):
        fallback_resp = client.get("/api/v1/stocks/AAPL")
        assert fallback_resp.status_code == 200
        fallback_data = fallback_resp.json()
        assert fallback_data["ticker"] == "AAPL"
        assert fallback_data["source"] == "db_fallback"
        assert fallback_data["current_price"] is not None


def test_get_stock_history():
    response = client.get("/api/v1/stocks/AAPL/history?days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert data["count"] > 0
    assert len(data["data"]) > 0

    candle = data["data"][0]
    assert "date" in candle
    assert "open" in candle
    assert "high" in candle
    assert "low" in candle
    assert "close" in candle
    assert "volume" in candle

    # Test DB fallback on timeout for history
    with patch("src.services.stock_service.StockService.fetch_with_timeout", return_value=None):
        fb_resp = client.get("/api/v1/stocks/AAPL/history?days=30")
        assert fb_resp.status_code == 200
        fb_data = fb_resp.json()
        assert fb_data["ticker"] == "AAPL"
        assert fb_data["count"] > 0


def test_stock_search():
    # Make sure AAPL is in the DB
    client.get("/api/v1/stocks/AAPL")
    
    response = client.get("/api/v1/stocks/search?q=AAP")
    assert response.status_code == 200
    results = response.json()
    assert any(s["ticker"] == "AAPL" for s in results)


def test_security_master_resolve():
    # Test resolving company name to NSE ticker
    resp = client.get("/api/v1/stocks/resolve?q=RattanIndia Power")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticker"] == "RTNPOWER.NS"
    assert "RattanIndia" in data["company_name"]

    # Test resolving symbol directly
    resp = client.get("/api/v1/stocks/resolve?q=RTNPOWER")
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "RTNPOWER.NS"

    # Test resolving company name variations and typos
    resp = client.get("/api/v1/stocks/resolve?q=ALOK INDUSTRY")
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "ALOKINDS.NS"

    resp = client.get("/api/v1/stocks/resolve?q=ALOKEINDS.NS")
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "ALOKINDS.NS"


def test_stock_predictions():
    # Insert a dummy prediction to verify endpoint
    db = SessionLocal()
    test_date = date.today() + timedelta(days=1)
    pred_id = None
    try:
        # Ensure stock exists first
        stock = db.query(Stock).filter(Stock.ticker == "AAPL").first()
        if not stock:
            stock = Stock(ticker="AAPL", company_name="Apple Inc.")
            db.add(stock)
            db.commit()

        # Add prediction
        pred = Prediction(
            ticker="AAPL",
            target_date=test_date,
            model_name="LSTM_v1",
            predicted_price=250.00,
        )
        db.add(pred)
        db.commit()
        pred_id = pred.id

        response = client.get("/api/v1/stocks/AAPL/predictions")
        assert response.status_code == 200
        data = response.json()
        assert data["ticker"] == "AAPL"
        assert len(data["predictions"]) > 0
        assert any(p["model_name"] in ["LSTM_v1", "LinearReg_v1"] for p in data["predictions"])
        assert any(p["predicted_price"] > 0 for p in data["predictions"])
    finally:
        if pred_id:
            db.query(Prediction).filter(Prediction.id == pred_id).delete()
            db.commit()
        db.close()


def test_nonexistent_stock():
    response = client.get("/api/v1/stocks/INVALIDTICKERXYZ999999")
    assert response.status_code == 404


def test_stock_benchmarks():
    response = client.get("/api/v1/stocks/AAPL/benchmarks")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert data["train_samples"] > 0
    assert len(data["models"]) >= 2
    model_names = [m["model_name"] for m in data["models"]]
    assert "tensorflow_lstm" in model_names
    assert "baseline_linear_regression" in model_names
    for m in data["models"]:
        assert m["rmse"] > 0
        assert m["directional_accuracy_pct"] > 0


def test_dynamic_predictions_for_any_stock():
    response = client.get("/api/v1/stocks/ALOKINDS.NS/predictions")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "ALOKINDS.NS"
    assert len(data["predictions"]) >= 14
    models = {p["model_name"] for p in data["predictions"]}
    assert "LSTM_v1" in models
    assert "LinearReg_v1" in models


def test_calibrated_benchmarks_scaling():
    response = client.get("/api/v1/stocks/ALOKINDS.NS/benchmarks")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "ALOKINDS.NS"
    for m in data["models"]:
        assert m["rmse"] < 5.0
        assert m["directional_accuracy_pct"] >= 50.0
        assert "ALOKINDS" in m["weights_file"]


