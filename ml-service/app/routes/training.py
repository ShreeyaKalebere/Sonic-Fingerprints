import logging
import os
import pathlib
import pickle
from typing import Optional
from fastapi import APIRouter, HTTPException, status

from app.models.space_classifier import train_classifiers
from app.data_prep.augmentation import build_augmented_dataset

logger = logging.getLogger("space_training")
router = APIRouter(prefix="/space", tags=["Space ML Training"])

CURRENT_DIR = pathlib.Path(__file__).parent.parent
CACHE_FILE = CURRENT_DIR / "data_prep" / "cache" / "augmented_dataset.pkl"
WORKSPACE_DIR = CURRENT_DIR.parent.parent
DATA_DIR = WORKSPACE_DIR / "data" / "space"


@router.post("/train")
def train_space_models(epochs: int = 20, val_split: float = 0.2):
    """
    Loads cached augmented dataset (or rebuilds from /data/space if missing),
    trains BodyClassifier (6 classes) and TypeClassifier (2 classes),
    saves weights to app/models/weights/, and returns honest accuracy metrics.
    """
    try:
        augmented_data = None
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "rb") as f:
                    augmented_data = pickle.load(f)
                logger.info(f"Loaded augmented dataset from cache: {CACHE_FILE}")
            except Exception as e:
                logger.warning(f"Could not read cache file ({e}). Rebuilding dataset...")

        if not augmented_data:
            logger.info("Building augmented dataset from disk...")
            augmented_data = build_augmented_dataset(DATA_DIR)
            CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(CACHE_FILE, "wb") as f:
                pickle.dump(augmented_data, f)

        # Execute training
        report = train_classifiers(augmented_data, epochs=epochs, val_split=val_split)
        return report

    except ValueError as val_err:
        logger.warning(f"Training prerequisite not met: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Error during classifier training: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )
