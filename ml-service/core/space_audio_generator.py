"""
Space Audio Telemetry Generator & Loader
Synthesizes physics-grounded space acoustic signals for NASA/ESA/Chandra telemetry
and saves them to data/space/* directories if real recordings are not present.
"""

import os
import pathlib
import numpy as np
import soundfile as sf

TARGETS_METADATA = [
    {
        "id": "moon",
        "name": "Moon (Apollo 12/14/15/16 Seismic)",
        "celestial_body": "Moon (Lunar Surface)",
        "mission": "Apollo Passive Seismic Experiment (ALSEP)",
        "instrument": "Long-Period Triaxial Seismometer",
        "distance_ly": "0.00000004 light-years (384,400 km)",
        "wave_type": "Seismic Surface & Body Waves (Sonified)",
        "frequency_range": "20 Hz - 320 Hz",
        "acoustic_signature": "High-Q lunar regolith reverberation ('ringing bell' effect) with low damping and multi-harmonic body waves.",
        "filename": "apollo_seismic_moonquake.wav",
        "subfolder": "moon"
    },
    {
        "id": "mars",
        "name": "Mars (InSight SEIS & Perseverance)",
        "celestial_body": "Mars (Elysium Planitia & Jezero Crater)",
        "mission": "NASA InSight & Mars 2020 Perseverance",
        "instrument": "Very Broadband SEIS & SuperCam Microphone",
        "distance_ly": "0.000024 light-years (225 million km avg)",
        "wave_type": "Atmospheric Turbulence & Low-Frequency Tremor",
        "frequency_range": "35 Hz - 550 Hz",
        "acoustic_signature": "Thin CO2 atmosphere gust vortices, turbulent dust devil whirls, and crustal sub-surface tremors.",
        "filename": "insight_mars_wind_rumble.wav",
        "subfolder": "mars"
    },
    {
        "id": "jupiter",
        "name": "Jupiter (Juno Plasma Waves)",
        "celestial_body": "Jupiter (Jovian Magnetosphere & Polar Aurora)",
        "mission": "NASA Juno Mission",
        "instrument": "Juno Waves Instrument (Electric Dipole Antenna)",
        "distance_ly": "0.000084 light-years (778 million km avg)",
        "wave_type": "Magnetospheric Plasma Wave Whistler Emissions",
        "frequency_range": "400 Hz - 4200 Hz",
        "acoustic_signature": "Fast descending whistler chirps, chorus emission pulses, and Jovian bow shock plasma wave turbulence.",
        "filename": "juno_polar_plasma_waves.wav",
        "subfolder": "jupiter"
    },
    {
        "id": "saturn_enceladus",
        "name": "Saturn & Enceladus (Cassini RPWS)",
        "celestial_body": "Saturn Rings & Enceladus Cryovolcanic Plumes",
        "mission": "Cassini-Huygens Mission",
        "instrument": "Radio and Plasma Wave Science (RPWS)",
        "distance_ly": "0.00015 light-years (1.43 billion km)",
        "wave_type": "Micro-dust Impact Static & Plume Plasma Oscillations",
        "frequency_range": "150 Hz - 3800 Hz",
        "acoustic_signature": "Hail-like crackling pops from micron-sized ring particle impacts combined with harmonic cryovolcanic plume plasma resonance.",
        "filename": "cassini_ring_dust_impacts.wav",
        "subfolder": "saturn_enceladus"
    },
    {
        "id": "voyager_interstellar",
        "name": "Voyager 1 & 2 (Interstellar Plasma)",
        "celestial_body": "Interstellar Space (Very Local Interstellar Medium)",
        "mission": "Voyager Interstellar Mission",
        "instrument": "Plasma Wave System (PWS)",
        "distance_ly": "0.0026 light-years (24 billion km / 163 AU)",
        "wave_type": "Interstellar Electron Plasma Oscillations",
        "frequency_range": "1800 Hz - 3600 Hz",
        "acoustic_signature": "Eerie pure-tone resonant ringing at the electron plasma frequency triggered by coronal mass ejection shockwaves passing into interstellar space.",
        "filename": "voyager1_interstellar_plasma.wav",
        "subfolder": "voyager_interstellar"
    },
    {
        "id": "chandra_sonification",
        "name": "Chandra Sonification (Perseus Cluster Black Hole)",
        "celestial_body": "Perseus Galaxy Cluster & Galactic Center",
        "mission": "Chandra X-ray Observatory",
        "instrument": "Advanced CCD Imaging Spectrometer (ACIS)",
        "distance_ly": "240 million light-years",
        "wave_type": "Sonified Relativistic Acoustic Pressure Waves",
        "frequency_range": "100 Hz - 1400 Hz",
        "acoustic_signature": "Deep cosmic ripples emitted by a supermassive black hole, scaled 57 octaves up into human audible range, with radial radar pitch sweeps.",
        "filename": "chandra_perseus_blackhole.wav",
        "subfolder": "chandra_sonification"
    }
]


