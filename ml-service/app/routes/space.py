import io
import json
import logging
import os
import pathlib
import traceback
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
import numpy as np

from app.core.pipeline import process_audio_file, AudioLoadError
from app.models.space_classifier import (
    predict_space_audio,
    are_classifiers_loaded,
    load_trained_classifiers,
    BODY_CLASSES,
    TYPE_CLASSES
)
from app.data_prep.metadata_schema import ALL_BODIES, BODY_TO_AUDIO_TYPE
from database.connection import get_space_clips_collection

logger = logging.getLogger("space_explorer")

router = APIRouter(prefix="/space", tags=["Solar System Acoustic Explorer"])

WORKSPACE_DIR = pathlib.Path(__file__).parent.parent.parent.parent
SPACE_DATA_DIR = WORKSPACE_DIR / "data" / "space"
AUDIO_EXTS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}


def check_classifier_readiness():
    """Verify if trained model weights are ready on disk."""
    if not are_classifiers_loaded():
        logger.warning("[Space Service] Classifiers not yet trained. /space/classify will return 503 until trained.")
        return False
    try:
        load_trained_classifiers()
        logger.info("[Space Service] Trained space classifiers loaded and ready.")
        return True
    except Exception as e:
        logger.warning(f"[Space Service] Could not load classifier weights: {e}")
        return False


@router.post("/classify")
async def classify_space_audio(file: UploadFile = File(...)):
    """
    Classifies an input audio clip using BodyClassifier (6 classes) and TypeClassifier (2 classes).
    Returns 503 if classifiers have not been trained yet.
    """
    if not are_classifiers_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classifiers not yet trained. Please run training first via POST /space/train."
        )

    try:
        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise AudioLoadError("Uploaded audio file is empty.")

        pipeline_result = process_audio_file(
            audio_bytes,
            title="Solar System Telemetry Spectrogram"
        )
        embedding = pipeline_result["embedding"]

        # Run inference through both trained heads
        prediction = predict_space_audio(embedding)

        return {
            "body": prediction["body"],
            "top_body": prediction["top_body"],
            "type": prediction["type"],
            "top_type": prediction["top_type"],
            "spectrogram_b64": pipeline_result["spectrogram_base64"]
        }

    except AudioLoadError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as r_err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(r_err))
    except Exception as e:
        logger.error(f"Error in /space/classify: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing space classification."
        )


