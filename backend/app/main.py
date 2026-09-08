from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NIRIKSHAK AI - Bitcoin Transaction Intelligence API",
    description="Offline AI-powered Bitcoin transaction investigation & traffic analysis platform backend (SIH26146).",
    version="0.1.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import datasets, stats, analysis, alerts, graph

app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(stats.router, prefix="/api", tags=["Stats"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])


@app.get("/")
def read_root():
    return {
        "service": "NIRIKSHAK AI Backend",
        "problem_statement": "SIH26146 - AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic",
        "status": "active",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "nirikshak-backend",
        "version": "0.1.0"
    }
