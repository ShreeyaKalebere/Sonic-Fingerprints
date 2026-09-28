import base64
import io
from pathlib import Path
from typing import Optional, Union, Tuple
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
import numpy as np
import librosa
import librosa.display


def compute_mel_spectrogram(
    waveform: np.ndarray,
    sr: int = 32000,
    n_mels: int = 128,
    n_fft: int = 2048,
    hop_length: int = 512,
    fmin: float = 20.0,
    fmax: Optional[float] = None,
    power: float = 2.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute 128-band Mel-spectrogram and convert to decibel scale.

    Args:
        waveform: 1D audio time series.
        sr: Sampling rate of waveform.
        n_mels: Number of Mel frequency bands (default: 128).
        n_fft: FFT window size.
        hop_length: Number of samples between successive frames.
        fmin: Lowest frequency in Hz.
        fmax: Highest frequency in Hz (defaults to sr // 2).
        power: Exponent for magnitude melspectrogram (2.0 for power).

    Returns:
        mel_spectrogram_db: (n_mels, time_steps) matrix in dB units.
        mel_spectrogram_power: Raw power mel-spectrogram.
    """
    if fmax is None:
        fmax = sr / 2.0

    mel_power = librosa.feature.melspectrogram(
        y=waveform,
        sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
        n_mels=n_mels,
        fmin=fmin,
        fmax=fmax,
        power=power
    )

    # Convert power spectrogram to dB relative to peak power
    mel_db = librosa.power_to_db(mel_power, ref=np.max)
    return mel_db, mel_power


def generate_spectrogram_image(
    mel_db: np.ndarray,
    sr: int = 32000,
    hop_length: int = 512,
    title: Optional[str] = "Mel-Spectrogram (128 Bands)",
    cmap: str = "magma",
    save_path: Optional[Union[str, Path]] = None,
    dpi: int = 150
) -> str:
    """
    Render a high-resolution, futuristic dark-themed Mel-spectrogram visualization
    and return as a Base64-encoded PNG string (and optionally save to file).

    Args:
        mel_db: (128, T) Mel-spectrogram matrix in dB.
        sr: Sample rate.
        hop_length: Hop length used in STFT.
        title: Optional title for the plot.
        cmap: Matplotlib colormap ('magma', 'inferno', 'viridis', etc.).
        save_path: Optional file path to save the PNG image.
        dpi: Dots per inch for image rendering.

    Returns:
        base64_png: String prefixed with 'data:image/png;base64,...'
    """
    fig = plt.figure(figsize=(9, 4), facecolor="#0a0e17")
    ax = fig.add_subplot(111, facecolor="#0a0e17")

    # Display Mel-spectrogram
    img = librosa.display.specshow(
        mel_db,
        sr=sr,
        hop_length=hop_length,
        x_axis="time",
        y_axis="mel",
        cmap=cmap,
        ax=ax,
        fmin=20.0,
        fmax=sr / 2.0
    )

    # Customize axes for futuristic dark UI theme
    ax.tick_params(colors="#8892b0", labelsize=9)
    ax.xaxis.label.set_color("#8892b0")
    ax.yaxis.label.set_color("#8892b0")
    for spine in ax.spines.values():
        spine.set_color("#1f2a40")

    if title:
        ax.set_title(title, color="#e6f1ff", fontsize=11, fontweight="semibold", pad=10)

    # Colorbar
    cbar = fig.colorbar(img, ax=ax, format="%+2.0f dB")
    cbar.ax.tick_params(colors="#8892b0", labelsize=8)
    cbar.ax.yaxis.label.set_color("#8892b0")
    cbar.set_label("Relative Intensity (dB)", color="#8892b0", fontsize=9)
    cbar.outline.set_edgecolor("#1f2a40")

    plt.tight_layout()

    # Save to disk if requested
    if save_path:
        save_p = Path(save_path)
        save_p.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(save_p, dpi=dpi, facecolor=fig.get_facecolor(), edgecolor="none")

    # Encode to Base64 in-memory
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    b64_str = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
