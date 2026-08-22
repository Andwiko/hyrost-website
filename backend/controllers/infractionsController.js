const pool = require('../config/mysql');

// Create new infraction
exports.createInfraction = async (req, res) => {
    try {
        const { userId, type, reason, duration } = req.body;
        const staffId = req.user.id;

        let expiresAt = null;
        if (duration && duration !== 'permanent') {
            const value = parseInt(duration.slice(0, -1));
            const unit = duration.slice(-1);
            let milliseconds = 0;
            switch (unit) {
                case 'm': milliseconds = value * 60 * 1000; break;
                case 'h': milliseconds = value * 60 * 60 * 1000; break;
                case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
                case 'w': milliseconds = value * 7 * 24 * 60 * 60 * 1000; break;
            }
            if (milliseconds > 0) {
                expiresAt = new Date(Date.now() + milliseconds);
            }
        }

        const [result] = await pool.execute(
            'INSERT INTO infractions (user_id, staff_id, type, reason, duration, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [userId, staffId, type, reason, duration || null, expiresAt]
        );

        res.status(201).json({
            id: result.insertId,
            userId,
            staffId,
            type,
            reason,
            duration,
            expiresAt,
            isActive: true
        });
    } catch (error) {
        console.error('CREATE INFRACTION ERROR:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user's infractions
exports.getUserInfractions = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const [rows] = await pool.execute(
            `SELECT i.*, u.username as staff_name 
             FROM infractions i 
             JOIN users u ON i.staff_id = u.id 
             WHERE i.user_id = ? 
             ORDER BY i.created_at DESC`,
            [targetUserId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update infraction status
exports.updateInfraction = async (req, res) => {
    try {
        const infractionId = req.params.id;
        const { active } = req.body;

        const [result] = await pool.execute(
            'UPDATE infractions SET is_active = ? WHERE id = ?',
            [active ? 1 : 0, infractionId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Infraction not found' });
        }

        res.json({ message: 'Infraction status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Check for active infractions
exports.checkActiveInfractions = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const [rows] = await pool.execute(
            `SELECT * FROM infractions 
             WHERE user_id = ? AND is_active = TRUE 
               AND (expires_at IS NULL OR expires_at > NOW())`,
            [targetUserId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
