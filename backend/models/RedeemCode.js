const mongoose = require('mongoose');

const redeemCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    rewardCommand: {
        type: String,
        required: true,
        // Example: "give %player% diamond 1"
    },
    maxUses: {
        type: Number,
        default: 1
    },
    usedBy: [{
        type: String // We will store Minecraft UUIDs here
    }],
    expiresAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Check if code is valid for a specific user
redeemCodeSchema.methods.isValid = function(uuid) {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    if (this.usedBy.length >= this.maxUses) return false;
    if (this.usedBy.includes(uuid)) return false; // Already redeemed by this user
    return true;
};

module.exports = mongoose.model('RedeemCode', redeemCodeSchema);
