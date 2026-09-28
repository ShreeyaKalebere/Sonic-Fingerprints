"""
FastAPI application entrypoint for uvicorn app:app or uvicorn app.main:app
"""
import sys
from pathlib import Path

# Ensure ml-service root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.resolve()))

from app.main import app

__all__ = ["app"]
