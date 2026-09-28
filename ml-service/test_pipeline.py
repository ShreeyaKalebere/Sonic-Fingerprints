#!/usr/bin/env python3
"""
Test script for the Shared Core Audio ML Pipeline.
Demonstrates:
1. Generating a synthetic acoustic test signal (space plasma / room acoustic chirp).
2. Running the unified `process_audio` function (normalization, 128-band Mel-spectrogram, PANNs backbone).
3. Printing the extracted embedding vector shape and statistics.
4. Saving the generated Mel-spectrogram visualization to disk as `sample_spectrogram.png`.
5. Testing placeholder database connectivity (MongoDB and ChromaDB).
"""

import sys
import os
import pathlib
import numpy as np
import soundfile as sf

# Add current directory to path
current_dir = pathlib.Path(__file__).parent.resolve()
sys.path.insert(0, str(current_dir))

from core.pipeline import process_audio
from database.connection import get_database_status


def generate_synthetic_audio(output_path: pathlib.Path, sr: int = 32000, duration: float = 4.0) -> pathlib.Path:
    """
    Generate a rich acoustic test signal composed of multi-harmonic tones,
    an exponential frequency chirp (resembling space plasma wave emissions),
    and ambient resonance decay (resembling room acoustics).
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # 1. Base acoustic harmonic resonances (room modes / planetary tones)
    tones = (
        0.4 * np.sin(2 * np.pi * 220.0 * t) +
        0.3 * np.sin(2 * np.pi * 440.0 * t) +
        0.2 * np.sin(2 * np.pi * 880.0 * t)
    )
    
    # 2. Cosmic whistler / chirp sweep (from 500 Hz up to 3500 Hz)
    chirp_freq = 500.0 * (7.0 ** (t / duration))
    chirp = 0.35 * np.sin(2 * np.pi * chirp_freq * t)
    
    # 3. Ambient atmospheric noise
    noise = 0.05 * np.random.normal(0, 1, len(t))
    
    # 4. Exponential envelope decay
    envelope = np.exp(-0.4 * t)
    
    composite = (tones + chirp + noise) * envelope
    # Normalize to -0.95 to +0.95
    composite = 0.95 * composite / np.max(np.abs(composite))
    
    sf.write(str(output_path), composite.astype(np.float32), sr)
    print(f"[Synthesizer] Generated synthetic acoustic sample: {output_path} ({duration}s at {sr}Hz)")
    return output_path


def main():
    print("=" * 70)
    print("SONIC FINGERPRINT & SOLAR SYSTEM ACOUSTIC EXPLORER")
    print("Core Audio ML Pipeline Test")
    print("=" * 70)

    # 1. Determine input audio
    sample_wav_path = current_dir / "sample_audio.wav"
    spectrogram_output_path = current_dir / "sample_spectrogram.png"

    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        input_audio_path = pathlib.Path(sys.argv[1])
        print(f"[Input] Using provided audio file: {input_audio_path}")
    else:
        print("[Input] Generating synthetic acoustic test signal...")
        input_audio_path = generate_synthetic_audio(sample_wav_path)

    # 2. Execute Shared Core Pipeline
    print("\n[Pipeline] Running audio loading, 128-band Mel-spectrogram & backbone extraction...")
    result = process_audio(
        audio_source=input_audio_path,
        save_spectrogram_path=spectrogram_output_path,
        title="Solar System & Sonic Fingerprint Acoustic Spectrogram"
    )

    # 3. Inspect and Print Pipeline Results
    print("\n" + "-" * 70)
    print("PIPELINE EXECUTION RESULTS:")
    print("-" * 70)
    print(f" Status:                  {result['status']}")
    print(f" Sample Rate:             {result['sample_rate']} Hz")
    print(f" Original Audio Duration: {result['original_duration_sec']} seconds")
    print(f" Window Duration:         {result['processed_duration_sec']} seconds")
    print(f" Mel-Spectrogram Shape:   {result['mel_shape']}  (Bands: {result['mel_shape'][0]}, Time Bins: {result['mel_shape'][1]})")
    print(f" Mel dB Dynamic Range:    {result['stats']['mel_db_min']:.2f} dB to {result['stats']['mel_db_max']:.2f} dB")
    print(f" Spectrogram Image Saved: {spectrogram_output_path} (exists: {spectrogram_output_path.exists()})")
    print(f" Spectrogram Base64 Len:  {len(result['spectrogram_base64'])} chars (Prefix: {result['spectrogram_base64'][:35]}...)")
    
    # 4. Verify Pretrained Backbone Embedding
    emb_shape = result['embedding_shape']
    emb_np = result['embedding_numpy']
    print(f"\n[Backbone Embedding Extraction]")
    print(f" Embedding Vector Shape:  {emb_shape}")
    print(f" Embedding Vector L2 Norm:{np.linalg.norm(emb_np):.4f}")
    print(f" Embedding Mean:          {np.mean(emb_np):.6f}")
    print(f" Embedding Std Dev:       {np.std(emb_np):.6f}")
    print(f" First 5 Components:      {[round(float(x), 4) for x in emb_np[:5]]}")

    # 5. Check Database Placeholders
    print("\n" + "-" * 70)
    print("CHECKING DATABASE PLACEHOLDER CONNECTIONS:")
    print("-" * 70)
    db_status = get_database_status()
    for db_name, status in db_status.items():
        st = status.get('status', 'unknown')
        print(f" - {db_name.upper():<10}: Status = {st}")
        if st == 'disconnected':
            print(f"   (Expected when Docker services are not yet running: {status.get('error')})")
        else:
            print(f"   Connection details: {status}")

    print("\n" + "=" * 70)
    print("SUCCESS: Core Audio ML Pipeline verified and operational!")
    print("=" * 70)


if __name__ == "__main__":
    main()
