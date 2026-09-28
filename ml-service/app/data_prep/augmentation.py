import json
import os
import pathlib
from typing import Dict, List, Tuple, Any
import numpy as np
import soundfile as sf
import librosa
from audiomentations import Compose, PitchShift, TimeStretch, AddGaussianNoise

from .metadata_schema import ALL_BODIES, BODY_TO_AUDIO_TYPE

# Define the 3 specific augmentation transforms
pitch_shifter = PitchShift(min_semitones=-2.0, max_semitones=2.0, p=1.0)
time_stretcher = TimeStretch(min_rate=0.9, max_rate=1.1, p=1.0, leave_length_unchanged=True)
noise_injector = AddGaussianNoise(min_amplitude=0.001, max_amplitude=0.012, p=1.0)

TARGET_SR = 32000
WINDOW_SEC = 3.0
STRIDE_SEC = 1.0


def augment_clip(audio_array: np.ndarray, sr: int = TARGET_SR) -> List[np.ndarray]:
    """
    Slices audio into 3-second windows with 1-second stride.
    For each window, produces the original plus 3 augmented variants:
    1. Pitch shift (±2 semitones)
    2. Time stretch (0.9x - 1.1x)
    3. Noise injection (Gaussian noise)
    Returns: List of 3-second waveform arrays (original windows + augmented variants).
    """
    if audio_array.ndim > 1:
        audio_array = np.mean(audio_array, axis=1)

    window_samples = int(WINDOW_SEC * sr)
    stride_samples = int(STRIDE_SEC * sr)
    total_samples = len(audio_array)

    windows = []
    if total_samples < window_samples:
        # Zero-pad short clips symmetrically to 3 seconds
        pad_total = window_samples - total_samples
        pad_left = pad_total // 2
        pad_right = pad_total - pad_left
        padded = np.pad(audio_array, (pad_left, pad_right), mode='constant')
        windows.append(padded.astype(np.float32))
    else:
        for start in range(0, total_samples - window_samples + 1, stride_samples):
            chunk = audio_array[start : start + window_samples]
            windows.append(chunk.astype(np.float32))
        if not windows:
            windows.append(audio_array[:window_samples].astype(np.float32))

    augmented_results = []
    for win in windows:
        # 1. Original unaugmented window
        augmented_results.append(win)

        # 2. Pitch shifted variant
        try:
            p_win = pitch_shifter(samples=win, sample_rate=sr)
            augmented_results.append(p_win.astype(np.float32))
        except Exception:
            augmented_results.append(win.copy())

        # 3. Time stretched variant
        try:
            t_win = time_stretcher(samples=win, sample_rate=sr)
            # Ensure exact length
            if len(t_win) != window_samples:
                if len(t_win) > window_samples:
                    t_win = t_win[:window_samples]
                else:
                    t_win = np.pad(t_win, (0, window_samples - len(t_win)), mode='constant')
            augmented_results.append(t_win.astype(np.float32))
        except Exception:
            augmented_results.append(win.copy())

        # 4. Background noise injection variant
        try:
            n_win = noise_injector(samples=win, sample_rate=sr)
            augmented_results.append(n_win.astype(np.float32))
        except Exception:
            augmented_results.append(win.copy())

    return augmented_results


def build_augmented_dataset(data_dir: pathlib.Path) -> Dict[str, Any]:
    """
    Walks all body folders in data_dir, loads each clip and metadata,
    applies augmentation, and returns structured dataset plus counts.
    """
    dataset: Dict[str, Dict[str, List[Tuple[np.ndarray, str]]]] = {
        body: {"recorded": [], "sonified": []} for body in ALL_BODIES
    }
    counts: Dict[str, Dict[str, Any]] = {
        body: {
            "real_clips": 0,
            "augmented_samples": 0,
            "audio_type": BODY_TO_AUDIO_TYPE[body]
        }
        for body in ALL_BODIES
    }

    AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}

    for body in ALL_BODIES:
        body_dir = data_dir / body
        if not body_dir.exists():
            continue

        default_type = BODY_TO_AUDIO_TYPE[body]

        for file_path in body_dir.iterdir():
            if not file_path.is_file() or file_path.suffix.lower() not in AUDIO_EXTENSIONS:
                continue

            # Load audio file
            try:
                audio, sr = librosa.load(str(file_path), sr=TARGET_SR, mono=True)
            except Exception as e:
                print(f"[Warning] Could not load audio {file_path.name}: {e}")
                continue

            # Check metadata if available to determine audio_type
            json_path = file_path.with_suffix(".json")
            if not json_path.exists():
                json_path = file_path.with_suffix(file_path.suffix + ".json")

            audio_type = default_type
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        audio_type = meta.get("audio_type", default_type)
                except Exception:
                    pass

            counts[body]["real_clips"] += 1

            # Run augmentations
            aug_samples = augment_clip(audio, sr=TARGET_SR)
            for sample in aug_samples:
                dataset[body][audio_type].append((sample, file_path.name))
                counts[body]["augmented_samples"] += 1

    return {
        "dataset": dataset,
        "counts": counts
    }
