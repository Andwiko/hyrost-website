const mongoose = require('mongoose');

const FormSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fields: [{
    label: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['text', 'textarea', 'select', 'checkbox', 'radio'],
      required: true
    },
    options: [{ type: String }],
    required: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Form', FormSchema);