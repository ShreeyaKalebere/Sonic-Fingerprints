const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sonic_fingerprints';

/**
 * Placeholder MongoDB Connection Handler.
 * Initializes connection to MongoDB without enforcing schemas yet.
 */
async function connectMongoDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[MongoDB] Connected successfully to ${MONGO_URI}`);
    return { status: 'connected', uri: MONGO_URI };
  } catch (error) {
    console.warn(`[MongoDB] Connection warning (running in degraded mode): ${error.message}`);
    return { status: 'disconnected', error: error.message, uri: MONGO_URI };
  }
}

function getMongoStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  const stateCode = mongoose.connection.readyState;
  return {
    stateCode,
    status: states[stateCode] || 'unknown',
    uri: MONGO_URI,
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || null
  };
}

module.exports = {
  connectMongoDB,
  getMongoStatus
};
