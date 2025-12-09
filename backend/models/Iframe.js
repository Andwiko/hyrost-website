const mongoose = require('mongoose');

const IframeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String },
    width: { type: String, default: '100%' },
    height: { type: String, default: '500px' },
    allowedRoles: [{ type: String }], // Role yang diizinkan mengakses iframe ini
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Iframe', IframeSchema);
