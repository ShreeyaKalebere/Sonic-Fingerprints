import io
import logging
import traceback
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse

from app.core.pipeline import process_audio_file, AudioLoadError
from app.models.room_classifier import classify_environment
from database.connection import get_rooms_collection

logger = logging.getLogger("room_recognition")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/room", tags=["Room Recognition"])


@router.post("/classify")
async def classify_room(
    file: UploadFile = File(...)
):
    """
    Classify ambient environmental audio into one of 9 categories:
    (car, room, street, cafe, party_hall, hotel, hospital, office, kitchen).
    Returns class probabilities, top predicted label, and Mel-spectrogram Base64 PNG.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise AudioLoadError("Uploaded audio file is empty.")

        # Run shared core ML pipeline
        pipeline_result = process_audio_file(
            audio_bytes,
            title="Room Recognition Mel-Spectrogram"
        )

        # Run high-accuracy calibrated classification
        classification = classify_environment(
            embedding=pipeline_result["embedding"],
            audio_tags=pipeline_result.get("audio_tags"),
            waveform=pipeline_result.get("waveform")
        )
        top_label = max(classification, key=classification.get)

        return {
            "classification": classification,
            "top_label": top_label,
            "spectrogram_b64": pipeline_result["spectrogram_base64"]
        }

    except AudioLoadError as e:
        logger.warning(f"AudioLoadError in /room/classify: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid audio file: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in /room/classify:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the audio classification."
        )


@router.post("/match")
async def match_room(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Query ChromaDB collection 'rooms' filtered by user_id.
    Matches uploaded audio against user's registered rooms using cosine similarity.
    Threshold calibrated for real-world acoustic variance (>= 0.70).
    """
    try:
        user_id_clean = user_id.strip()
        if not user_id_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )

        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise AudioLoadError("Uploaded audio file is empty.")

        # Embed query audio via shared backbone with multi-window pooling
        pipeline_result = process_audio_file(audio_bytes)
        query_embedding = pipeline_result["embedding"]

        # Access ChromaDB 'rooms' collection
        try:
            collection = get_rooms_collection()
        except Exception as db_err:
            logger.error(f"Database error connecting to ChromaDB: {db_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Vector database is currently unreachable."
            )

        # Query top match for this user
        query_results = collection.query(
            query_embeddings=[query_embedding],
            n_results=1,
            where={"user_id": user_id_clean}
        )

        ids = query_results.get("ids", [[]])[0]
        distances = query_results.get("distances", [[]])[0]
        metadatas = query_results.get("metadatas", [[]])[0]

        if not ids or len(ids) == 0:
            return {
                "matched": False,
                "message": "No registered rooms found for your account. Register a room first!"
            }

        distance = distances[0]
        metadata = metadatas[0]
        room_name = metadata.get("room_name", "Unknown Room")

        # In ChromaDB cosine metric, cosine distance d = 1 - cos(theta)
        similarity = max(0.0, min(1.0, 1.0 - float(distance)))

        # Calibrated threshold for real room acoustic matching
        if similarity >= 0.70:
            confidence = "Very High" if similarity >= 0.85 else ("High" if similarity >= 0.75 else "Moderate")
            return {
                "matched": True,
                "room_name": room_name,
                "similarity": round(similarity, 4),
                "confidence": confidence,
                "message": f"Recognized as {room_name} ({round(similarity * 100, 1)}% match)"
            }
        else:
            return {
                "matched": False,
                "room_name": room_name,
                "similarity": round(similarity, 4),
                "message": f"Closest match was '{room_name}' at {round(similarity * 100, 1)}%, but below 70% confidence threshold"
            }

    except HTTPException:
        raise
    except AudioLoadError as e:
        logger.warning(f"AudioLoadError in /room/match: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid audio file: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in /room/match:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while matching the room."
        )


@router.post("/register")
async def register_room(
    file: UploadFile = File(...),
    room_name: str = Form(...),
    user_id: str = Form(...)
):
    """
    Register a physical room acoustic signature.
    Embeds the audio and upserts vector into ChromaDB collection 'rooms'
    with metadata {user_id, room_name, registered_at}.
    Rejects duplicate room_name for the same user_id with 409 Conflict.
    """
    try:
        clean_room_name = room_name.strip()
        clean_user_id = user_id.strip()

        if not clean_room_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="room_name cannot be empty"
            )
        if not clean_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id cannot be empty"
            )

        # Check collection connection
        try:
            collection = get_rooms_collection()
        except Exception as db_err:
            logger.error(f"Database error connecting to ChromaDB: {db_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Vector database is currently unreachable."
            )

        # Check for duplicate room_name for this user
        existing = collection.get(where={"user_id": clean_user_id})
        if existing and existing.get("metadatas"):
            for meta in existing["metadatas"]:
                if meta.get("room_name", "").strip().lower() == clean_room_name.lower():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Room '{clean_room_name}' is already registered for this user."
                    )

        # Load & embed audio
        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise AudioLoadError("Uploaded audio file is empty.")

        pipeline_result = process_audio_file(audio_bytes)
        embedding = pipeline_result["embedding"]

        # Generate unique room ID
        room_id = f"room_{clean_user_id}_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        metadata = {
            "user_id": clean_user_id,
            "room_name": clean_room_name,
            "registered_at": now_iso
        }

        # Upsert into ChromaDB
        collection.upsert(
            ids=[room_id],
            embeddings=[embedding],
            metadatas=[metadata]
        )

        return {
            "success": True,
            "room_id": room_id
        }

    except HTTPException:
        raise
    except AudioLoadError as e:
        logger.warning(f"AudioLoadError in /room/register: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid audio file: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in /room/register:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while registering the room."
        )
