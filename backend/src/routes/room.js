const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const { authMiddleware } = require('../middleware/auth');
const Room = require('../models/Room');
const History = require('../models/History');

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8002').replace(/\/+$/, '');

// Configure multer memory storage with 10MB limit and audio-only fileFilter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const isAudioMime = file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream';
    const isAudioExt = /\.(wav|mp3|ogg|flac|m4a|aac|wma)$/i.test(file.originalname);
    if (isAudioMime || isAudioExt) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only audio files (WAV, MP3, OGG, FLAC, M4A) are allowed.');
      err.code = 'INVALID_FILE_TYPE';
      err.statusCode = 400;
      cb(err, false);
    }
  }
});

// Protect all /room routes with auth middleware
router.use(authMiddleware);

/**
 * POST /room/classify
 * Receives audio file, forwards to ml-service /room/classify,
 * saves execution to History, returns classification and spectrogram.
 */
router.post('/classify', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'Audio file is required in multipart field "file".',
          code: 'FILE_MISSING'
        }
      });
    }

    // Build multipart request to ml-service
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'input_audio.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/room/classify`, form, {
        headers: form.getHeaders(),
        timeout: 45000
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json({
          error: {
            message: axiosErr.response.data?.detail || axiosErr.response.data?.message || 'Classification failed in ML service.',
            code: 'ML_SERVICE_ERROR'
          }
        });
      }
      throw new Error(`ML Service is unreachable at ${ML_SERVICE_URL}: ${axiosErr.message}`);
    }

    const resultData = mlResponse.data;

    // Save to History (record mode: classify)
    await History.create({
      user_id: req.user.userId,
      mode: 'classify',
      result: {
        top_label: resultData.top_label,
        classification: resultData.classification
      },
      timestamp: new Date()
    });

    return res.status(200).json(resultData);

  } catch (err) {
    next(err);
  }
});

/**
 * POST /room/match
 * Receives audio file, forwards to ml-service /room/match with user_id,
 * saves match result to History, returns match outcome.
 */
router.post('/match', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'Audio file is required in multipart field "file".',
          code: 'FILE_MISSING'
        }
      });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'query_audio.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });
    form.append('user_id', req.user.userId);

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/room/match`, form, {
        headers: form.getHeaders(),
        timeout: 45000
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json({
          error: {
            message: axiosErr.response.data?.detail || axiosErr.response.data?.message || 'Matching failed in ML service.',
            code: 'ML_SERVICE_ERROR'
          }
        });
      }
      throw new Error(`ML Service is unreachable at ${ML_SERVICE_URL}: ${axiosErr.message}`);
    }

    const resultData = mlResponse.data;

    // Save to History (record mode: match)
    await History.create({
      user_id: req.user.userId,
      mode: 'match',
      result: resultData,
      timestamp: new Date()
    });

    return res.status(200).json(resultData);

  } catch (err) {
    next(err);
  }
});

/**
 * POST /room/register
 * Receives audio file and room_name, forwards to ml-service /room/register,
 * records room in MongoDB Room collection, returns room details.
 */
router.post('/register', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'Audio file is required in multipart field "file".',
          code: 'FILE_MISSING'
        }
      });
    }

    const room_name = (req.body.room_name || '').trim();
    if (!room_name) {
      return res.status(400).json({
        error: {
          message: 'Field "room_name" is required and cannot be empty.',
          code: 'ROOM_NAME_REQUIRED'
        }
      });
    }

    // Check if room name already exists in MongoDB for this user
    const existing = await Room.findOne({
      user_id: req.user.userId,
      room_name: { $regex: new RegExp(`^${room_name}$`, 'i') }
    });
    if (existing) {
      return res.status(409).json({
        error: {
          message: `Room "${room_name}" is already registered for this user.`,
          code: 'ROOM_ALREADY_EXISTS'
        }
      });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'room_sample.wav',
      contentType: req.file.mimetype || 'audio/wav'
    });
    form.append('room_name', room_name);
    form.append('user_id', req.user.userId);

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/room/register`, form, {
        headers: form.getHeaders(),
        timeout: 45000
      });
    } catch (axiosErr) {
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json({
          error: {
            message: axiosErr.response.data?.detail || axiosErr.response.data?.message || 'Room registration failed in ML service.',
            code: 'ML_SERVICE_ERROR'
          }
        });
      }
      throw new Error(`ML Service is unreachable at ${ML_SERVICE_URL}: ${axiosErr.message}`);
    }

    const { room_id } = mlResponse.data;

    // Save to MongoDB Room collection
    const createdRoom = await Room.create({
      user_id: req.user.userId,
      room_name,
      chroma_id: room_id,
      created_at: new Date()
    });

    return res.status(201).json({
      success: true,
      room_id,
      room: {
        id: createdRoom._id.toString(),
        room_name: createdRoom.room_name,
        created_at: createdRoom.created_at
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /room/history
 * Returns paginated history for authenticated user (limit 20, desc by timestamp)
 */
router.get('/history', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      History.find({ user_id: req.user.userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      History.countDocuments({ user_id: req.user.userId })
    ]);

    return res.status(200).json({
      history: items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /room/list
 * Returns all registered rooms for authenticated user
 */
router.get('/list', async (req, res, next) => {
  try {
    const rooms = await Room.find({ user_id: req.user.userId })
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      rooms: rooms.map(r => ({
        id: r._id.toString(),
        room_name: r.room_name,
        chroma_id: r.chroma_id,
        created_at: r.created_at
      }))
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
