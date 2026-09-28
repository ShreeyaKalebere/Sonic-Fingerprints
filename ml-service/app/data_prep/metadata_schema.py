from typing import Literal, Dict
from pydantic import BaseModel, Field

# Supported bodies
BodyType = Literal[
    "moon",
    "mars",
    "jupiter",
    "saturn_enceladus",
    "voyager_interstellar",
    "chandra_sonification"
]

# Audio types
AudioType = Literal["recorded", "sonified"]

# Pre-filled audio_type mapping derived from celestial body/folder
BODY_TO_AUDIO_TYPE: Dict[str, AudioType] = {
    "moon": "recorded",
    "mars": "recorded",
    "jupiter": "sonified",
    "saturn_enceladus": "sonified",
    "voyager_interstellar": "sonified",
    "chandra_sonification": "sonified"
}

ALL_BODIES = list(BODY_TO_AUDIO_TYPE.keys())


class ClipMetadata(BaseModel):
    """
    Pydantic schema for celestial clip metadata.
    """
    mission: str = Field(..., description="Space mission or project name (e.g. Apollo 12, InSight, Juno)")
    body: BodyType = Field(..., description="Target celestial body or planetary system")
    instrument: str = Field(..., description="Recording sensor or instrument (e.g. ALSEP Seismometer, Waves)")
    date: str = Field("unknown", description="ISO format date (YYYY-MM-DD) or 'unknown'")
    description: str = Field(..., description="Scientific and acoustic description of the recording")
    audio_type: AudioType = Field(..., description="'recorded' for physical vibrations/microphones or 'sonified' for data translations")
    source_url: str = Field(..., description="Official archive URL (NASA, PDS, Chandra, etc.)")
    license_note: str = Field(
        "NASA public domain / see source_url for terms",
        description="Data license or attribution statement"
    )
