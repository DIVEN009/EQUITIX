# ==========================================
# Equitix Backend Production Dockerfile
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies needed for compiling extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==========================================
# Production Runtime Stage
# ==========================================
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create non-root system user for security compliance
RUN useradd -m -u 1001 -s /bin/bash equitix

# Copy application files
COPY alembic.ini .
COPY alembic ./alembic
COPY src ./src

# Set permissions
RUN chown -R equitix:equitix /app

USER equitix

EXPOSE 8000

# Container Healthcheck targeting FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch uvicorn with production worker configuration
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
