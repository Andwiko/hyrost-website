const mongoose = require('mongoose');

const InfractionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    staffId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: {
        type: String,
        enum: ['warning', 'mute', 'kick', 'ban', 'note'],
        required: true
    },
    reason: { type: String, required: true },
    duration: { type: String }, // e.g. "1d", "2w", "permanent"
    active: { type: Boolean, default: true },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Infraction', InfractionSchema);
