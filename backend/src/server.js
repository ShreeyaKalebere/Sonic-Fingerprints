require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectMongoDB } = require('./config/db');
const healthRoutes = require('./routes/health');
const modesRoutes = require('./routes/modes');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const spaceRoutes = require('./routes/space');
const errorHandler = require('./middleware/errorHandler');

const http = require('http');
const axios = require('axios');
axios.defaults.httpAgent = new http.Agent({ keepAlive: false });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Routes (supported with and without /api prefix)
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Mode 1: Room Recognition Routes (supported with and without /api prefix)
app.use('/room', roomRoutes);
app.use('/api/room', roomRoutes);

// Mode 2: Solar System Acoustic Explorer Routes (supported with and without /api prefix)
app.use('/space', spaceRoutes);
app.use('/api/space', spaceRoutes);

// General & Health Routes
app.use('/api', healthRoutes);
app.use('/api', modesRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    project: 'Sonic Fingerprint & Solar System Acoustic Explorer',
    layer: 'Backend API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      modes: '/api/modes',
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login'
      },
      room: {
        classify: 'POST /room/classify',
        match: 'POST /room/match',
        register: 'POST /room/register',
        history: 'GET /room/history',
        list: 'GET /room/list'
      },
      space: {
        targets: 'GET /space/targets',
        audio: 'GET /space/audio/:target_id',
        analyze: 'POST /space/analyze',
        seed: 'POST /space/seed'
      }
    }
  });
});

// Central Error Handling Middleware (must be after all routes)
app.use(errorHandler);

// Start Server & Initialize Database Connections
async function startServer() {
  await connectMongoDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend API] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Backend API] Healthcheck available at http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('[Backend API] Fatal startup error:', err);
});
