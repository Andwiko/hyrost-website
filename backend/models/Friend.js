const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
    requester: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    status: {
        type: Number,
        enums: [
            0,    // 'pending'
            1,    // 'accepted'
            2,    // 'declined'
            3     // 'blocked'
        ],
        default: 0
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Friend', FriendSchema);
