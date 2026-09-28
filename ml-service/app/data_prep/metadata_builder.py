import json
import os
import pathlib
from typing import Dict, List, Tuple
from pydantic import ValidationError

from .metadata_schema import ClipMetadata, BODY_TO_AUDIO_TYPE, ALL_BODIES

AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}


def get_default_template(body: str, filename: str) -> dict:
    """Return default template dictionary for a new audio file."""
    audio_type = BODY_TO_AUDIO_TYPE.get(body, "sonified")
    return {
        "mission": "[PLACEHOLDER - e.g. Apollo 12, InSight, Juno, Cassini, Voyager 1, Chandra]",
        "body": body,
        "instrument": "[PLACEHOLDER - e.g. Passive Seismometer, Microphone, Plasma Wave Antenna]",
        "date": "unknown",
        "description": f"[PLACEHOLDER - Acoustic telemetry description for {filename}]",
        "audio_type": audio_type,
        "source_url": "https://www.nasa.gov/connect/sounds/index.html",
        "license_note": "NASA public domain / see source_url for terms"
    }


def scan_and_build_metadata(data_dir: pathlib.Path) -> Tuple[List[str], List[str], List[str]]:
    """
    Walks each body folder in data_dir:
    1. If an audio file lacks a .json metadata file, creates a template JSON with audio_type prefilled.
    2. If .json exists, validates against ClipMetadata.
    
    Returns:
        (created_templates, valid_files, invalid_files)
    """
    created_templates = []
    valid_files = []
    invalid_files = []

    for body in ALL_BODIES:
        body_dir = data_dir / body
        if not body_dir.exists():
            body_dir.mkdir(parents=True, exist_ok=True)
            continue

        for file_path in body_dir.iterdir():
            if not file_path.is_file():
                continue

            if file_path.suffix.lower() not in AUDIO_EXTENSIONS:
                continue

            json_path = file_path.with_suffix(file_path.suffix + ".json")
            # Alternative: same stem .json
            alt_json_path = file_path.with_suffix(".json")
            target_json = alt_json_path if alt_json_path.exists() else json_path

            if not target_json.exists():
                template = get_default_template(body, file_path.name)
                with open(target_json, "w", encoding="utf-8") as f:
                    json.dump(template, f, indent=2)
                created_templates.append(str(file_path))
                print(f"[Metadata Template Created] {target_json.name} -> Needs manual completion")
            else:
                try:
                    with open(target_json, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    # Check for unfilled placeholders
                    has_placeholders = any("[PLACEHOLDER" in str(v) for v in data.values())
                    ClipMetadata(**data)
                    if has_placeholders:
                        invalid_files.append(f"{target_json} (Contains uncompleted [PLACEHOLDER] values)")
                    else:
                        valid_files.append(str(file_path))
                except (ValidationError, json.JSONDecodeError, Exception) as e:
                    invalid_files.append(f"{target_json} (Validation error: {e})")

    return created_templates, valid_files, invalid_files
