import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch

from database.connection import get_database_status, init_chroma_collections
from app.routes.room import router as room_router
from app.routes.space import router as space_router, check_classifier_readiness
from app.routes.training import router as training_router
from app.routes.ingestion import router as ingestion_router

logger = logging.getLogger("ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure ChromaDB collections are registered
    logger.info("[ML Service] Initializing ChromaDB collections on startup...")
    init_chroma_collections()
    # Check if trained models are available
    check_classifier_readiness()
    yield
    # Shutdown
    logger.info("[ML Service] Shutting down...")


app = FastAPI(
    title="Sonic Fingerprints ML Service",
    description="Core Audio ML Pipeline for Room Recognition & Solar System Explorer",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Mode 1: Room Recognition Router
app.include_router(room_router)

# Include Mode 2: Solar System Acoustic Explorer Routers
app.include_router(space_router)
app.include_router(training_router)
app.include_router(ingestion_router)


@app.get("/")
def root():
    return {
        "service": "Sonic Fingerprints ML Service",
        "status": "ready",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "description": "Pretrained acoustic pipeline (Mel-spectrogram 128 bands + 2048-dim PANNs backbone)",
        "modes": ["Room Recognition (/room/*)", "Solar System Explorer"]
    }


@app.get("/health")
def health():
    db_status = get_database_status()
    return {
        "status": "healthy",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "cuda_available": torch.cuda.is_available(),
        "databases": db_status
    }
