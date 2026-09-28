"""
Package alias for app.core.
Ensures zero code duplication while supporting the /ml-service/app/core import namespace.
"""
from core.pipeline import AudioPipeline, process_audio

__all__ = ["AudioPipeline", "process_audio"]
