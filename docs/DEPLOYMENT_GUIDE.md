# Equitix Institutional Cloud & Container Deployment Guide

This guide details how to build, containerize, and deploy the **Equitix Financial Analytics & Deep Learning Platform** across production cloud environments.

---

## Architecture Overview

```
                      +-----------------------------+
                      |       Clients / Web         |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      Vercel / Nginx CDN     |
                      |   (Equitix React Frontend)  |
                      +--------------+--------------+
                                     |
                       HTTPS REST /api/v1 (JWT Auth)
                                     v
                      +-----------------------------+
                      |   Render / Docker Backend   |
                      |   FastAPI + Uvicorn Workers |
                      +-------+--------------+------+
                              |              |
      yfinance Cached Fallback|              | SQL Alchemy ORM
                              v              v
                  +---------------+     +-----------------------+
                  | Yahoo Finance |     |  Supabase PostgreSQL  |
                  | Public Stream |     |  (Portfolios, Prices, |
                  +---------------+     |   Predictions, Users) |
                                        +-----------+-----------+
                                                    ^
                                                    | Daily 00:00 UTC
                                        +-----------+-----------+
                                        |  GitHub Actions Cron  |
                                        | (batch_inference.py)  |
                                        +-----------------------+
```

---

## Option 1: Local Docker Compose Deployment (Recommended for Local Prod Testing)

### 1. Prerequisites
- Docker Engine `>= 24.0`
- Docker Compose `>= 2.20`

### 2. Configure Environment
Copy `.env.example` to root `.env` or set your Supabase connection string:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set:
```ini
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SECRET_KEY=super_secure_institutional_secret_jwt_key
```

### 3. Build & Run Containers
```bash
# Build images and start containers in the background
docker-compose up -d --build

# Inspect running services
docker-compose ps

# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend
```

### 4. Access Services
- **Web Application**: [http://localhost](http://localhost) (or [http://localhost:3000](http://localhost:3000))
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **FastAPI Healthcheck**: [http://localhost:8000/health](http://localhost:8000/health)

---

## Option 2: Production Cloud Deployment (Vercel + Render + Supabase)

### Step 1: Database (Supabase PostgreSQL)
1. Navigate to [Supabase Console](https://supabase.com).
2. Create or open project:
   - Database name: `postgres`
   - Region: Select nearest AWS region (e.g., `eu-central-1` Frankfurt or `us-east-1` N. Virginia).
3. Copy **Connection string (URI)** from `Project Settings -> Database -> Connection string (URI)`.
4. Run migrations using Alembic from local backend or let backend auto-init:
   ```bash
   cd backend
   alembic upgrade head
   ```

---

### Step 2: Backend Deployment (Render or Railway)

#### Using Render:
1. Connect your GitHub repository `DIVEN009/EQUITIX` to Render.
2. Select **Blueprint** and point to `render.yaml`, or create a **Web Service**:
   - **Environment**: `Docker`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Context**: `backend`
   - **Instance Type**: `Free` or `Starter`
   - **Health Check Path**: `/health`
3. Configure Environment Variables in Render Dashboard:
   - `DATABASE_URL`: `postgresql://postgres.xxx:password@...`
   - `SECRET_KEY`: `your_random_64_char_secret_key`
   - `ALGORITHM`: `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: `10080`
   - `BACKEND_CORS_ORIGINS`: `["https://your-frontend.vercel.app","http://localhost:5173"]`
4. Deploy service and copy your public backend URL (e.g. `https://equitix-backend.onrender.com`).

---

### Step 3: Frontend Deployment (Vercel)

1. Navigate to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
2. Select repository `DIVEN009/EQUITIX`.
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Vite**.
5. Configure Environment Variables:
   - `VITE_API_URL`: `https://equitix-backend.onrender.com/api/v1`
6. Click **Deploy**. Vercel will build the distribution bundle and deploy to global Edge CDN with SPA rewrites automatically configured by [vercel.json](file:///d:/Equitix/EQUITIX/frontend/vercel.json).

---

### Step 4: Machine Learning Automated Batch Inference (GitHub Actions)

The repository includes a decoupled production cron workflow in [.github/workflows/ml_batch_job.yml](file:///d:/Equitix/EQUITIX/.github/workflows/ml_batch_job.yml).

1. In GitHub Repository: go to **Settings -> Secrets and variables -> Actions**.
2. Add Repository Secrets:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `SECRET_KEY`: Your JWT encryption key.
3. The cron schedule fires automatically at **00:00 UTC every day**, generating out-of-sample 7-day walk-forward predictions for all tracked institutional tickers.

---

## Health Check & Monitoring Endpoints

| Endpoint | Method | Expected Status | Purpose |
|---|---|---|---|
| `/health` | `GET` | `200 OK` | Container orchestrator liveness & DB connection probe |
| `/api/v1/auth/me` | `GET` | `200 OK` | Authenticated session token validation |
| `/api/v1/stocks/{ticker}` | `GET` | `200 OK` | Real-time quote streaming / DB fallback test |
| `/api/v1/stocks/{ticker}/predictions` | `GET` | `200 OK` | 7-day multi-output ML forecast availability |
| `/api/v1/stocks/{ticker}/benchmarks` | `GET` | `200 OK` | Validation metrics (RMSE, Directional Accuracy) |

---

## Security Best Practices Enforced

1. **Non-Root Containers**: Docker containers run as unprivileged `equitix` user (`UID 1001`).
2. **CORS Whitelisting**: Strict origin controls prevent unauthorized cross-origin API invocation.
3. **Password Security**: Direct `bcrypt` salting bypassing `passlib` compatibility hurdles.
4. **Secret Isolation**: Zero secrets stored in Git; loaded exclusively via environment variables.
