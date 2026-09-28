# Solar System Acoustic Explorer - Space Audio Repository

This directory holds manually-downloaded NASA, ESA, and Chandra sonification audio data categorized by celestial body or mission.

## Directory Structure

- `moon/`: Apollo seismic sensor recordings, Lunar Reconnaissance Orbiter data sonifications.
- `mars/`: NASA InSight seismometer recordings (SEIS), Perseverance / Curiosity rover microphone ambient recordings.
- `jupiter/`: Juno Waves instrument recordings (plasma waves in Jupiter's magnetosphere, bow shock, Ganymede flyby).
- `saturn_enceladus/`: Cassini RPWS (Radio and Plasma Wave Science) recordings of Saturn's rings and Enceladus cryovolcanic plumes.
- `voyager_interstellar/`: Voyager 1 & 2 Plasma Wave System (PWS) audio captures of interstellar space and heliopause crossing.
- `chandra_sonification/`: Chandra X-ray Observatory sonifications (Galactic Center, Perseus Galaxy Cluster black hole sound waves, Cassiopeia A, Crab Nebula).

## Supported Formats
- WAV (`.wav`) — Recommended (uncompressed PCM, 16-bit or 24-bit)
- MP3 (`.mp3`)
- FLAC (`.flac`)
- OGG (`.ogg`)

## Core ML Pipeline Processing
All clips placed here are processed through the shared ML pipeline:
1. Normalization & fixed-duration windowing (e.g. 5.0 seconds at 32 kHz / 16 kHz).
2. Mel-Spectrogram transformation ($N_{mels} = 128$).
3. Audio embedding extraction via pretrained acoustic backbone (PANNs Cnn14 / YAMNet).
4. Vector storage in ChromaDB with metadata (celestial body, mission, frequency range, instrument).
