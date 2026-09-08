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

from app.routers import datasets

app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])


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