def synthesize_target_audio(target_id: str, sr: int = 32000, duration: float = 5.0) -> np.ndarray:
    """Synthesize physically characteristic acoustic telemetry for a celestial target."""
    n_samples = int(sr * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)

    if target_id == "moon":
        # Ringing bell low-damping seismic body waves
        # Lunar crust is dry fractured anorthosite; tremors ring for thousands of cycles
        f1, f2, f3 = 58.0, 116.0, 185.0
        signal = (
            0.5 * np.sin(2 * np.pi * f1 * t) * np.exp(-0.2 * t) +
            0.35 * np.sin(2 * np.pi * f2 * t) * np.exp(-0.35 * t) +
            0.2 * np.sin(2 * np.pi * f3 * t) * np.exp(-0.5 * t) +
            0.08 * np.random.normal(0, 1, n_samples) * np.exp(-0.4 * t)
        )
        # Add subtle deep rumble pulses
        rumble = 0.25 * np.sin(2 * np.pi * 32.0 * t + 0.5 * np.sin(2 * np.pi * 1.5 * t))
        signal = signal + rumble

    elif target_id == "mars":
        # Low atmospheric density (6 mbar) wind gusts + dust devil vortex turbulence
        # Low-pass filtered noise + turbulent modulated rumble
        noise = np.random.normal(0, 1, n_samples)
        # Modulate amplitude with gust envelope (period ~ 1.8s)
        gust_envelope = 0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 0.4 * t + np.sin(2 * np.pi * 0.15 * t)))
        # Acoustic resonance of rover chassis / InSight tether
        chassis_mode = 0.3 * np.sin(2 * np.pi * 92.0 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 4.0 * t))
        low_rumble = 0.4 * np.sin(2 * np.pi * 54.0 * t)
        signal = (noise * 0.15 * gust_envelope) + chassis_mode + low_rumble

    elif target_id == "jupiter":
        # Jovian whistler emissions: lightning in Jovian atmosphere propagates along B-field
        # Produces dispersion where higher frequencies arrive before lower frequencies
        whistler1 = 0.45 * np.sin(2 * np.pi * (3200.0 / (1.0 + 1.2 * (t % 1.6))) * t)
        whistler2 = 0.35 * np.sin(2 * np.pi * (2400.0 / (1.0 + 1.8 * ((t + 0.7) % 1.4))) * t)
        # Plasma chorus hiss
        hiss = 0.12 * np.random.normal(0, 1, n_samples) * (0.5 + 0.5 * np.sin(2 * np.pi * 6.0 * t))
        signal = whistler1 + whistler2 + hiss

    elif target_id == "saturn_enceladus":
        # Cassini ring plane crossing: thousands of micron-scale dust particle impacts (crackling Poisson clicks)
        clicks = np.zeros(n_samples, dtype=np.float32)
        impact_indices = np.random.choice(n_samples, size=int(duration * 120), replace=False)
        for idx in impact_indices:
            decay_len = min(int(sr * 0.008), n_samples - idx)
            decay_curve = np.exp(-np.linspace(0, 12, decay_len))
            freq = np.random.uniform(800.0, 2800.0)
            t_click = np.arange(decay_len) / sr
            clicks[idx:idx + decay_len] += (np.random.uniform(0.3, 0.9) * np.sin(2 * np.pi * freq * t_click) * decay_curve).astype(np.float32)
        # Cryovolcanic plasma plume oscillation
        plume_tone = 0.25 * np.sin(2 * np.pi * 420.0 * t + 0.3 * np.sin(2 * np.pi * 3.5 * t))
        signal = clicks + plume_tone

    elif target_id == "voyager_interstellar":
        # Interstellar plasma wave: pure narrow electron plasma frequency oscillation around 2.6 - 3.2 kHz
        plasma_osc = 0.65 * np.sin(2 * np.pi * (2900.0 + 220.0 * np.sin(2 * np.pi * 0.3 * t)) * t)
        sub_harmonic = 0.25 * np.sin(2 * np.pi * (1450.0 + 110.0 * np.sin(2 * np.pi * 0.3 * t)) * t)
        deep_space_hum = 0.05 * np.random.normal(0, 1, n_samples)
        signal = plasma_osc + sub_harmonic + deep_space_hum

    elif target_id == "chandra_sonification":
        # Chandra Sonification of Perseus Cluster Black Hole:
        # Sonification maps radius to pitch and brightness to volume
        # Radial sweep tone from center outward with resonant ripples
        sweep_freq = 180.0 + 720.0 * (t / duration)
        sweep = 0.5 * np.sin(2 * np.pi * sweep_freq * t)
        harmonic = 0.3 * np.sin(2 * np.pi * 2.0 * sweep_freq * t)
        ripple = 0.25 * np.sin(2 * np.pi * 120.0 * t) * (1.0 + 0.4 * np.sin(2 * np.pi * 8.0 * t))
        signal = sweep + harmonic + ripple

    else:
        signal = 0.5 * np.sin(2 * np.pi * 440.0 * t)

    # Normalize to -0.92 .. +0.92
    peak = np.max(np.abs(signal))
    if peak > 0:
        signal = 0.92 * (signal / peak)

    return signal.astype(np.float32)


def ensure_space_audio_samples(data_dir: pathlib.Path) -> dict:
    """
    Ensure each target celestial folder has at least one valid audio clip (.wav).
    Returns mapping of target_id to file path.
    """
    audio_paths = {}
    for meta in TARGETS_METADATA:
        target_dir = data_dir / meta["subfolder"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / meta["filename"]

        if not target_file.exists() or target_file.stat().st_size < 1000:
            print(f"[Space Audio] Synthesizing acoustic telemetry for {meta['name']} -> {target_file.name}")
            waveform = synthesize_target_audio(meta["id"])
            sf.write(str(target_file), waveform, 32000)

        audio_paths[meta["id"]] = str(target_file)

    return audio_paths
