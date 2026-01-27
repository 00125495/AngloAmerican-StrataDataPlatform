#!/usr/bin/env python3
"""Development server launcher - runs FastAPI and Node.js concurrently."""

import subprocess
import sys
import os
import signal
import time

processes = []

def cleanup(signum=None, frame=None):
    """Clean up child processes."""
    for proc in processes:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    fastapi_proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        env={**os.environ}
    )
    processes.append(fastapi_proc)
    
    time.sleep(2)
    
    nodejs_proc = subprocess.Popen(
        ["npm", "run", "dev:frontend"],
        env={**os.environ, "NODE_ENV": "development"}
    )
    processes.append(nodejs_proc)
    
    try:
        while True:
            if fastapi_proc.poll() is not None:
                print("FastAPI process exited")
                break
            if nodejs_proc.poll() is not None:
                print("Node.js process exited")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()

if __name__ == "__main__":
    main()
