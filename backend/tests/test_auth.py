import uuid
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Equitix" in data["project"]


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_auth_workflow():
    # Use a unique email per test run
    random_str = uuid.uuid4().hex[:8]
    test_email = f"quant_{random_str}@equitix.internal"
    test_password = "SuperSecurePassword123!"

    # 1. Register new user
    reg_response = client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": test_password},
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert reg_data["token_type"] == "bearer"
    assert reg_data["user"]["email"] == test_email
    assert "id" in reg_data["user"]
    token = reg_data["access_token"]

    # 2. Prevent duplicate registration
    dup_response = client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": test_password},
    )
    assert dup_response.status_code == 400
    assert "already exists" in dup_response.json()["detail"]

    # 3. Successful JSON login
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": test_password},
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == test_email

    # 4. Failed login with invalid password
    bad_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": "WrongPassword!"},
    )
    assert bad_login_response.status_code == 401

    # 5. Successful OAuth2 form login (Swagger UI compatibility)
    form_response = client.post(
        "/api/v1/auth/token",
        data={"username": test_email, "password": test_password},
    )
    assert form_response.status_code == 200
    assert "access_token" in form_response.json()

    # 6. Access protected route /me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == test_email
    assert "created_at" in me_data

    # 7. Access protected route /me without token or invalid token
    unauth_response = client.get("/api/v1/auth/me")
    assert unauth_response.status_code == 401

    invalid_token_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert invalid_token_response.status_code == 401
