const Infraction = require('/models/Infraction');
const User = require('../models/User');

// Create new infraction
exports.createInfraction = async (req, res) => {
    try {
        const infraction = new Infraction({
            userId: req.body.userId,
            staffId: req.user.id,
            type: req.body.type,
            reason: req.body.reason,
            duration: req.body.duration,
            active: true
        });

        // Calculate expiration date if duration is provided
        if (req.body.duration && req.body.duration !== 'permanent') {
            const duration = req.body.duration;
            const value = parseInt(duration.slice(0, -1));
            const unit = duration.slice(-1);
            
            let milliseconds;
            switch(unit) {
                case 'm': milliseconds = value * 60 * 1000; break; // minutes
                case 'h': milliseconds = value * 60 * 60 * 1000; break; // hours
                case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break; // days
                case 'w': milliseconds = value * 7 * 24 * 60 * 60 * 1000; break; // weeks
                default: milliseconds = 0;
            }
            
            infraction.expiresAt = new Date(Date.now() + milliseconds);
        }

        await infraction.save();
        res.status(201).json(infraction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get user's infractions
exports.getUserInfractions = async (req, res) => {
    try {
        const infractions = await Infraction.find({ 
            userId: req.params.userId 
        }).populate('staffId', 'username');
        
        res.json(infractions);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update infraction status
exports.updateInfraction = async (req, res) => {
    try {
        const infraction = await Infraction.findOneAndUpdate(
            { _id: req.params.id, staffId: req.user.id },
            { 
                active: req.body.active,
                updatedAt: Date.now() 
            },
            { new: true }
        );

        if (!infraction) {
            return res.status(404).json({ error: 'Infraction not found or unauthorized' });
        }

        res.json(infraction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Check for active infractions
exports.checkActiveInfractions = async (req, res) => {
    try {
        const activeInfractions = await Infraction.find({ 
            userId: req.params.userId,
            active: true,
            $or: [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: null }
            ]
        });
        
        res.json(activeInfractions);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
