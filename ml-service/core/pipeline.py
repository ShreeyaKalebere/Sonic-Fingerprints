import io
from pathlib import Path
from typing import Dict, Any, Optional, Union
import numpy as np

from .audio_loader import load_and_normalize_audio
from .spectrogram import compute_mel_spectrogram, generate_spectrogram_image
from .backbone import AcousticBackbone

# Singleton backbone instance for reuse across calls
_DEFAULT_BACKBONE: Optional[AcousticBackbone] = None


def get_default_backbone() -> AcousticBackbone:
    """Lazy loader for default acoustic embedding backbone."""
    global _DEFAULT_BACKBONE
    if _DEFAULT_BACKBONE is None:
        _DEFAULT_BACKBONE = AcousticBackbone()
    return _DEFAULT_BACKBONE


class AudioPipeline:
    """
    Unified Audio ML Pipeline shared between Room Recognition and Solar System Explorer.
    
    1. Audio Loading & Normalization (pad/crop to fixed 5.0s window at 32kHz).
    2. 128-band Mel-Spectrogram extraction and Base64 PNG visualization.
    3. Pretrained deep feature embedding extraction (2048-dim PANNs backbone).
    """

    def __init__(
        self,
        backbone: Optional[AcousticBackbone] = None,
        target_sr: int = 32000,
        target_duration: float = 5.0,
        n_mels: int = 128
    ):
        self.target_sr = target_sr
        self.target_duration = target_duration
        self.n_mels = n_mels
        self.backbone = backbone

    def process(
        self,
        audio_source: Union[str, Path, bytes, io.BytesIO, np.ndarray],
        title: Optional[str] = "Sonic Fingerprint Mel-Spectrogram",
        save_spectrogram_path: Optional[Union[str, Path]] = None,
        include_embedding_list: bool = True
    ) -> Dict[str, Any]:
        """
        Process any audio input into normalized features, a 128-mel spectrogram image,
        and a 2048-dimensional acoustic embedding vector.

        Args:
            audio_source: File path, Path, raw bytes, or waveform array.
            title: Title for spectrogram visualization.
            save_spectrogram_path: Optional path to save spectrogram PNG file directly.
            include_embedding_list: If True, include embedding as Python list of floats
                                   for JSON serializability.

        Returns:
            Dictionary containing:
            - status: "success"
            - sample_rate: int
            - original_duration_sec: float
            - processed_duration_sec: float
            - embedding_shape: List[int] e.g. [2048]
            - embedding: List[float] (if include_embedding_list is True)
            - embedding_numpy: np.ndarray (2048,)
            - spectrogram_base64: str ("data:image/png;base64,...")
            - mel_shape: List[int] [128, T]
            - stats: amplitude and dB statistics
        """
        # 1. Load, resample, normalize (preserve full duration)
        waveform, sr, orig_duration = load_and_normalize_audio(
            audio_source=audio_source,
            target_sr=self.target_sr,
            target_duration=None,
            normalize=True
        )

        # 2. Compute 128-band Mel-Spectrogram across the audio duration
        mel_db, mel_power = compute_mel_spectrogram(
            waveform=waveform,
            sr=sr,
            n_mels=self.n_mels,
            n_fft=2048,
            hop_length=512
        )

        # 3. Generate Futuristic Dark-themed Spectrogram Image (Base64 PNG)
        spec_base64 = generate_spectrogram_image(
            mel_db=mel_db,
            sr=sr,
            hop_length=512,
            title=title,
            save_path=save_spectrogram_path
        )

        # 4. Extract Acoustic Embedding and AudioSet tags using multi-window temporal pooling
        bb = self.backbone if self.backbone is not None else get_default_backbone()
        embedding, tags = bb.extract_features_and_tags(waveform)

        result: Dict[str, Any] = {
            "status": "success",
            "sample_rate": sr,
            "original_duration_sec": round(orig_duration, 4),
            "processed_duration_sec": round(len(waveform) / sr, 4),
            "embedding_shape": list(embedding.shape),
            "embedding_numpy": embedding,
            "spectrogram_base64": spec_base64,
            "mel_shape": list(mel_db.shape),
            "audio_tags": tags.tolist(),
            "waveform": waveform,
            "stats": {
                "waveform_min": float(np.min(waveform)),
                "waveform_max": float(np.max(waveform)),
                "waveform_rms": float(np.sqrt(np.mean(waveform ** 2))),
                "mel_db_min": float(np.min(mel_db)),
                "mel_db_max": float(np.max(mel_db)),
            }
        }

        if include_embedding_list:
            result["embedding"] = embedding.tolist()

        return result


def process_audio(
    audio_source: Union[str, Path, bytes, io.BytesIO, np.ndarray],
    save_spectrogram_path: Optional[Union[str, Path]] = None,
    title: Optional[str] = "Sonic Fingerprint Mel-Spectrogram",
    **kwargs
) -> Dict[str, Any]:
    """
    Convenience function that takes any audio input and returns
    a Mel-spectrogram image (Base64 PNG) and acoustic embedding vector.

    Args:
        audio_source: Audio file path, bytes, or waveform.
        save_spectrogram_path: Optional path to save spectrogram image directly.
        title: Plot title.

    Returns:
        Dict with keys: spectrogram_base64, embedding, embedding_shape, etc.
    """
    pipeline = AudioPipeline()
    return pipeline.process(
        audio_source=audio_source,
        title=title,
        save_spectrogram_path=save_spectrogram_path,
        **kwargs
    )
