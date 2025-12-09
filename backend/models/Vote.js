const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    targetType: { 
        type: String, 
        enum: ['thread', 'reply', 'suggestion'], 
        required: true 
    },
    targetId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'targetType'
    },
    value: { 
        type: Number, 
        enum: [1, -1], // 1 untuk upvote, -1 untuk downvote
        required: true 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vote', VoteSchema);
