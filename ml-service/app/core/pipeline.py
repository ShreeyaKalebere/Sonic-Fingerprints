"""
Re-export from the shared core pipeline to satisfy the /ml-service/app/core/pipeline.py path.
Strictly preserves and re-exports core pipeline functionality without duplicating or modifying
the core pipeline code.
"""

from core.pipeline import AudioPipeline, process_audio, get_default_backbone


class AudioLoadError(Exception):
    """Raised when an uploaded audio file is invalid, corrupt, or unreadable."""
    pass


def process_audio_file(audio_source, **kwargs):
    """Alias for process_audio that wraps audio decoding errors in AudioLoadError."""
    try:
        return process_audio(audio_source, **kwargs)
    except Exception as e:
        if isinstance(e, (FileNotFoundError, TypeError, ValueError)) or "audio" in str(e).lower() or "format" in str(e).lower() or "codec" in str(e).lower():
            raise AudioLoadError(f"Failed to process or decode audio: {str(e)}") from e
        raise e


__all__ = ["AudioPipeline", "process_audio", "process_audio_file", "AudioLoadError", "get_default_backbone"]
