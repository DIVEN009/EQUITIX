# EQUITIX — Institutional Quantitative Financial Analytics & Time-Series Stock Prediction Platform

[![CI/CD Status](https://img.shields.io/badge/CI%2FCD-Passing-00F59B?style=for-the-badge&logo=githubactions&logoColor=black)](.github/workflows/ml_batch_job.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-00F59B?style=for-the-badge&logo=fastapi&logoColor=black)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-0EA5E9?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![TensorFlow](https://img.shields.io/badge/TensorFlow%20%2F%20Keras%203-Deep%20LSTM-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://keras.io)
[![React](https://img.shields.io/badge/React%2019-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Custom%20Tokens-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)

**Equitix** is an institutional-grade quantitative financial analytics and machine learning stock forecasting platform designed to simulate an internal quantitative analyst portal. It combines high-throughput asynchronous market streaming with offline walk-forward deep recurrent models, paper portfolio simulation, and an obsidian dark-glass trading interface.

---

## 🏛️ System Architecture

```
                                    EQUITIX ARCHITECTURE
                                    
  [ React 19 + Vite + Tailwind ] <-------------------------+
        |            |                                      |
        |            | Recharts Historical Candlesticks     | Recharts 7-Day Multi-Curve
        v            v & Real-Time Quotes                   | Neural Forecasts
  [ Auth & Portfolios ]   [ Market Explorer ]         [ Model Evaluation ]
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                   HTTPS REST /api/v1 (JWT Bearer Auth)
                                  v
                   +-----------------------------+
                   |     FastAPI Service API     |
                   |   (Router -> Service Layer) |
                   +--------------+--------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
  +--------------------+                     +--------------------+
  |  Stock Market Data |                     |  Portfolio Engine  |
  |  & Fallback Cache  |                     |  & Trade Execution |
  +---------+----------+                     +----------+---------+
            |                                           |
   1.5s TO  | Async Refresh                             |
            v                                           v
     +--------------+                        +--------------------+
     | yfinance API |                        |  SQLAlchemy Models |
     +--------------+                        +----------+---------+
                                                        |
                                                        v
                                             +--------------------+
                                             |    PostgreSQL      |
                                             |  (Supabase Cloud)  |
                                             +----------+---------+
                                                        ^
                                                        | Daily Forecast Sync
                                             +----------+---------+
                                             |  Offline Batch ML  |
                                             | (batch_inference)  |
                                             +----------+---------+
                                                        ^
                                                        | Daily Cron at 00:00 UTC
                                             +----------+---------+
                                             |   GitHub Actions   |
                                             +--------------------+
```

---

## ⚡ Core Capabilities

### 1. Multi-Output Deep Learning Engine
- **Lookback Window**: 60 consecutive trading sessions generating multi-variate sliding input vectors.
- **Multi-Output Horizon**: Direct 7-business-day simultaneous price projection (skipping non-trading weekends).
- **Models Benchmarked**:
  - **Deep LSTM (TensorFlow / Keras 3)**: Recurrent gated network with dropout regularization capturing non-linear volatility regimes.
  - **Baseline Ridge Regression (Scikit-Learn)**: L2-penalized linear model establishing the benchmark floor.
- **Strict Leakage Prevention**: Chronological walk-forward split (70% Train, 15% Validation, 15% Test) with `MinMaxScaler` fitted **strictly on the training partition only**.

### 2. Resilient Market Data Streaming & Caching
- **FastAPI Asynchronous Gateway**: Direct integration with Yahoo Finance with a strict **1.5-second timeout**.
- **PostgreSQL Fallback Caching**: Queries exceeding 1.5s automatically fall back to cached database price bars in **< 15ms**, while queuing an asynchronous background refresh via FastAPI `BackgroundTasks`.

### 3. Quantitative Portfolio Engine & Trade Simulation
- **Full Order Lifecycle**: Real-time `BUY` and `SELL` transactions with cash balance validations and short-selling guards.
- **Dynamic Cost Accounting**: Calculates weighted-average purchase cost across multiple order tranches.
- **Real-Time P&L Analytics**: Real-time unrealized dollar profit/loss ($) and percentage return (%) updated against live quotes.

### 4. Institutional Dark-Glass Visual Frontend
- Built on **React 19**, **Vite**, **Tailwind CSS**, and **Zustand**.
- **Obsidian Aesthetic**: Background `#0A0E17`, Neon Emerald glow `#00F59B`, Electric Cyan `#0EA5E9`, and subtle glassmorphic panels (`rgba(22, 29, 43, 0.7)`).
- **Interactive Recharts Visualization**:
  - **Stock Detail View**: Seamless switcher between **Area Neon Glow**, **Precision Line**, and **OHLC Candlesticks** with custom glass tooltips and volume sub-bars.
  - **Model Evaluation View**: Multi-curve plot connecting recent historical prices directly to the 7-day forecast curves of both LSTM and Baseline Ridge models with out-of-sample RMSE/Accuracy benchmarks.

### 5. Automated Cloud Batch Inference
- Decoupled offline inference engine ([batch_inference.py](file:///d:/Equitix/EQUITIX/ml_pipeline/batch_inference.py)).
- Scheduled daily at **00:00 UTC** via GitHub Actions ([ml_batch_job.yml](file:///d:/Equitix/EQUITIX/.github/workflows/ml_batch_job.yml)) to refresh future price forecast tables without blocking user-facing API threads.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Python `3.11+`
- Node.js `20+` & npm
- PostgreSQL database (or free [Supabase](https://supabase.com) account)

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/DIVEN009/EQUITIX.git
cd EQUITIX

# Copy environment template
cp .env.example .env
```

### 2. Launch with Docker Compose (Recommended)
```bash
docker-compose up -d --build
```
- **Web Portal**: [http://localhost](http://localhost)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Manual Local Development Setup

#### Backend Setup:
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Run development server
uvicorn src.main:app --reload --port 8000
```

#### Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173).

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | API & database connectivity health probe | No |
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT bearer token | No |
| `GET` | `/api/v1/auth/me` | Retrieve current authenticated user profile | **Yes** (Bearer) |
| `GET` | `/api/v1/stocks/search?q={query}` | Autocomplete search across tracked equities | No |
| `GET` | `/api/v1/stocks/{ticker}` | Real-time quote streaming with 1.5s cache fallback | No |
| `GET` | `/api/v1/stocks/{ticker}/history?days={n}` | Historical OHLCV candlestick time-series bars | No |
| `GET` | `/api/v1/stocks/{ticker}/predictions` | 7-day walk-forward machine learning forecasts | No |
| `GET` | `/api/v1/stocks/{ticker}/benchmarks` | Out-of-sample validation metrics (RMSE, Accuracy) | No |
| `GET` | `/api/v1/portfolios` | List all portfolios owned by the active user | **Yes** (Bearer) |
| `POST` | `/api/v1/portfolios` | Create a new portfolio with virtual cash balance | **Yes** (Bearer) |
| `GET` | `/api/v1/portfolios/{id}` | Detailed portfolio summary, holdings, and P&L | **Yes** (Bearer) |
| `POST` | `/api/v1/portfolios/{id}/transactions`| Execute simulated `BUY` or `SELL` trade | **Yes** (Bearer) |
| `DELETE`| `/api/v1/portfolios/{id}` | Delete portfolio and all associated holdings | **Yes** (Bearer) |

---

## 🧪 Test Suite & Quality Verification

Equitix includes complete end-to-end integration tests, ML pipeline mathematical checks, and automated frontend linting.

```bash
# Run backend test suite (17 passed tests)
cd backend
.\venv\Scripts\pytest -v

# Run frontend production build & linter (0 errors, 0 warnings)
cd frontend
npm run lint
npm run build
```

---

## 📚 Documentation & Blueprints

- 📖 [Deployment Guide](docs/DEPLOYMENT_GUIDE.md): 1-command Docker Compose, Render, Vercel, Supabase, and GitHub Actions cron runbook.
- 📐 [Architecture Deep Dive](docs/ARCHITECTURE.md): Layered architecture, data pipelines, and quantitative model topologies.
- 📬 [Postman API Collection](backend/Equitix_API.postman_collection.json): Ready-to-import API test collection with JWT pre-request scripts.
- 📋 [OpenAPI JSON Specification](backend/openapi.json): Standardized OpenAPI 3.1 schema.

---

## 🛡️ License & Institutional Notice

Equitix is licensed under the [MIT License](LICENSE). Built for educational and institutional research purposes.
