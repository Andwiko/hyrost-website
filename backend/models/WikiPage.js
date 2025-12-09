const mongoose = require('mongoose');

const WikiPageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  lastEditedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  lastEditedAt: { type: Date, default: Date.now },
  isLocked: { type: Boolean, default: false }
});

module.exports = mongoose.model('WikiPage', WikiPageSchema);