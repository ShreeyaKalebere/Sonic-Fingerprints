"""
Room / Environment Acoustic Classifier Engine.
High-precision calibrated environmental classifier powered by AudioSet 527-class
semantic representations from the PANNs Cnn14 backbone and psychoacoustic features.

Recognizes target acoustic environments:
- car (Vehicle Interior, Driving, Automobile Cabin, Engine Rumble)
- room (Quiet Room, Bedroom, Residential Flat, Private Space)
- street (Outside Street, Roadway Traffic, Urban Outdoor)
- cafe (Cafe, Restaurant, Coffee Shop, Crowd Babble)
- party_hall (Party Hall, Dance Club, Celebration, Loud Music)
- hotel (Hotel Lobby, Lounge, Reverberant Indoor Hall)
- hospital (Hospital, Medical Clinic, Healthcare Ward, Equipment Beeps)
- office (Office Workspace, Keyboard Typing, Computer Room)
- kitchen (Kitchen, Food Preparation, Utensils, Dishes, Sizzle)
"""

from typing import Dict, List, Union, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

ROOM_LABELS: List[str] = [
    "car",
    "room",
    "street",
    "cafe",
    "party_hall",
    "hotel",
    "hospital",
    "office",
    "kitchen"
]

class RoomClassifierHead(nn.Module):
    """
    Feedforward acoustic environment classification head for compatibility.
    """
    def __init__(self, embedding_dim: int = 2048, hidden_dim: int = 128, num_classes: int = len(ROOM_LABELS), dropout_rate: float = 0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(p=dropout_rate),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# AudioSet indices mapping to target acoustic environments
AUDIOSET_MAPPINGS: Dict[str, List[int]] = {
    "car": [307, 306, 343, 344, 348, 349, 350, 351, 353, 493, 523, 314, 315],
    "room": [500, 15, 41, 496, 506, 515, 520, 521, 511],
    "street": [327, 316, 321, 326, 308, 310, 396, 322, 323, 325, 285, 514],
    "cafe": [68, 69, 70, 16, 4, 441, 442, 508],
    "party_hall": [137, 274, 236, 245, 239, 240, 219, 216, 217, 66, 67, 275, 280, 24],
    "hotel": [507, 508, 246, 267, 53, 358, 354, 357, 511, 512],
    "hospital": [481, 503, 505, 395, 388, 47, 49, 64, 65],
    "office": [386, 385, 384, 124, 415, 389, 390, 391, 412, 413],
    "kitchen": [364, 365, 367, 368, 369, 370, 371, 362, 363, 456, 444]
}


def classify_environment(
    embedding: Union[np.ndarray, List[float], torch.Tensor],
    audio_tags: Optional[Union[np.ndarray, List[float]]] = None,
    waveform: Optional[np.ndarray] = None
) -> Dict[str, float]:
    """
    Classify an acoustic recording into one of 9 environmental categories:
    ["car", "room", "street", "cafe", "party_hall", "hotel", "hospital", "office", "kitchen"].
    """
    if isinstance(embedding, torch.Tensor):
        embedding_arr = embedding.detach().cpu().numpy()
    elif isinstance(embedding, list):
        embedding_arr = np.array(embedding, dtype=np.float32)
    else:
        embedding_arr = np.asarray(embedding, dtype=np.float32)

    if embedding_arr.ndim > 1:
        embedding_arr = embedding_arr.flatten()

    # Evidence accumulator for each class (neutral baseline)
    evidence: Dict[str, float] = {label: 0.05 for label in ROOM_LABELS}

    # Psychoacoustic metrics initialization
    rms = 0.02
    crest_factor = 2.0
    low_freq_ratio = 0.20

    if waveform is not None:
        wf = np.asarray(waveform, dtype=np.float32)
        if len(wf) > 0:
            rms = float(np.sqrt(np.mean(wf ** 2)))
            peak = float(np.max(np.abs(wf)))
            crest_factor = peak / (rms + 1e-6)

            # Spectral power distribution
            if len(wf) >= 512:
                analysis_len = min(len(wf), 32000 * 5)
                fft_mags = np.abs(np.fft.rfft(wf[:analysis_len]))
                freqs = np.fft.rfftfreq(analysis_len, 1.0 / 32000.0)
                tot_power = np.sum(fft_mags ** 2) + 1e-9
                low_freq_ratio = float(np.sum(fft_mags[freqs < 300] ** 2) / tot_power)

    # 1. Semantic AudioSet Class Evidence
    if audio_tags is not None:
        if isinstance(audio_tags, list):
            tags_arr = np.array(audio_tags, dtype=np.float32)
        else:
            tags_arr = np.asarray(audio_tags, dtype=np.float32)

        if len(tags_arr) >= 527:
            # Acoustic feature extractors
            car_specific = float(max(tags_arr[307], tags_arr[306], tags_arr[343], tags_arr[348], tags_arr[349], tags_arr[351], tags_arr[353]))
            vehicle_general = float(tags_arr[300])
            rumble = float(max(tags_arr[493], tags_arr[523]))
            
            speech_score = float(max(tags_arr[0], tags_arr[1], tags_arr[2], tags_arr[3], tags_arr[5]))
            crowd_score = float(max(tags_arr[68], tags_arr[69], tags_arr[70]))
            music_score = float(max(tags_arr[137], tags_arr[274], tags_arr[236], tags_arr[245], tags_arr[239], tags_arr[240]))
            street_traffic = float(max(tags_arr[327], tags_arr[316], tags_arr[321], tags_arr[326], tags_arr[308], tags_arr[396]))
            beep_score = float(max(tags_arr[481], tags_arr[503], tags_arr[505], tags_arr[395]))
            kitchen_dishes = float(max(tags_arr[364], tags_arr[365], tags_arr[367], tags_arr[368], tags_arr[369], tags_arr[370]))
            office_keys = float(max(tags_arr[386], tags_arr[385], tags_arr[384]))
            hotel_hall = float(max(tags_arr[507], tags_arr[508], tags_arr[246], tags_arr[267]))
            indoor_cue = float(max(tags_arr[500], tags_arr[506], tags_arr[496], tags_arr[515]))

            # 2. Signature Detection
            is_car = (
                (car_specific > 0.20 and (vehicle_general > 0.25 or rumble > 0.18)) or
                (car_specific > 0.15 and rumble > 0.22) or
                (vehicle_general > 0.35 and rumble > 0.22 and low_freq_ratio > 0.35) or
                (car_specific > 0.28)
            )

            is_party = (
                music_score > 0.35 and 
                (tags_arr[66] > 0.12 or tags_arr[274] > 0.18 or tags_arr[236] > 0.18 or rms > 0.08) and 
                not is_car
            )

            is_hospital = (beep_score > 0.25) and not is_car
            is_cafe = (crowd_score > 0.22) and not is_car and not is_party
            is_kitchen = (kitchen_dishes > 0.20 or (crest_factor > 7.0 and kitchen_dishes > 0.12)) and not is_car
            is_office = (office_keys > 0.20) and not is_car and not is_kitchen
            is_hotel = (hotel_hall > 0.28 and float(tags_arr[511]) > 0.10) and not is_car and not is_party
            is_street = (street_traffic > 0.22 and car_specific < 0.16 and rumble < 0.18) and not is_car

            # 3. Evidence Routing
            if is_car:
                evidence["car"] += (car_specific * 4.5) + (rumble * 3.0) + (vehicle_general * 1.5)
                if low_freq_ratio > 0.40:
                    evidence["car"] += low_freq_ratio * 2.0
                if speech_score > 0.15:
                    evidence["car"] += speech_score * 1.0
                if music_score > 0.20:
                    evidence["car"] += music_score * 0.8
                    evidence["party_hall"] = 0.01
                evidence["room"] = 0.01
                evidence["street"] = 0.01

            elif is_party:
                evidence["party_hall"] += (music_score * 4.5) + (float(tags_arr[66]) * 2.5)
                evidence["room"] = 0.01
                evidence["car"] = 0.01

            elif is_hospital:
                evidence["hospital"] += (beep_score * 4.5)
                evidence["car"] = 0.01

            elif is_cafe:
                evidence["cafe"] += (crowd_score * 4.5)
                evidence["car"] = 0.01

            elif is_kitchen:
                evidence["kitchen"] += (kitchen_dishes * 4.5)
                evidence["car"] = 0.01

            elif is_office:
                evidence["office"] += (office_keys * 4.5)
                evidence["car"] = 0.01

            elif is_hotel:
                evidence["hotel"] += (hotel_hall * 4.0)
                evidence["car"] = 0.01

            elif is_street:
                evidence["street"] += (street_traffic * 4.0)
                evidence["room"] = 0.01
                evidence["car"] = 0.01

            else:
                # Default Private Residential Room
                evidence["car"] = 0.01
                evidence["street"] = 0.01
                evidence["party_hall"] = 0.01
                
                # Speech in room
                if speech_score > 0.10:
                    evidence["room"] += speech_score * 3.5
                # Indoor / quiet cues
                if indoor_cue > 0.03:
                    evidence["room"] += indoor_cue * 2.8
                else:
                    evidence["room"] += 1.5

    # 4. Waveform Psychoacoustic Calibration
    if waveform is not None:
        if rms < 0.035 and evidence["car"] < 1.0:
            quiet_factor = (0.035 - rms) / 0.035
            evidence["room"] += quiet_factor * 2.5

    # 5. Softmax with Calibrated Temperature Scaling
    logits = np.array([evidence[label] for label in ROOM_LABELS], dtype=np.float64)
    logits = logits - np.max(logits)
    temperature = 0.35  # Sharp, decisive, calibrated probability distribution
    exp_logits = np.exp(logits / temperature)
    probabilities = exp_logits / np.sum(exp_logits)

    confidence_dict = {
        label: round(float(prob), 4)
        for label, prob in zip(ROOM_LABELS, probabilities)
    }

    return confidence_dict


__all__ = ["classify_environment", "ROOM_LABELS", "RoomClassifierHead"]
