"""
Core Audio Pipeline Package for Sonic Fingerprint & Solar System Acoustic Explorer.
Provides shared audio normalization, Mel-spectrogram generation, and pretrained backbone embedding extraction.
"""

from .pipeline import AudioPipeline, process_audio

__all__ = ["AudioPipeline", "process_audio"]
