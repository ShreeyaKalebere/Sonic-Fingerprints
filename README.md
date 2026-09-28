# Sonic Fingerprint & Solar System Acoustic Explorer

A dual-mode acoustic intelligence platform powered by a standardized 32,000 Hz deep audio ML pipeline:
1. **Mode 1: Physical Room Recognition** — Identifies physical architectural rooms from ambient acoustic noise using cosine similarity indexing over reverberant spatial manifolds.
2. **Mode 2: Solar System Acoustic Explorer** — Analyzes, classifies, and indexes authentic NASA, Cassini, Juno, and Chandra sonified planetary and interstellar telemetry.

---

## Architecture Overview

```
                                  +---------------------------------------------+
                                  |              React Frontend                 |
                                  |     Vite / Vanilla CSS Design System        |
                                  +----------------------+----------------------+
                                                         |
                                                         | HTTP / REST (CORS)
                                                         v
                                  +---------------------------------------------+
                                  |         Backend API Gateway (Node/Express)  |
                                  |   JWT Auth / Multer Uploads / Static Audio  |
                                  +-----------+---------------------+-----------+
                                              |                     |
                          Mongoose ODM        |                     | Axios HTTP Proxy
                                              v                     v
                 +------------------------------------+  +------------------------------------+
                 |          MongoDB (Doc DB)          |  |       ML Service (FastAPI)         |
                 | - Users (email, bcrypt pass)       |  | - Pretrained PANNs Cnn14 (2048-dim)|
                 | - Rooms (name, chroma_id)          |  | - 128-Mel Spectrogram Generator   |
                 | - History (mode, result, timestamp)|  | - BodyClassifier (6 classes)       |
                 | - SpaceClips (metadata & audio)    |  | - TypeClassifier (2 classes)       |
                 +------------------------------------+  +------------------+-----------------+
                                                                            |
                                                      PyMongo / HTTP Client |
                                                                            v
                                                         +------------------------------------+
                                                         |         ChromaDB (Vector DB)       |
                                                         | - Collection: "rooms" (cosine)     |
                                                         | - Collection: "space_clips" (cosine|
                                                         +------------------------------------+
```

---

## Shared Core ML Pipeline

Both operational modes feed directly into a standardized acoustic feature extraction pipeline:
1. **Audio Ingestion & Resampling:** Converts all audio formats (WAV, MP3, FLAC, OGG, M4A) to **32,000 Hz** mono time-series.
2. **Temporal Windowing:** Deterministic **5.0-second window** with symmetric zero-padding or center cropping. Peak normalized to $[-0.95, 0.95]$.
3. **128-Band Mel-Spectrogram Extraction:** $N_{\text{mels}} = 128$, $N_{\text{fft}} = 2048$, $Hop = 512$, power converted to decibels relative to peak. Generates high-contrast Base64 PNG visual artifacts.
4. **Pretrained Deep Feature Backbone:** **PANNs Cnn14** (AudioSet pretrained), extracting dense, semantically rich **2,048-dimensional embedding vectors**.

---

## Operational Modes

### Mode 1: Physical Room Recognition
- **Classification:** Categorizes environmental noise into 9 ambient archetypes (`car`, `room`, `street`, `cafe`, `party_hall`, `hotel`, `hospital`, `office`, `kitchen`).
- **Acoustic Matching:** Queries the user's registered rooms in ChromaDB collection `"rooms"`.
- **Cosine Threshold:** Matches rooms with cosine similarity $\ge 0.85$.

### Mode 2: Solar System Acoustic Explorer
- **Celestial Targets:**
  - `moon`: Apollo ALSEP Passive Seismic Experiment (ringing bell body waves).
  - `mars`: InSight SEIS & Perseverance SuperCam (atmospheric wind gusts & ground tremors).
  - `jupiter`: Juno Waves instrument (magnetospheric whistler emissions & bow shock crossings).
  - `saturn_enceladus`: Cassini RPWS (ring particle micro-dust impacts & cryovolcanic plumes).
  - `voyager_interstellar`: Voyager 1 & 2 Plasma Wave System (interstellar electron plasma oscillations).
  - `chandra_sonification`: Chandra X-ray Observatory (Perseus black hole relativistic pressure waves).
- **Dual Neural Heads:**
  - `BodyClassifier`: 6-class softmax predictor over the 2,048-dim PANNs space.
  - `TypeClassifier`: 2-class softmax predictor (`recorded` vs `sonified`).
- **High-Dimensional Similarity Search:** Top-3 nearest celestial neighbor lookup from ChromaDB `"space_clips"`.
- **Live Ingestion & Retraining:** Immediate embedding upsert on upload; admin-gated full dataset retraining with `audiomentations`.

---

## The Science: Physical Audio vs. Astronomical Sonification

Sound is a mechanical pressure wave requiring a physical medium (gas, liquid, solid) to propagate. Because interplanetary and interstellar space is an ultra-high vacuum (~5 particles/cm³), audible sound cannot travel across space to human ears.

Our catalog bridges two distinct scientific paradigms:
1. **🎙️ Recorded Audio:** Direct physical sensor measurements where waves traveled through a medium:
   - *Moon:* Apollo seismometers recorded body and surface waves ringing through dry fractured lunar anorthosite crust.
   - *Mars:* InSight seismometer & Perseverance SuperCam microphone captured physical wind vortex pressure variations in Mars' 6-mbar carbon dioxide atmosphere.
