const Friend = require('../models/Friend');
const User = require('../models/User');

// Send friend request
exports.sendRequest = async (req, res) => {
    try {
        // Check if users are already friends or request exists
        const existingRequest = await Friend.findOne({
            $or: [
                { requester: req.user.id, recipient: req.body.recipient },
                { requester: req.body.recipient, recipient: req.user.id }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({ 
                error: 'Friend request already exists or users are already friends' 
            });
        }

        const friendRequest = new Friend({
            requester: req.user.id,
            recipient: req.body.recipient,
            status: 0
        });

        await friendRequest.save();
        res.status(201).json(friendRequest);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Respond to friend request
exports.respondToRequest = async (req, res) => {
    try {
        const request = await Friend.findOne({
            _id: req.params.id,
            recipient: req.user.id
        });

        if (!request) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        request.status = req.body.status; // 1 for accepted, 2 for declined
        request.updatedAt = Date.now();
        await request.save();

        res.json(request);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get user's friends
exports.getFriends = async (req, res) => {
    try {
        const friends = await Friend.find({
            $or: [
                { requester: req.user.id, status: 1 },
                { recipient: req.user.id, status: 1 }
            ]
        }).populate('requester recipient', 'username avatar');

        res.json(friends);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get pending friend requests
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await Friend.find({
            recipient: req.user.id,
            status: 0
        }).populate('requester', 'username avatar');

        res.json(requests);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Remove friend
exports.removeFriend = async (req, res) => {
    try {
        const friend = await Friend.findOneAndDelete({
            $or: [
                { requester: req.user.id, recipient: req.params.id },
                { requester: req.params.id, recipient: req.user.id }
            ],
            status: 1
        });

        if (!friend) {
            return res.status(404).json({ error: 'Friend relationship not found' });
        }

        res.json({ message: 'Friend removed successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
