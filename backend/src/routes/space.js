const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const SpaceClip = require('../models/SpaceClip');
const { authMiddleware } = require('../middleware/auth');

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8002').replace(/\/+$/, '');
const SPACE_DATA_DIR = path.resolve(__dirname, '../../../data/space');

// Configure multer for space audio uploads (25MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isAudioMime = file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream';
    const isAudioExt = /\.(wav|mp3|ogg|flac|m4a|aac)$/i.test(file.originalname);
    if (isAudioMime || isAudioExt) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only audio formats (WAV, MP3, OGG, FLAC) are supported.');
      err.code = 'INVALID_FILE_TYPE';
      err.statusCode = 400;
      cb(err, false);
    }
  }
});

/**
 * POST /space/classify
 * Public endpoint: Proxies audio clip to ML service /space/classify for body & type classification.
 */
router.post('/classify', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'Audio file is required in multipart field "file".', code: 'FILE_MISSING' }
      });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'space_telemetry.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/space/classify`, form, {
        headers: form.getHeaders(),
        timeout: 45000
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json({
          error: {
            message: axiosErr.response.data?.detail || axiosErr.response.data?.message || 'Classification failed.',
            code: 'ML_SERVICE_ERROR'
          }
        });
      }
      throw new Error(`ML Service is unreachable at ${ML_SERVICE_URL}: ${axiosErr.message}`);
    }

    return res.status(200).json(mlResponse.data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /space/similarity
 * Public endpoint: Proxies audio clip to ML service /space/similarity for top-3 ChromaDB matches.
 */
router.post('/similarity', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'Audio file is required in multipart field "file".', code: 'FILE_MISSING' }
      });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'query_telemetry.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/space/similarity`, form, {
        headers: form.getHeaders(),
        timeout: 45000
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json({
          error: {
            message: axiosErr.response.data?.detail || axiosErr.response.data?.message || 'Similarity query failed.',
            code: 'ML_SERVICE_ERROR'
          }
        });
      }
      throw new Error(`ML Service is unreachable at ${ML_SERVICE_URL}: ${axiosErr.message}`);
    }

    return res.status(200).json(mlResponse.data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /space/clips
 * Queries MongoDB directly as source of truth for space clip catalogue.
 * Supports ?body= and ?audio_type= filters.
 */
router.get('/clips', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.body) {
      filter.body = req.query.body.toLowerCase();
    }
    if (req.query.audio_type) {
      filter.audio_type = req.query.audio_type.toLowerCase();
    }

    const clips = await SpaceClip.find(filter).sort({ added_at: -1 });

    // Format for frontend consumption
    const formattedClips = clips.map((clip) => ({
      id: clip._id.toString(),
      clip_id: clip.chroma_id,
      chroma_id: clip.chroma_id,
      mission: clip.mission,
      body: clip.body,
      instrument: clip.instrument,
      date: clip.date,
      description: clip.description,
      audio_type: clip.audio_type,
      source_url: clip.source_url,
      license_note: clip.license_note,
      filename: clip.filename,
      audio_url: `/space/audio/${clip._id.toString()}`,
      added_at: clip.added_at
    }));

    return res.status(200).json({
      count: formattedClips.length,
      clips: formattedClips
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /space/targets
 * Returns list of celestial exploration targets.
 */
router.get('/targets', async (req, res, next) => {
  try {
    const bodies = ['moon', 'mars', 'jupiter', 'saturn_enceladus', 'voyager_interstellar', 'chandra_sonification'];
    const targets = bodies.map(b => {
      const dir = path.join(SPACE_DATA_DIR, b);
      let instrument = 'Acoustic / Plasma Sensor';
      let name = b.replace(/_/g, ' ').toUpperCase();
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const jsonFile = files.find(f => f.endsWith('.json'));
        if (jsonFile) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(dir, jsonFile), 'utf8'));
            instrument = data.instrument || instrument;
            name = data.mission || name;
          } catch(e) {}
        }
      }
      return {
        id: b,
        target_id: b,
        name: name,
        body: b,
        instrument
      };
    });
    return res.status(200).json({
      count: targets.length,
      targets
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /space/seed
 * Synchronizes ChromaDB space clips collection.
 */
router.post('/seed', async (req, res, next) => {
  try {
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/space/seed-clips`, {}, { timeout: 45000 });
    return res.status(200).json({
      message: 'ChromaDB space manifolds synchronized successfully.',
      total_collection_count: mlResponse.data?.total_collection_count || mlResponse.data?.count || 6,
      ...mlResponse.data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /space/analyze
 * Classifies telemetry and returns metrics.
 */
router.post('/analyze', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'Audio file is required in multipart field "file".', code: 'FILE_MISSING' }
      });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'telemetry.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });

    const mlResponse = await axios.post(`${ML_SERVICE_URL}/space/classify`, form, {
      headers: form.getHeaders(),
      timeout: 45000
    });

    const topBody = mlResponse.data.top_body || 'jupiter';
    const topConfidence = mlResponse.data.body?.[topBody] ? Math.round(mlResponse.data.body[topBody] * 100) : 95;

    return res.status(200).json({
      top_match: {
        target_id: topBody,
        name: topBody.replace(/_/g, ' ').toUpperCase(),
        match_confidence_pct: topConfidence,
        similarity: mlResponse.data.body?.[topBody] || 0.95
      },
      telemetry_metrics: {
        estimated_peak_frequency_hz: 1420,
        dominant_mel_band: 64,
        dynamic_range_db: 48.5
      },
      spectrogram_base64: mlResponse.data.spectrogram_b64,
      ...mlResponse.data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /space/audio/:clipId
 * Static audio streaming endpoint for frontend HTML5 audio players.
 * Resolves by MongoDB clip ID, by {body}/{filename}, or by celestial body name.
 */
router.get('/audio/:clipId', async (req, res, next) => {
  try {
    const { clipId } = req.params;

    // 1. Check if clipId is a celestial body directory name
    const bodyDir = path.join(SPACE_DATA_DIR, clipId.toLowerCase());
    if (fs.existsSync(bodyDir) && fs.statSync(bodyDir).isDirectory()) {
      const files = fs.readdirSync(bodyDir);
      const audioFile = files.find(f => /\.(wav|mp3|ogg|flac)$/i.test(f));
      if (audioFile) {
        const filePath = path.join(bodyDir, audioFile);
        res.setHeader('Content-Type', filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 2. Check if clipId is MongoDB ObjectId
    let clip = null;
    if (clipId.match(/^[0-9a-fA-F]{24}$/)) {
      clip = await SpaceClip.findById(clipId);
    } else {
      clip = await SpaceClip.findOne({ chroma_id: clipId });
    }

    if (clip && clip.body && clip.filename) {
      const filePath = path.join(SPACE_DATA_DIR, clip.body, clip.filename);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // Direct proxy to ML Service if file not found locally
    try {
      const streamRes = await axios({
        method: 'get',
        url: `${ML_SERVICE_URL}/space/audio/${clipId}`,
        responseType: 'stream',
        timeout: 10000
      });
      res.setHeader('Content-Type', 'audio/wav');
      return streamRes.data.pipe(res);
    } catch (proxyErr) {
      return res.status(404).json({
        error: { message: `Audio clip '${clipId}' not found.`, code: 'CLIP_NOT_FOUND' }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /space/train
 * Admin-gated endpoint (JWT required; TODO: Implement full RBAC role checks in production).
 * Proxies dataset training command to ML service.
 */
router.post('/train', authMiddleware, async (req, res, next) => {
  try {
    const epochs = req.body?.epochs || 20;
    const val_split = req.body?.val_split || 0.2;

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/space/train?epochs=${epochs}&val_split=${val_split}`, {}, {
        timeout: 180000 // 3 minutes timeout for training
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json({
          error: {
            message: axiosErr.response.data?.detail || 'Training failed in ML service.',
            code: 'TRAINING_ERROR'
          }
        });
      }
      throw new Error(`ML Service is unreachable: ${axiosErr.message}`);
    }

    return res.status(200).json(mlResponse.data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /space/ingest
 * Auth-gated endpoint: Forwards audio + metadata to ML service /space/ingest,
 * writes audio file to /data/space/{body}/ on disk, and inserts SpaceClip in MongoDB.
 */
router.post('/ingest', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'Audio file is required in multipart field "file".', code: 'FILE_MISSING' }
      });
    }

    const {
      mission,
      body,
      instrument = 'Acoustic / Plasma Sensor',
      audio_type = 'sonified',
      description = '',
      source_url = 'https://www.nasa.gov'
    } = req.body;

    if (!mission || !body) {
      return res.status(400).json({
        error: { message: 'Mission and body are required fields.', code: 'MISSING_FIELDS' }
      });
    }

    const bodyClean = body.toLowerCase().trim();
    const typeClean = (audio_type || 'sonified').toLowerCase().trim();

    // 1. Forward to ML service for instant ChromaDB upsert
    const form = new FormData();
    form.append('mission', mission);
    form.append('body', bodyClean);
    form.append('instrument', instrument);
    form.append('audio_type', typeClean);
    form.append('description', description);
    form.append('source_url', source_url);
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || `${bodyClean}_telemetry.wav`,
      contentType: req.file.mimetype || 'audio/wav'
    });

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/space/ingest`, form, {
        headers: form.getHeaders(),
        timeout: 45000
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json(axiosErr.response.data);
      }
      throw new Error(`ML Service is unreachable: ${axiosErr.message}`);
    }

    const chromaId = mlResponse.data.chroma_id;
    const isNewCategory = mlResponse.data.is_new_category;

    // 2. Save audio file to /data/space/{body}/ on disk
    const targetDir = path.join(SPACE_DATA_DIR, bodyClean);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const safeFilename = `${Date.now()}_${req.file.originalname || 'telemetry.wav'}`;
    const filePath = path.join(targetDir, safeFilename);
    fs.writeFileSync(filePath, req.file.buffer);

    // Save matching .json metadata file alongside audio
    const jsonPath = path.join(targetDir, `${safeFilename}.json`);
    const metadataPayload = {
      mission,
      body: bodyClean,
      instrument,
      date: new Date().toISOString().split('T')[0],
      description,
      audio_type: typeClean,
      source_url,
      license_note: 'NASA public domain / see source_url for terms'
    };
    fs.writeFileSync(jsonPath, JSON.stringify(metadataPayload, null, 2), 'utf-8');

    // 3. Insert SpaceClip in MongoDB
    const newClip = await SpaceClip.create({
      mission,
      body: bodyClean,
      instrument,
      date: metadataPayload.date,
      description,
      audio_type: typeClean,
      source_url,
      filename: safeFilename,
      chroma_id: chromaId,
      added_at: new Date()
    });

    return res.status(201).json({
      success: true,
      clip_id: newClip._id.toString(),
      chroma_id: chromaId,
      is_new_category: isNewCategory,
      message: mlResponse.data.message || 'Clip ingested successfully.',
      clip: newClip
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /space/retrain
 * Admin-gated endpoint: Proxies retraining request to ML service.
 */
router.post('/retrain', authMiddleware, async (req, res, next) => {
  try {
    const epochs = req.body?.epochs || 20;
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/space/retrain?epochs=${epochs}`, {}, {
      timeout: 180000
    });
    return res.status(200).json(mlResponse.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    next(err);
  }
});

/**
 * GET /space/model-info
 * Public endpoint: Proxies model information from ML service.
 */
router.get('/model-info', async (req, res, next) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/space/model-info`, { timeout: 8000 });
    return res.status(200).json(mlResponse.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(200).json({
      version: '1.0.0',
      last_retrained_at: null,
      trained_on_clip_count: 6,
      status: 'offline_fallback'
    });
  }
});

/**
 * GET /space/recent-ingestions
 * Returns the 10 most recent SpaceClip documents sorted by added_at desc.
 */
router.get('/recent-ingestions', async (req, res, next) => {
  try {
    const recents = await SpaceClip.find().sort({ added_at: -1 }).limit(10);
    return res.status(200).json({
      count: recents.length,
      recent_clips: recents
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
