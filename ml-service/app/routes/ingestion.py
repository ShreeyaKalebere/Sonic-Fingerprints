import json
import logging
import os
import pathlib
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel

from app.core.pipeline import process_audio_file, AudioLoadError
from app.models.space_classifier import train_classifiers, are_classifiers_loaded, BODY_CLASSES, TYPE_CLASSES
from app.data_prep.metadata_schema import ALL_BODIES, BODY_TO_AUDIO_TYPE
from app.data_prep.augmentation import build_augmented_dataset
from database.connection import get_space_clips_collection

logger = logging.getLogger("space_ingestion")
router = APIRouter(prefix="/space", tags=["Live Ingestion & Retraining"])

CURRENT_DIR = pathlib.Path(__file__).parent.parent
WEIGHTS_DIR = CURRENT_DIR / "models" / "weights"
MODEL_INFO_PATH = WEIGHTS_DIR / "model_info.json"
WORKSPACE_DIR = CURRENT_DIR.parent.parent
DATA_DIR = WORKSPACE_DIR / "data" / "space"


def get_default_model_info():
    """Default model info metadata if not yet written."""
    is_trained = are_classifiers_loaded()
    return {
        "version": "1.0.0" if is_trained else "untrained",
        "last_retrained_at": datetime.now(timezone.utc).isoformat() if is_trained else None,
        "trained_on_clip_count": 6 if is_trained else 0,
        "classifiers_ready": is_trained,
        "classes": {
            "bodies": BODY_CLASSES,
            "types": TYPE_CLASSES
        }
    }


@router.post("/ingest")
async def ingest_space_clip(
    mission: str = Form(...),
    body: str = Form(...),
    instrument: str = Form("Acoustic / Plasma Sensor"),
    audio_type: str = Form("sonified"),
    description: str = Form(""),
    source_url: str = Form("https://www.nasa.gov"),
    file: UploadFile = File(...)
):
    """
    Live Ingestion Endpoint:
    Accepts audio and metadata, computes 2,048-dim PANNs embedding,
    upserts immediately into ChromaDB 'space_clips' collection without retraining.
    Responds in seconds.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise AudioLoadError("Uploaded audio file is empty.")

        body_clean = body.strip().lower()
        type_clean = audio_type.strip().lower()

        # Check if category is newly introduced
        is_new_category = (body_clean not in ALL_BODIES) or (type_clean not in ["recorded", "sonified"])

        # Compute embedding via shared ML pipeline
        pipeline_result = process_audio_file(
            audio_bytes,
            title=f"Ingested Telemetry: {mission}"
        )
        embedding = pipeline_result["embedding"]

        # Generate unique Chroma ID
        safe_filename = file.filename or f"telemetry_{uuid.uuid4().hex[:8]}.wav"
        chroma_id = f"{body_clean}__{uuid.uuid4().hex[:8]}_{safe_filename}"

        # Upsert into ChromaDB
        collection = get_space_clips_collection()
        collection.upsert(
            ids=[chroma_id],
            embeddings=[embedding],
            metadatas=[{
                "mission": mission,
                "body": body_clean,
                "instrument": instrument,
                "audio_type": type_clean,
                "description": description or f"Acoustic telemetry from {mission} ({body_clean}).",
                "source_url": source_url,
                "filename": safe_filename,
                "is_new_category": is_new_category,
                "ingested_at": datetime.now(timezone.utc).isoformat()
            }],
            documents=[description or f"Acoustic telemetry from {mission} ({body_clean})."]
        )

        message = (
            "⚠️ New category detected — searchable now, but needs retraining to classify correctly"
            if is_new_category
            else "✅ Clip added — instantly searchable"
        )

        return {
            "success": True,
            "chroma_id": chroma_id,
            "is_new_category": is_new_category,
            "message": message,
            "total_collection_count": collection.count()
        }

    except AudioLoadError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error during ingestion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}"
        )


@router.post("/retrain")
def retrain_space_models(epochs: int = 20):
    """
    Re-runs dataset augmentation and retrains both classification heads on full updated dataset.
    Updates model_info.json on completion.
    """
    try:
        logger.info("[Retrain] Building updated dataset from /data/space...")
        aug_dataset = build_augmented_dataset(DATA_DIR)

        # Count total real clips
        counts = aug_dataset.get("counts", {})
        total_real_clips = sum(c.get("real_clips", 0) for c in counts.values())

        # Train models
        report = train_classifiers(aug_dataset, epochs=epochs)

        # Update model_info.json
        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        version_num = 1
        if MODEL_INFO_PATH.exists():
            try:
                with open(MODEL_INFO_PATH, "r", encoding="utf-8") as f:
                    old_info = json.load(f)
                    version_num = int(old_info.get("version", "1.0.0").split(".")[1]) + 1
            except Exception:
                pass

        model_info = {
            "version": f"1.{version_num}.0",
            "last_retrained_at": datetime.now(timezone.utc).isoformat(),
            "trained_on_clip_count": total_real_clips,
            "augmented_samples_count": report.get("total_samples", 0),
            "final_val_body_accuracy": report.get("final_val_body_accuracy", 0.0),
            "final_val_type_accuracy": report.get("final_val_type_accuracy", 0.0),
            "honest_evaluation_note": report.get("honest_evaluation_note", "")
        }

        with open(MODEL_INFO_PATH, "w", encoding="utf-8") as f:
            json.dump(model_info, f, indent=2)

        return {
            "status": "success",
            "message": "Models successfully retrained on full updated telemetry catalog.",
            "model_info": model_info,
            "training_report": report
        }

    except Exception as e:
        logger.error(f"Retraining failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining pipeline failed: {str(e)}"
        )


@router.get("/model-info")
def get_model_info():
    """
    Returns current model version, training timestamp, and clip count.
    """
    if MODEL_INFO_PATH.exists():
        try:
            with open(MODEL_INFO_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return get_default_model_info()
