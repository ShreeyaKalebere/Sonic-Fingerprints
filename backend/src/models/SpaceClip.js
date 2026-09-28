const mongoose = require('mongoose');

const SpaceClipSchema = new mongoose.Schema({
  mission: {
    type: String,
    required: [true, 'Mission name is required'],
    trim: true
  },
  body: {
    type: String,
    required: [true, 'Celestial body is required'],
    trim: true,
    lowercase: true
  },
  instrument: {
    type: String,
    default: 'Acoustic / Plasma Sensor',
    trim: true
  },
  date: {
    type: String,
    default: 'unknown'
  },
  description: {
    type: String,
    default: ''
  },
  audio_type: {
    type: String,
    required: [true, 'Audio type is required'],
    enum: ['recorded', 'sonified']
  },
  source_url: {
    type: String,
    default: 'https://www.nasa.gov'
  },
  license_note: {
    type: String,
    default: 'NASA public domain / see source_url for terms'
  },
  filename: {
    type: String,
    default: ''
  },
  chroma_id: {
    type: String,
    required: [true, 'ChromaDB ID is required'],
    unique: true
  },
  added_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SpaceClip', SpaceClipSchema);
