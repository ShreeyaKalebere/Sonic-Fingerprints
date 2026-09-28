import io
import os
from pathlib import Path
from typing import Union, Tuple, Optional
import numpy as np
import librosa
import soundfile as sf


def load_and_normalize_audio(
    audio_source: Union[str, Path, bytes, io.BytesIO],
    target_sr: int = 32000,
    target_duration: Optional[float] = None,
    normalize: bool = True,
    pad_mode: str = "constant"
) -> Tuple[np.ndarray, int, float]:
    """
    Load an audio file or raw bytes, resample to target_sr, normalize amplitude,
    and pad or center-crop to target_duration.

    Args:
        audio_source: File path, Path object, raw audio bytes, or BytesIO buffer.
        target_sr: Target sample rate in Hz (default: 32000 for PANNs backbone).
        target_duration: Target audio length in seconds (default: 5.0s).
        normalize: Whether to normalize waveform peak amplitude to [-1.0, 1.0].
        pad_mode: Numpy pad mode ('constant' for zero-padding, 'reflect', etc.)

    Returns:
        waveform: 1D float32 numpy array of length target_sr * target_duration.
        sr: Actual sample rate (target_sr).
        original_duration: Original duration in seconds before padding/cropping.
    """
    # 1. Load audio data
    if isinstance(audio_source, (str, Path)):
        path_str = str(audio_source)
        if not os.path.exists(path_str):
            raise FileNotFoundError(f"Audio file not found: {path_str}")
        waveform, sr = librosa.load(path_str, sr=target_sr, mono=True)
    elif isinstance(audio_source, (bytes, bytearray)):
        buffer = io.BytesIO(audio_source)
        waveform, sr = librosa.load(buffer, sr=target_sr, mono=True)
    elif isinstance(audio_source, io.BytesIO):
        audio_source.seek(0)
        waveform, sr = librosa.load(audio_source, sr=target_sr, mono=True)
    elif isinstance(audio_source, np.ndarray):
        waveform = audio_source.astype(np.float32)
        sr = target_sr
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=0)
    else:
        raise TypeError(f"Unsupported audio source type: {type(audio_source)}")

    # Ensure float32 format
    waveform = waveform.astype(np.float32)
    original_length = len(waveform)
    original_duration = float(original_length / sr) if sr > 0 else 0.0

    # 2. Peak Normalization
    if normalize:
        peak = np.max(np.abs(waveform))
        if peak > 1e-6:
            waveform = waveform / peak

    # 3. Fixed-length pad or crop (only if target_duration is specified)
    if target_duration is not None and target_duration > 0:
        target_samples = int(target_sr * target_duration)
        current_samples = len(waveform)

        if current_samples < target_samples:
            # Pad with zeros at the tail
            pad_width = target_samples - current_samples
            waveform = np.pad(waveform, (0, pad_width), mode=pad_mode)
        elif current_samples > target_samples:
            # Center crop to preserve the core acoustic signature
            start_idx = (current_samples - target_samples) // 2
            waveform = waveform[start_idx : start_idx + target_samples]

    return waveform, sr, original_duration
