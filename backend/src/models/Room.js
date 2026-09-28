const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  room_name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true
  },
  chroma_id: {
    type: String,
    required: [true, 'ChromaDB vector ID is required']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Composite index to facilitate fast queries per user
roomSchema.index({ user_id: 1, room_name: 1 });

module.exports = mongoose.model('Room', roomSchema);
