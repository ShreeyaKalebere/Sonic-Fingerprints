const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  mode: {
    type: String,
    enum: ['classify', 'match'],
    required: [true, 'Mode is required']
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  audio_duration: {
    type: Number,
    default: null
  }
});

module.exports = mongoose.model('History', historySchema);
