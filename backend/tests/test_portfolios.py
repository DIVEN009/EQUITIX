import uuid
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


@pytest.fixture
def auth_header():
    # Register and login a unique user for portfolio tests
    unique_id = uuid.uuid4().hex[:8]
    email = f"trader_{unique_id}@equitix.internal"
    password = "TraderPassword123!"

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_portfolio_lifecycle_and_pnl(auth_header):
    # 1. Create a portfolio with $50,000 cash
    create_resp = client.post(
        "/api/v1/portfolios",
        headers=auth_header,
        json={"name": "Tech Growth Fund", "initial_cash": 50000.0},
    )
    assert create_resp.status_code == 201
    p_data = create_resp.json()
    p_id = p_data["id"]
    assert p_data["name"] == "Tech Growth Fund"
    assert p_data["cash_balance"] == 50000.0
    assert p_data["total_value"] == 50000.0
    assert p_data["holdings_value"] == 0.0

    # 2. List user portfolios
    list_resp = client.get("/api/v1/portfolios", headers=auth_header)
    assert list_resp.status_code == 200
    portfolios = list_resp.json()
    assert any(p["id"] == p_id for p in portfolios)

    # 3. Buy 10 shares of AAPL at $150.00 (Total cost: $1,500)
    buy_resp = client.post(
        f"/api/v1/portfolios/{p_id}/transactions",
        headers=auth_header,
        json={"ticker": "AAPL", "action": "BUY", "shares": 10.0, "price": 150.0},
    )
    assert buy_resp.status_code == 200
    buy_data = buy_resp.json()
    assert buy_data["cash_balance"] == 48500.0
    assert len(buy_data["holdings"]) == 1
    h = buy_data["holdings"][0]
    assert h["ticker"] == "AAPL"
    assert h["shares"] == 10.0
    assert h["average_price"] == 150.0
    assert h["invested_value"] == 1500.0

    # 4. Buy 10 more shares of AAPL at $200.00 (Weighted average: (1500 + 2000)/20 = 175.0)
    buy2_resp = client.post(
        f"/api/v1/portfolios/{p_id}/transactions",
        headers=auth_header,
        json={"ticker": "AAPL", "action": "BUY", "shares": 10.0, "price": 200.0},
    )
    assert buy2_resp.status_code == 200
    buy2_data = buy2_resp.json()
    assert buy2_data["cash_balance"] == 46500.0
    assert len(buy2_data["holdings"]) == 1
    h2 = buy2_data["holdings"][0]
    assert h2["shares"] == 20.0
    assert h2["average_price"] == 175.0
    assert h2["invested_value"] == 3500.0

    # 5. Reject BUY with insufficient funds
    poor_buy = client.post(
        f"/api/v1/portfolios/{p_id}/transactions",
        headers=auth_header,
        json={"ticker": "MSFT", "action": "BUY", "shares": 1000.0, "price": 500.0},
    )
    assert poor_buy.status_code == 400
    assert "Insufficient cash" in poor_buy.json()["detail"]

    # 6. Reject SELL when selling more shares than owned
    excess_sell = client.post(
        f"/api/v1/portfolios/{p_id}/transactions",
        headers=auth_header,
        json={"ticker": "AAPL", "action": "SELL", "shares": 50.0, "price": 220.0},
    )
    assert excess_sell.status_code == 400
    assert "Insufficient shares" in excess_sell.json()["detail"]

    # 7. Partial SELL: Sell 5 shares of AAPL at $220.00 (Proceeds: $1,100)
    sell_resp = client.post(
        f"/api/v1/portfolios/{p_id}/transactions",
        headers=auth_header,
        json={"ticker": "AAPL", "action": "SELL", "shares": 5.0, "price": 220.0},
    )
    assert sell_resp.status_code == 200
    sell_data = sell_resp.json()
    assert sell_data["cash_balance"] == 47600.0
    assert len(sell_data["holdings"]) == 1
    h_sold = sell_data["holdings"][0]
    assert h_sold["shares"] == 15.0
    assert h_sold["average_price"] == 175.0

    # 8. Full SELL: Sell remaining 15 shares of AAPL at $220.00 (Proceeds: $3,300)
    sell_all = client.post(
        f"/api/v1/portfolios/{p_id}/transactions",
        headers=auth_header,
        json={"ticker": "AAPL", "action": "SELL", "shares": 15.0, "price": 220.0},
    )
    assert sell_all.status_code == 200
    sell_all_data = sell_all.json()
    assert sell_all_data["cash_balance"] == 50900.0
    assert len(sell_all_data["holdings"]) == 0

    # 9. Delete portfolio
    del_resp = client.delete(f"/api/v1/portfolios/{p_id}", headers=auth_header)
    assert del_resp.status_code == 200

    # Verify deleted
    get_del = client.get(f"/api/v1/portfolios/{p_id}", headers=auth_header)
    assert get_del.status_code == 404


def test_unauthorized_portfolio_access():
    resp = client.get("/api/v1/portfolios")
    assert resp.status_code == 401
