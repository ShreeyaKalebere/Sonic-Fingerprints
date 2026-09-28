const express = require('express');
const router = express.Router();
const { getMongoStatus } = require('../config/db');
const { checkChromaConnection } = require('../config/chroma');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8002';

async function checkMLService() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${ML_SERVICE_URL.replace(/\/+$/, '')}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { status: 'connected', url: ML_SERVICE_URL, data };
    }
    return { status: 'error', statusCode: res.status, url: ML_SERVICE_URL };
  } catch (err) {
    return { status: 'disconnected', url: ML_SERVICE_URL, error: err.message };
  }
}

router.get('/health', async (req, res) => {
  const mongo = getMongoStatus();
  let chroma = await checkChromaConnection();
  const mlService = await checkMLService();

  // If standalone Chroma HTTP is not running but ML service has ChromaDB connected
  if (chroma.status !== 'connected' && mlService?.data?.databases?.chromadb?.status === 'connected') {
    chroma = {
      status: 'connected',
      mode: 'embedded_ml_service',
      heartbeat: mlService.data.databases.chromadb.heartbeat
    };
  }

  const isDegraded = mongo.status !== 'connected' || chroma.status !== 'connected' || mlService.status !== 'connected';

  res.status(200).json({
    status: isDegraded ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      backend: { status: 'running', uptime: process.uptime() },
      mongodb: mongo,
      chromadb: chroma,
      mlService: mlService
    }
  });
});

module.exports = router;