2. **📡 Sonified Data:** Data-to-audio translations of electromagnetic or energetic phenomena:
   - *Juno & Cassini:* Electric dipole antennas recorded lightning-induced whistlers and plasma waves in planetary magnetospheres, sonified directly into audible frequencies.
   - *Voyager 1 & 2:* PWS antennas captured plasma oscillations in the very local interstellar medium beyond the heliopause.
3. **The Chandra Perseus Black Hole Nuance:**
   Unlike arbitrary sonifications that map pixel coordinates to musical notes, Chandra's sonification of the **Perseus Galaxy Cluster supermassive black hole** represents **real, physically detected acoustic sound waves**. Relativistic jets from the black hole displace hot intracluster gas, generating concentric acoustic ripples. This represents a real musical B-flat 57 octaves below middle C (period of 9.6 million years). NASA scientists scaled these radial pressure waves up by 57 octaves so they can be heard by human ears.

### Official Archival Data Sources
- [NASA Public Domain Sounds Library](https://www.nasa.gov/connect/sounds/index.html)
- [NASA Historical Sounds Archive](https://soundcloud.com/nasa)
- [Chandra: A Universe of Sound](https://chandra.si.edu/sound/)

> *Educational Disclaimer:* All audio clips are curated archival releases from NASA, JPL-Caltech, ESA, and the Chandra X-ray Center. They are used here for educational and machine learning demonstration without implying NASA/Chandra endorsement.

---

## Dataset Size Disclosure & Evaluation Note

Due to the limited number of archival acoustic releases from extraterrestrial missions:
- **Real Archival Clips:** 1 reference sample per celestial body (6 total).
- **Data Augmentation (`audiomentations`):** 3.0s temporal windowing with 1.0s stride, generating 3 variants per window (PitchShift $\pm 2$ semitones, TimeStretch $0.9\times-1.1\times$, Gaussian Noise Injection).
- **Total Augmented Samples:** 72 samples (58 train / 14 validation).
- **Validation Reliability:** High validation accuracy ($100\%$) reflects robust pattern memorization within the known celestial cluster distributions. Out-of-distribution acoustic recordings will rely on cosine similarity search in ChromaDB rather than pure softmax overconfidence.

---

## Setup & Execution

### 1. Requirements
- Node.js v18+ (tested on Node v25)
- Python 3.10+ (tested on Python 3.11 with CUDA support)
- MongoDB running on `localhost:27017`
- ChromaDB running on `localhost:8000` (or local disk fallback in `chroma_data/`)

### 2. Environment Variables
Create `backend/.env`:
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/sonic_fingerprints
CHROMA_URL=http://localhost:8000
ML_SERVICE_URL=http://localhost:8002
JWT_SECRET=super_secret_jwt_key_2026
```

### 3. Running Services Locally

#### ML Service (Python / FastAPI)
```bash
cd ml-service
python -m uvicorn app:app --host 0.0.0.0 --port 8002
```

#### Backend API Gateway (Node.js / Express)
```bash
cd backend
npm install
npm run dev
```

#### Frontend (React / Vite)
```bash
cd frontend
npm install
npm run dev
```

### 4. Running with Docker Compose
```bash
docker-compose up --build
```

---

## API Reference

### Backend Gateway (`http://localhost:5001`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service statuses (backend, mongo, chroma, ml-service) |
| `GET` | `/api/modes` | None | Status of Room Recognition & Solar System Explorer |
| `POST` | `/auth/register` | None | Register new user account |
| `POST` | `/auth/login` | None | Login and receive signed JWT token |
| `POST` | `/room/register` | JWT | Register new room fingerprint |
| `POST` | `/room/classify` | JWT | Classify environmental noise (5 classes) |
| `POST` | `/room/match` | JWT | Match audio against user's registered rooms |
| `GET` | `/room/list` | JWT | List user's registered rooms |
| `GET` | `/room/history` | JWT | User classification & match history |
| `GET` | `/space/clips` | None | Catalog of space audio clips (supports `?body=` & `?audio_type=`) |
| `GET` | `/space/audio/:clipId`| None | Streams WAV/MP3 telemetry audio |
| `POST` | `/space/classify` | None | Dual-head classification (Body & Type) + Spectrogram |
| `POST` | `/space/similarity`| None | Top-3 nearest celestial acoustic matches in ChromaDB |
| `POST` | `/space/ingest` | JWT | Upload audio + metadata into ChromaDB & MongoDB |
| `POST` | `/space/retrain` | JWT | Retrain classification heads on updated dataset |
| `GET` | `/space/model-info` | None | Current model version and training checkpoint info |
| `GET` | `/space/recent-ingestions` | None | Feed of 10 most recent ingested clips |

---

## Test Suites

```bash
# Part A: Dataset preparation, augmentation, and reporting
cd ml-service && python prep_space_data.py

# Part B: MongoDB & ChromaDB Space Clips Seeding
cd backend && node src/scripts/seedSpaceClips.js

# Mode 1 End-to-End Test Suite
node test_e2e_room_recognition.js

# Mode 2 End-to-End Test Suite
node test_e2e_space_explorer.js

# Comprehensive System Error Handling & Integration Test
node test_full_integration.js
```
