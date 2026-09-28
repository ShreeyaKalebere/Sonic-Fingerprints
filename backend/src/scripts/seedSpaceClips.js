/**
 * Seeding Script for Space Audio Clips:
 * Scans /data/space/{body}/*.json and associated audio clips,
 * syncs them to MongoDB (SpaceClip) and ChromaDB ("space_clips").
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const mongoose = require('mongoose');

const SpaceClip = require('../models/SpaceClip');
const { connectMongoDB } = require('../config/db');

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8002').replace(/\/+$/, '');
const SPACE_DATA_DIR = path.resolve(__dirname, '../../../data/space');
const ALL_BODIES = ['moon', 'mars', 'jupiter', 'saturn_enceladus', 'voyager_interstellar', 'chandra_sonification'];
const AUDIO_EXTS = ['.wav', '.mp3', '.ogg', '.flac', '.m4a'];

const DEFAULT_AUDIO_TYPES = {
  moon: 'recorded',
  mars: 'recorded',
  jupiter: 'sonified',
  saturn_enceladus: 'sonified',
  voyager_interstellar: 'sonified',
  chandra_sonification: 'sonified'
};

async function seedSpaceClips() {
  console.log('='.repeat(70));
  console.log('SEEDING SPACE CLIPS (MONGODB & CHROMADB)');
  console.log('Data Directory:', SPACE_DATA_DIR);
  console.log('='.repeat(70));

  await connectMongoDB();

  let totalFilesFound = 0;
  let seededCount = 0;

  for (const body of ALL_BODIES) {
    const bodyDir = path.join(SPACE_DATA_DIR, body);
    if (!fs.existsSync(bodyDir)) {
      continue;
    }

    const files = fs.readdirSync(bodyDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!AUDIO_EXTS.includes(ext)) {
        continue;
      }

      totalFilesFound++;
      const audioPath = path.join(bodyDir, file);
      const jsonPath = path.join(bodyDir, file.replace(ext, '.json'));
      const altJsonPath = audioPath + '.json';

      let meta = {};
      const targetJson = fs.existsSync(jsonPath) ? jsonPath : (fs.existsSync(altJsonPath) ? altJsonPath : null);

      if (targetJson) {
        try {
          meta = JSON.parse(fs.readFileSync(targetJson, 'utf-8'));
        } catch (e) {
          console.warn(`[Warning] Invalid JSON in ${targetJson}: ${e.message}`);
        }
      }

      const chromaId = `${body}__${file}`;
      const audioType = meta.audio_type || DEFAULT_AUDIO_TYPES[body] || 'sonified';

      const clipData = {
        mission: meta.mission || `Archival ${body.toUpperCase()} Exploration`,
        body: body,
        instrument: meta.instrument || 'Acoustic / Plasma Sensor',
        date: meta.date || 'unknown',
        description: meta.description || `Space acoustic telemetry from ${body}.`,
        audio_type: audioType,
        source_url: meta.source_url || 'https://www.nasa.gov',
        license_note: meta.license_note || 'NASA public domain / see source_url for terms',
        filename: file,
        chroma_id: chromaId
      };

      // Upsert into MongoDB
      await SpaceClip.findOneAndUpdate(
        { chroma_id: chromaId },
        clipData,
        { upsert: true, new: true }
      );
      seededCount++;
      console.log(`  [Seeded MongoDB] -> ${chromaId} (${clipData.mission})`);
    }
  }

  // Trigger ChromaDB sync via ML service
  console.log('\n[ChromaDB] Syncing ChromaDB "space_clips" collection via ML service...');
  try {
    const chromaSyncRes = await axios.post(`${ML_SERVICE_URL}/space/seed-clips`, {}, { timeout: 45000 });
    console.log(`  -> ChromaDB Status: ${chromaSyncRes.data.status}`);
    console.log(`  -> Total Indexed in ChromaDB: ${chromaSyncRes.data.total_collection_count}`);
  } catch (err) {
    console.log(`  -> ML Service ChromaDB sync note: ${err.message} (Will sync when ML service is active)`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`SEEDING COMPLETE: ${seededCount} clips seeded into MongoDB (${totalFilesFound} audio files found).`);
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

seedSpaceClips().catch((err) => {
  console.error('[Error] Seeding failed:', err);
  process.exit(1);
});