@router.post("/similarity")
async def similarity_search_space_audio(file: UploadFile = File(...)):
    """
    Computes 2,048-dim PANNs embedding for input audio and queries ChromaDB 'space_clips'
    collection for top-3 nearest clips by cosine similarity.
    Returns empty list with an informative message if collection is empty.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise AudioLoadError("Uploaded audio file is empty.")

        pipeline_result = process_audio_file(audio_bytes)
        query_embedding = pipeline_result["embedding"]

        collection = get_space_clips_collection()
        total_clips = collection.count()

        if total_clips == 0:
            return {
                "message": "The space_clips collection is currently empty. Run seed script or ingestion to populate catalog clips.",
                "total_indexed": 0,
                "matches": []
            }

        n_results = min(3, total_clips)
        query_res = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["metadatas", "distances", "documents"]
        )

        matches = []
        if query_res and query_res["ids"] and len(query_res["ids"][0]) > 0:
            ids = query_res["ids"][0]
            distances = query_res["distances"][0] if query_res.get("distances") else []
            metadatas = query_res["metadatas"][0] if query_res.get("metadatas") else []
            documents = query_res["documents"][0] if query_res.get("documents") else []

            for i, clip_id in enumerate(ids):
                dist = distances[i] if i < len(distances) else 1.0
                similarity = max(0.0, min(1.0, 1.0 - float(dist)))
                meta = metadatas[i] if i < len(metadatas) else {}

                matches.append({
                    "clip_id": clip_id,
                    "similarity": round(similarity, 4),
                    "similarity_pct": round(similarity * 100, 1),
                    "mission": meta.get("mission", "Unknown Mission"),
                    "body": meta.get("body", "unknown"),
                    "audio_type": meta.get("audio_type", "sonified"),
                    "instrument": meta.get("instrument", ""),
                    "description": meta.get("description", documents[i] if i < len(documents) else ""),
                    "source_url": meta.get("source_url", ""),
                    "filename": meta.get("filename", "")
                })

        return {
            "message": f"Found {len(matches)} nearest celestial clips.",
            "total_indexed": total_clips,
            "matches": matches,
            "spectrogram_b64": pipeline_result.get("spectrogram_base64")
        }

    except AudioLoadError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error in /space/similarity: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error performing celestial acoustic similarity search."
        )


@router.get("/clips")
def list_space_clips(
    body: Optional[str] = Query(None, description="Filter by celestial body"),
    audio_type: Optional[str] = Query(None, description="Filter by audio type ('recorded' or 'sonified')")
):
    """
    Returns the space audio clips catalog from disk metadata, with optional body and audio_type filtering.
    """
    clips = []

    target_bodies = [body] if (body and body in ALL_BODIES) else ALL_BODIES

    for b in target_bodies:
        body_dir = SPACE_DATA_DIR / b
        if not body_dir.exists():
            continue

        for f in body_dir.iterdir():
            if not f.is_file() or f.suffix.lower() not in AUDIO_EXTS:
                continue

            json_path = f.with_suffix(".json")
            if not json_path.exists():
                json_path = f.with_suffix(f.suffix + ".json")

            meta = {}
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as jf:
                        meta = json.load(jf)
                except Exception:
                    pass

            clip_type = meta.get("audio_type", BODY_TO_AUDIO_TYPE.get(b, "sonified"))
            if audio_type and clip_type != audio_type:
                continue

            clip_id = f"{b}__{f.name}"
            clips.append({
                "clip_id": clip_id,
                "body": b,
                "filename": f.name,
                "mission": meta.get("mission", f"Archival {b.capitalize()} Mission"),
                "instrument": meta.get("instrument", "Acoustic / Plasma Sensor"),
                "date": meta.get("date", "unknown"),
                "description": meta.get("description", f"Acoustic telemetry recording from {b}."),
                "audio_type": clip_type,
                "source_url": meta.get("source_url", "https://www.nasa.gov"),
                "license_note": meta.get("license_note", "NASA public domain"),
                "audio_url": f"/space/audio/{b}/{f.name}"
            })

    return {
        "count": len(clips),
        "clips": clips
    }


@router.get("/audio/{body}/{filename}")
def stream_space_audio(body: str, filename: str):
    """
    Streams a space audio file from disk.
    """
    target_path = SPACE_DATA_DIR / body / filename
    if not target_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file '{filename}' for body '{body}' not found."
        )

    return FileResponse(
        path=str(target_path),
        media_type="audio/wav" if target_path.suffix.lower() == ".wav" else "audio/mpeg",
        filename=filename
    )


@router.post("/seed-clips")
def seed_space_clips_collection():
    """
    Scans /data/space/* for audio files with metadata JSONs,
    computes 2,048-dim PANNs embeddings, and indexes them into ChromaDB 'space_clips' collection.
    """
    collection = get_space_clips_collection()
    seeded = []

    for b in ALL_BODIES:
        body_dir = SPACE_DATA_DIR / b
        if not body_dir.exists():
            continue

        for f in body_dir.iterdir():
            if not f.is_file() or f.suffix.lower() not in AUDIO_EXTS:
                continue

            json_path = f.with_suffix(".json")
            if not json_path.exists():
                json_path = f.with_suffix(f.suffix + ".json")

            meta = {}
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as jf:
                        meta = json.load(jf)
                except Exception:
                    pass

            clip_id = f"{b}__{f.name}"

            try:
                with open(f, "rb") as af:
                    audio_bytes = af.read()
                pipeline_result = process_audio_file(audio_bytes)
                emb = pipeline_result["embedding"]

                collection.upsert(
                    ids=[clip_id],
                    embeddings=[emb],
                    metadatas=[{
                        "mission": meta.get("mission", f"Archival {b.capitalize()} Mission"),
                        "body": b,
                        "instrument": meta.get("instrument", "Acoustic / Plasma Sensor"),
                        "audio_type": meta.get("audio_type", BODY_TO_AUDIO_TYPE.get(b, "sonified")),
                        "description": meta.get("description", f"Acoustic telemetry recording from {b}."),
                        "source_url": meta.get("source_url", "https://www.nasa.gov"),
                        "filename": f.name
                    }],
                    documents=[meta.get("description", f"Acoustic telemetry recording from {b}.")]
                )
                seeded.append(clip_id)
            except Exception as e:
                logger.warning(f"Could not index clip {f.name}: {e}")

    return {
        "status": "success",
        "seeded_count": len(seeded),
        "seeded_clip_ids": seeded,
        "total_collection_count": collection.count()
    }
