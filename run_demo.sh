#!/usr/bin/env bash
# ==============================================================================
# NIRIKSHAK AI — SIH26146 Linux / Native Demo Startup Script
#
# Starts FastAPI backend (port 8000) and Vite frontend (port 5173).
# Handles graceful process termination and port cleanup on SIGINT/SIGTERM.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

echo "=================================================================="
echo "  NIRIKSHAK — AI Bitcoin Transaction Intelligence (SIH26146)"
echo "  Internal Hackathon Demo Environment"
echo "=================================================================="

# 1. Verify Python 3
if command -v python3 &>/dev/null; then
    PY_BIN="$(command -v python3)"
    PY_VER="$("${PY_BIN}" --version 2>&1)"
    echo "[✓] Python detected: ${PY_VER} (${PY_BIN})"
else
    echo "[✗] ERROR: python3 is not installed or not found in PATH."
    exit 1
fi

# 2. Verify Node & npm
if command -v node &>/dev/null && command -v npm &>/dev/null; then
    NODE_VER="$(node --version)"
    NPM_VER="$(npm --version)"
    echo "[✓] Node.js detected: ${NODE_VER} (npm ${NPM_VER})"
else
    echo "[✗] ERROR: node or npm is not installed or not found in PATH."
    exit 1
fi

# 3. Check Python venv if present
if [ -f "${BACKEND_DIR}/venv/bin/activate" ]; then
    echo "[i] Activating Python virtualenv at backend/venv..."
    source "${BACKEND_DIR}/venv/bin/activate"
    PY_BIN="$(command -v python3)"
fi

# 4. Cleanup Handler on Exit
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "[!] Shutting down NIRIKSHAK demo processes..."
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        echo "    Stopping FastAPI backend (PID ${BACKEND_PID})..."
        kill -TERM "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        echo "    Stopping Vite frontend (PID ${FRONTEND_PID})..."
        kill -TERM "${FRONTEND_PID}" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "[✓] Shutdown complete. Goodbye!"
    exit 0
}

trap cleanup INT TERM EXIT

# 5. Start Backend
echo "[*] Launching FastAPI backend on http://0.0.0.0:8000..."
cd "${BACKEND_DIR}"
"${PY_BIN}" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "${SCRIPT_DIR}"

# 6. Start Frontend
echo "[*] Launching Vite frontend on http://0.0.0.0:5173..."
cd "${FRONTEND_DIR}"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd "${SCRIPT_DIR}"

# 7. Wait briefly for backend readiness
echo "[*] Initializing services..."
sleep 2

echo ""
echo "=================================================================="
echo "  NIRIKSHAK DEMO PLATFORM READY"
echo "=================================================================="
echo "  Frontend Dashboard : http://localhost:5173"
echo "  FastAPI Swagger Docs: http://localhost:8000/docs"
echo "  Backend Health API : http://localhost:8000/api/health"
echo ""
echo "  Press Ctrl+C anytime to stop both services."
echo "=================================================================="
echo ""

# Keep running until interrupted
wait "${BACKEND_PID}" "${FRONTEND_PID}"
