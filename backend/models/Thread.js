const mongoose = require('mongoose');

const ThreadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'closed', 'archived'], 
    default: 'active' 
  },
  tags: [{ type: String }],
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  replies: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isStaffReply: { type: Boolean, default: false }
  }]
});

module.exports = mongoose.model('Thread', ThreadSchema);