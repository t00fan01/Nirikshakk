# ==============================================================================
# NIRIKSHAK AI — Backend Container Dockerfile (FastAPI + Python ML)
# Problem Statement: SIH26146
# Offline Bitcoin Transaction Intelligence & Graph Analytics Engine
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code, tests, scripts, and default benchmark data
COPY . .

# Expose FastAPI listening port
EXPOSE 8000

# Container healthcheck for docker-compose dependency resolution
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Launch FastAPI application via Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
