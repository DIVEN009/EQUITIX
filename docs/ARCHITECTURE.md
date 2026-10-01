# Equitix Technical Architecture & System Design Deep Dive

This document details the architectural decisions, design patterns, mathematical data pipelines, and operational paradigms underlying the **Equitix Financial Analytics Platform**.

---

## 1. High-Level Design Principles

1. **Separation of Concerns (Layered Pattern)**:
   - `Routers (API)`: Input parsing, validation via Pydantic schemas, dependency injection.
   - `Services (Business Logic)`: Domain rules, timeout coordination, financial math, algorithmic P&L.
   - `Repositories (Data Access)`: Pure SQLAlchemy queries, database persistence, transaction commits.
   - `Models (Schema Mapping)`: Declarative database entities with foreign-key constraints and indexes.

2. **Asynchronous Non-Blocking Execution**:
   - Timeouts on third-party market data APIs (Yahoo Finance) enforced at **1.5 seconds**.
   - Immediate cache fallback to PostgreSQL ensuring API response latencies remain **< 20ms**.
   - Background asynchronous refresh using FastAPI `BackgroundTasks` without blocking the HTTP request thread.

3. **Decoupled Machine Learning Inference**:
   - Heavy neural training and multi-step inference run **offline** via scheduled cron jobs, never on the synchronous user-facing request path.
   - Predictions are committed to the database and indexed by `(ticker, target_date, model_name)` for millisecond query retrieval.

---

## 2. Database Schema Design (PostgreSQL / Supabase)

```
  +------------------+         +------------------+         +------------------+
  |      users       | 1     * |    portfolios    | 1     * |     holdings     |
  +------------------+---------+------------------+---------+------------------+
  | id (UUID, PK)    |         | id (UUID, PK)    |         | id (UUID, PK)    |
  | email (VARCHAR)  |         | user_id (FK)     |         | portfolio_id(FK) |
  | hashed_pw (TEXT) |         | name (VARCHAR)   |         | ticker (FK)      |
  | created_at       |         | cash_balance     |         | shares (NUMERIC) |
  +------------------+         | created_at       |         | avg_cost (NUM)   |
                               +------------------+         +------------------+
                                                                     |
                                                                     |
  +------------------+ 1     * +------------------+                  |
  |      stocks      |---------|   daily_prices   |                  |
  +------------------+         +------------------+                  |
  | ticker (PK, 10)  |         | id (UUID, PK)    |                  |
  | company_name     |         | ticker (FK, IDX) |------------------+
  | sector           |         | date (DATE, IDX) |
  | created_at       |         | open, high, low  |
  +--------+---------+         | close, volume    |
           |                   +------------------+
           |
           | 1     * +------------------+
           +---------|   predictions    |
                     +------------------+
                     | id (UUID, PK)    |
                     | ticker (FK, IDX) |
                     | target_date(IDX) |
                     | model_name (IDX) |
                     | predicted_price  |
                     | generated_at     |
                     +------------------+
```

### Key Performance Indexes:
- `ix_daily_prices_ticker_date`: Composite unique index for range-based time-series OHLCV lookups.
- `ix_predictions_ticker_model_target`: Multi-column index for fast 7-day forecast rendering.
- `ix_holdings_portfolio_ticker`: Fast O(1) balance lookup during buy/sell order validation.

---

## 3. Quantitative Machine Learning Pipeline

```
  Yahoo Finance 5Y OHLCV
            |
            v
  [ Feature Engineering ]
    * SMA 20 & SMA 50
    * RSI 14 (Relative Strength Index)
    * Volatility 20 (Rolling standard deviation of log returns)
    * Normalized Volume
            |
            v
  [ Chronological Walk-Forward Split ]
    * 70% Train (~777 trading sessions)
    * 15% Validation (~115 trading sessions)
    * 15% Test (~115 trading sessions)
    * ZERO future data leakage: Scaler fitted exclusively on Train
            |
            v
  [ 60-Step Sliding Sequence Generator ]
    * Input Shape: (batch_size, 60, 9)
    * Target Shape: (batch_size, 7) Multi-Output Horizon
            |
            +---------------------------+
            |                           |
            v                           v
  [ TensorFlow Deep LSTM ]    [ Baseline Ridge Regression ]
    * Input(shape=(60, 9))      * Flattened (60 x 9 = 540)
    * LSTM(64, return_seq=True) * L2-regularized OLS (alpha=1.0)
    * Dropout(0.2)              * Multi-output target projection
    * LSTM(32)
    * Dense(16, relu)
    * Dense(7, linear)
            |                           |
            +-------------+-------------+
                          |
                          v
               [ Evaluation Metrics ]
                 * Root Mean Squared Error (RMSE)
                 * Mean Absolute Error (MAE)
                 * Directional Accuracy % (Hit Ratio)
```

### Mathematical Formulations:

1. **Directional Accuracy (Classification Sign Hit Ratio)**:
   $$\text{DA} = \frac{1}{N} \sum_{i=1}^{N} \mathbb{I}\left( \text{sign}(y_{i} - y_{i-1}) = \text{sign}(\hat{y}_{i} - y_{i-1}) \right) \times 100\%$$

2. **Weighted Average Cost Accounting (Multi-Tranche Execution)**:
   $$\bar{C}_{\text{new}} = \frac{(S_{\text{existing}} \times \bar{C}_{\text{existing}}) + (S_{\text{new}} \times P_{\text{executed}})}{S_{\text{existing}} + S_{\text{new}}}$$

3. **Real-Time Unrealized Profit & Loss**:
   $$\text{PnL}_{\$} = (\text{Price}_{\text{current}} - \bar{C}) \times S$$
   $$\text{PnL}_{\%} = \left( \frac{\text{Price}_{\text{current}} - \bar{C}}{\bar{C}} \right) \times 100\%$$

---

## 4. Frontend Architecture & State Management

- **Modular UI Layers**:
  - `Header`: User profile badge, active session indicator, and logout.
  - `Navigation`: Mobile/desktop bottom tray with animated pill triggers (`Portfolio`, `Market`, `ML Models`).
  - `ToastContainer`: Floating notifications triggered across any page via Zustand (`toast.success`, `toast.error`).
  - `ErrorBoundary`: System boundary ensuring zero unhandled crashes.
- **Server Cache & Query Invalidation**:
  - TanStack React Query maintains an in-memory client cache (`staleTime: 5 mins`).
  - On trade execution, queries `['portfolioDetail']` and `['portfolios']` are immediately invalidated to force an instant reactive balance update.

---

## 5. Security & Authentication Flow

1. User registers or logs in via `/api/v1/auth/login`.
2. Password checked against stored hash using direct `bcrypt.checkpw(plain_bytes, hash_bytes)`.
3. Server signs and issues a cryptographically secure JWT Bearer Token (`HS256`, 7-day expiration).
4. Frontend stores token in `localStorage` and automatically injects `Authorization: Bearer <token>` into all outgoing Axios requests via request interceptors.
5. If a `401 Unauthorized` response is detected, interceptors automatically purge local credentials and dispatch an `equitix_auth_expired` event returning the user to the login screen.
