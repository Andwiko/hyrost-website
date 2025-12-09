const Vote = require('../models/Vote');
const Thread = require('../models/Thread');
const Suggestion = require('../models/Suggestion');

// Memberikan vote
exports.castVote = async (req, res) => {
    try {
        // Cek apakah user sudah memberikan vote sebelumnya
        const existingVote = await Vote.findOne({
            userId: req.user.id,
            targetType: req.body.targetType,
            targetId: req.body.targetId
        });

        if (existingVote) {
            // Jika vote sama dengan sebelumnya, hapus vote
            if (existingVote.value === req.body.value) {
                await existingVote.remove();
                return res.json({ message: 'Vote dihapus' });
            }
            // Jika vote berbeda, update vote
            existingVote.value = req.body.value;
            await existingVote.save();
            return res.json(existingVote);
        }

        // Jika belum ada vote sebelumnya, buat vote baru
        const vote = new Vote({
            userId: req.user.id,
            targetType: req.body.targetType,
            targetId: req.body.targetId,
            value: req.body.value
        });

        await vote.save();
        res.status(201).json(vote);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Mendapatkan total vote untuk suatu target
exports.getVotes = async (req, res) => {
    try {
        const votes = await Vote.aggregate([
            { $match: { 
                targetType: req.params.targetType,
                targetId: mongoose.Types.ObjectId(req.params.targetId)
            }},
            { $group: {
                _id: null,
                total: { $sum: '$value' },
                upvotes: { $sum: { $cond: [{ $eq: ['$value', 1] }, 1, 0] } },
                downvotes: { $sum: { $cond: [{ $eq: ['$value', -1] }, 1, 0] } }
            }}
        ]);

        const result = votes[0] || { total: 0, upvotes: 0, downvotes: 0 };
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Mendapatkan vote user untuk suatu target
exports.getUserVote = async (req, res) => {
    try {
        const vote = await Vote.findOne({
            userId: req.user.id,
            targetType: req.params.targetType,
            targetId: req.params.targetId
        });

        res.json(vote || { value: 0 });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
