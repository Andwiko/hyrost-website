const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed', 'filled'], default: 'open' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        applicationDate: { type: Date, default: Date.now },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        message: String
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);