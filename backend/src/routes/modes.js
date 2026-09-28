const express = require('express');
const router = express.Router();

/**
 * Returns available system modes and their operational parameters.
 */
router.get('/modes', (req, res) => {
  res.json({
    modes: [
      {
        id: 'room-recognition',
        name: 'Room Recognition',
        description: 'Identify and classify physical rooms and architectural acoustic signatures from ambient noise.',
        features: [
          'Ambient acoustic impulse response analysis',
          'Room reverberation and modal frequency extraction',
          'Acoustic fingerprint matching against spatial database'
        ],
        status: 'active'
      },
      {
        id: 'solar-system-explorer',
        name: 'Solar System Acoustic Explorer',
        description: 'Explore and classify real NASA and Chandra sonified planetary and deep space data.',
        targets: [
          'Moon (Apollo seismic)',
          'Mars (InSight SEIS & Perseverance)',
          'Jupiter (Juno Plasma Waves)',
          'Saturn & Enceladus (Cassini RPWS)',
          'Voyager (Interstellar plasma)',
          'Chandra (Deep Space X-ray sonification)'
        ],
        features: [
          'Space audio spectrogram analysis (128 Mel bands)',
          'Cosmic acoustic vector embeddings (2048-dim PANNs backbone)',
          'Planetary acoustic similarity indexing in ChromaDB'
        ],
        status: 'active'
      }
    ],
    sharedPipeline: {
      melBands: 128,
      backbone: 'PANNs (Cnn14 AudioSet)',
      embeddingDimension: 2048,
      sampleRate: 32000,
      windowDuration: '5.0s'
    }
  });
});

module.exports = router;
