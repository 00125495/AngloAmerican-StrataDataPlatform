#!/bin/bash

cleanup() {
    echo "Stopping servers..."
    kill $VITE_PID $FASTAPI_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting Vite dev server on port 5173..."
npx vite --host 127.0.0.1 --port 5173 &
VITE_PID=$!

sleep 2

echo "Starting FastAPI server on port 5000..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload &
FASTAPI_PID=$!

wait
