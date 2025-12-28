// controllers/minecraftController.js

/**
 * Handle status update from Minecraft Plugin
 * POST /api/minecraft/status
 */
exports.updateStatus = async (req, res) => {
    try {
        const { server, status, playerCount, maxPlayers } = req.body;
        
        console.log('Received status update from Minecraft:', req.body);

        // Here you could save this to the database, update a global cache, etc.
        // For now, we'll just log it.
        
        // Example: Update global variable or in-memory cache
        global.minecraftStatus = {
            online: true,
            playerCount: playerCount || 0,
            maxPlayers: maxPlayers || 0,
            lastUpdated: new Date()
        };

        return res.status(200).json({ 
            success: true, 
            message: 'Status updated successfully' 
        });
        
    } catch (error) {
        console.error('Error in updateStatus:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Get current server status
 * GET /api/minecraft/status
 */
exports.getStatus = async (req, res) => {
    try {
        // Return the stored status or a default offline message
        const status = global.minecraftStatus || { online: false };
        
        // Check if status is stale (older than 1 minute)
        if (status.lastUpdated && (new Date() - status.lastUpdated > 60000)) {
            status.online = false;
        }

        return res.json(status);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching status' });
    }
};

/**
 * Redeem a code for a player
 * POST /api/minecraft/redeem
 */
const RedeemCode = require('../models/RedeemCode');

exports.redeemCode = async (req, res) => {
    try {
        const { code, uuid, username } = req.body;

        if (!code || !uuid) {
            return res.status(400).json({ success: false, message: 'Missing code or uuid' });
        }

        const redeemCode = await RedeemCode.findOne({ code: code.toUpperCase() });

        if (!redeemCode) {
            return res.status(404).json({ success: false, message: 'Invalid code' });
        }

        // Validate code
        if (!redeemCode.isActive) {
            return res.status(400).json({ success: false, message: 'Code is inactive' });
        }
        
        if (redeemCode.expiresAt && new Date() > redeemCode.expiresAt) {
            return res.status(400).json({ success: false, message: 'Code has expired' });
        }

        if (redeemCode.usedBy.length >= redeemCode.maxUses) {
            return res.status(400).json({ success: false, message: 'Code fully redeemed' });
        }

        if (redeemCode.usedBy.includes(uuid)) {
            return res.status(400).json({ success: false, message: 'You have already redeemed this code' });
        }

        // Success! Mark as used
        redeemCode.usedBy.push(uuid);
        await redeemCode.save();

        console.log(`Player ${username} (${uuid}) redeemed code ${code}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Code redeemed successfully!',
            rewardCommand: redeemCode.rewardCommand
        });

    } catch (error) {
        console.error('Error in redeemCode:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
