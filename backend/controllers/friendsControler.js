// backend/controllers/friendsControler.js
const pool = require('../config/mysql');

// Simple rate limiter tracking for friend requests: Map<userId, Array<timestamp>>
const requestRateLimits = new Map();

function checkRateLimit(userId) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Periodic cleanup of rate limits to prevent memory leaks
    if (Math.random() < 0.1) {
        for (const [key, list] of requestRateLimits.entries()) {
            const active = list.filter(t => (now - t) < oneHour);
            if (active.length === 0) {
                requestRateLimits.delete(key);
            } else {
                requestRateLimits.set(key, active);
            }
        }
    }
    
    let userTimestamps = requestRateLimits.get(userId) || [];
    
    // Filter timestamps within the last hour
    userTimestamps = userTimestamps.filter(t => (now - t) < oneHour);
    if (userTimestamps.length >= 20) {
        return false; // Limit exceeded
    }
    
    userTimestamps.push(now);
    requestRateLimits.set(userId, userTimestamps);
    return true;
}

// Helper to sanitize error response and log actual error
function handleControllerError(res, error, logMessage) {
    console.error(`[ERROR] ${logMessage}:`, error);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan internal pada server' });
}

// ─── GET FRIENDS (ACCEPTED) ──────────────────────────────────────────────────
exports.getFriends = async (req, res) => {
    try {
        const userId = req.user.id;

        const [friends] = await pool.execute(
            `SELECT f.id as friendship_id, u.id as friend_id, u.username, u.avatar_url, u.role, u.created_at, f.created_at as friends_since
             FROM friends f
             JOIN users u ON (CASE WHEN f.requester_id = ? THEN f.recipient_id ELSE f.requester_id END) = u.id
             WHERE (f.requester_id = ? OR f.recipient_id = ?) AND f.status = 1 AND u.deleted_at IS NULL
             ORDER BY u.username ASC`,
            [userId, userId, userId]
        );

        res.json({ success: true, friends });
    } catch (error) {
        return handleControllerError(res, error, 'GET FRIENDS');
    }
};

// ─── GET PENDING INCOMING REQUESTS ───────────────────────────────────────────
exports.getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const [requests] = await pool.execute(
            `SELECT f.id as request_id, u.id as requester_id, u.username, u.avatar_url, u.role, f.created_at
             FROM friends f
             JOIN users u ON f.requester_id = u.id
             WHERE f.recipient_id = ? AND f.status = 0 AND u.deleted_at IS NULL
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json({ success: true, requests });
    } catch (error) {
        return handleControllerError(res, error, 'GET PENDING REQUESTS');
    }
};

// ─── GET SENT OUTGOING REQUESTS ──────────────────────────────────────────────
exports.getSentRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const [requests] = await pool.execute(
            `SELECT f.id as request_id, u.id as recipient_id, u.username, u.avatar_url, u.role, f.created_at
             FROM friends f
             JOIN users u ON f.recipient_id = u.id
             WHERE f.requester_id = ? AND f.status = 0 AND u.deleted_at IS NULL
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json({ success: true, requests });
    } catch (error) {
        return handleControllerError(res, error, 'GET SENT REQUESTS');
    }
};

// ─── SEND FRIEND REQUEST ─────────────────────────────────────────────────────
exports.sendRequest = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const { recipient, username } = req.body; // Can pass recipient ID or username

        let targetId = recipient;

        // If username provided, look up recipient ID
        if (!targetId && username) {
            const [users] = await pool.execute(
                'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL',
                [username.trim()]
            );
            if (users.length === 0) {
                return res.status(404).json({ error: 'Pengguna dengan username tersebut tidak ditemukan' });
            }
            targetId = users[0].id;
        }

        if (!targetId) {
            return res.status(400).json({ error: 'Username atau ID penerima harus diisi' });
        }

        targetId = parseInt(targetId);
        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'ID penerima tidak valid' });
        }

        if (requesterId === targetId) {
            return res.status(400).json({ error: 'Anda tidak dapat menambahkan diri sendiri sebagai teman' });
        }

        // Verify recipient user exists and is active
        const [targetUser] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
            [targetId]
        );
        if (targetUser.length === 0) {
            return res.status(404).json({ error: 'Pengguna tujuan tidak ditemukan atau sudah dihapus' });
        }

        // Rate limiting check
        if (!checkRateLimit(requesterId)) {
            return res.status(429).json({ error: 'Batas pengiriman pertemanan tercapai (Maksimal 20 per jam). Coba lagi nanti.' });
        }

        // Check if either user has blocked the other
        const [blocks] = await pool.execute(
            `SELECT * FROM blocked_users 
             WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
            [requesterId, targetId, targetId, requesterId]
        );

        if (blocks.length > 0) {
            return res.status(403).json({ error: 'Tidak dapat mengirim permintaan pertemanan ke pengguna ini' });
        }

        // Check existing friendship / pending request
        const [existing] = await pool.execute(
            `SELECT * FROM friends 
             WHERE (requester_id = ? AND recipient_id = ?) 
                OR (requester_id = ? AND recipient_id = ?)`,
            [requesterId, targetId, targetId, requesterId]
        );

        if (existing.length > 0) {
            const status = existing[0].status;
            if (status === 1) {
                return res.status(400).json({ error: 'Anda sudah berteman dengan pengguna ini' });
            } else if (status === 0) {
                return res.status(400).json({ error: 'Permintaan pertemanan sudah dikirim sebelumnya' });
            }
        }

        // Create new friend request (status 0 = pending)
        const [result] = await pool.execute(
            'INSERT INTO friends (requester_id, recipient_id, status) VALUES (?, ?, 0)',
            [requesterId, targetId]
        );

        res.status(201).json({
            success: true,
            message: 'Permintaan pertemanan berhasil dikirim',
            requestId: result.insertId,
            recipientId: targetId
        });
    } catch (error) {
        return handleControllerError(res, error, 'SEND FRIEND REQUEST');
    }
};

// ─── RESPOND TO REQUEST (1 = ACCEPT, 2 = DECLINE) ───────────────────────────
exports.respondToRequest = async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const recipientId = req.user.id;
        const { status } = req.body; // 1 for accepted, 2 for declined

        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'ID permintaan tidak valid' });
        }

        if (![1, 2].includes(parseInt(status))) {
            return res.status(400).json({ error: 'Status tidak valid (1 = Terima, 2 = Tolak)' });
        }

        const [requests] = await pool.execute(
            'SELECT * FROM friends WHERE id = ? AND recipient_id = ? AND status = 0',
            [requestId, recipientId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Permintaan pertemanan tidak ditemukan' });
        }

        if (parseInt(status) === 1) {
            await pool.execute('UPDATE friends SET status = 1 WHERE id = ?', [requestId]);
            res.json({ success: true, message: 'Permintaan pertemanan diterima' });
        } else {
            // If declined, delete the request record to allow re-requesting later
            await pool.execute('DELETE FROM friends WHERE id = ?', [requestId]);
            res.json({ success: true, message: 'Permintaan pertemanan ditolak' });
        }
    } catch (error) {
        return handleControllerError(res, error, 'RESPOND TO FRIEND REQUEST');
    }
};

// ─── CANCEL SENT REQUEST ─────────────────────────────────────────────────────
exports.cancelRequest = async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const requesterId = req.user.id;

        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'ID permintaan tidak valid' });
        }

        const [result] = await pool.execute(
            'DELETE FROM friends WHERE id = ? AND requester_id = ? AND status = 0',
            [requestId, requesterId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Permintaan pertemanan tidak ditemukan atau sudah diproses' });
        }

        res.json({ success: true, message: 'Permintaan pertemanan berhasil dibatalkan' });
    } catch (error) {
        return handleControllerError(res, error, 'CANCEL FRIEND REQUEST');
    }
};

// ─── REMOVE FRIEND ───────────────────────────────────────────────────────────
exports.removeFriend = async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.id);

        if (isNaN(friendId)) {
            return res.status(400).json({ error: 'ID teman tidak valid' });
        }

        const [result] = await pool.execute(
            `DELETE FROM friends 
             WHERE ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)) 
               AND status = 1`,
            [userId, friendId, friendId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Hubungan pertemanan tidak ditemukan' });
        }

        res.json({ success: true, message: 'Teman berhasil dihapus' });
    } catch (error) {
        return handleControllerError(res, error, 'REMOVE FRIEND');
    }
};

// ─── BLOCK USER ──────────────────────────────────────────────────────────────
exports.blockUser = async (req, res) => {
    try {
        const blockerId = req.user.id;
        const targetId = parseInt(req.params.id);

        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'ID target tidak valid' });
        }

        if (blockerId === targetId) {
            return res.status(400).json({ error: 'Anda tidak dapat memblokir diri sendiri' });
        }

        // Verify target user exists
        const [targetUser] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
            [targetId]
        );
        if (targetUser.length === 0) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        }

        // Check if already blocked
        const [existing] = await pool.execute(
            'SELECT * FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
            [blockerId, targetId]
        );

        if (existing.length === 0) {
            await pool.execute(
                'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
                [blockerId, targetId]
            );
        }

        // Delete any existing friendship or friend request
        await pool.execute(
            `DELETE FROM friends 
             WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)`,
            [blockerId, targetId, targetId, blockerId]
        );

        res.json({ success: true, message: 'Pengguna berhasil diblokir' });
    } catch (error) {
        return handleControllerError(res, error, 'BLOCK USER');
    }
};

// ─── UNBLOCK USER ────────────────────────────────────────────────────────────
exports.unblockUser = async (req, res) => {
    try {
        const blockerId = req.user.id;
        const targetId = parseInt(req.params.id);

        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'ID target tidak valid' });
        }

        await pool.execute(
            'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
            [blockerId, targetId]
        );

        res.json({ success: true, message: 'Pemblokiran pengguna telah dibuka' });
    } catch (error) {
        return handleControllerError(res, error, 'UNBLOCK USER');
    }
};

// ─── GET BLOCKED USERS ───────────────────────────────────────────────────────
exports.getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        const [blocked] = await pool.execute(
            `SELECT b.id as block_id, u.id as user_id, u.username, u.avatar_url, b.created_at
             FROM blocked_users b
             JOIN users u ON b.blocked_id = u.id
             WHERE b.blocker_id = ? AND u.deleted_at IS NULL
             ORDER BY b.created_at DESC`,
            [userId]
        );

        res.json({ success: true, blocked });
    } catch (error) {
        return handleControllerError(res, error, 'GET BLOCKED USERS');
    }
};

// ─── SEARCH USERS FOR FRIENDSHIP ─────────────────────────────────────────────
exports.searchUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = req.query.q ? req.query.q.trim() : '';

        if (!query || query.length < 2) {
            return res.json({ success: true, users: [] });
        }

        // Secure query: exclude any users who blocked us or are blocked by us
        const [users] = await pool.execute(
            `SELECT u.id, u.username, u.avatar_url, u.role
             FROM users u
             WHERE u.username LIKE ? 
               AND u.id != ? 
               AND u.deleted_at IS NULL
               AND u.id NOT IN (
                   SELECT blocked_id FROM blocked_users WHERE blocker_id = ?
                   UNION
                   SELECT blocker_id FROM blocked_users WHERE blocked_id = ?
               )
             LIMIT 15`,
            [`%${query}%`, userId, userId, userId]
        );

        // Fetch friendship statuses for each search result
        const usersWithStatus = await Promise.all(users.map(async (u) => {
            const [rel] = await pool.execute(
                `SELECT * FROM friends 
                 WHERE (requester_id = ? AND recipient_id = ?) 
                    OR (requester_id = ? AND recipient_id = ?)`,
                [userId, u.id, u.id, userId]
            );

            let friendshipStatus = 'none'; // 'none', 'friend', 'sent_pending', 'received_pending'
            let requestId = null;

            if (rel.length > 0) {
                requestId = rel[0].id;
                if (rel[0].status === 1) {
                    friendshipStatus = 'friend';
                } else if (rel[0].requester_id === userId) {
                    friendshipStatus = 'sent_pending';
                } else {
                    friendshipStatus = 'received_pending';
                }
            }

            return {
                id: u.id,
                username: u.username,
                avatar_url: u.avatar_url,
                role: u.role,
                friendship_status: friendshipStatus,
                request_id: requestId
            };
        }));

        res.json({ success: true, users: usersWithStatus });
    } catch (error) {
        return handleControllerError(res, error, 'SEARCH USERS');
    }
};

// ─── GET FRIENDSHIP STATUS WITH SPECIFIC USER ────────────────────────────────
exports.getFriendshipStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = parseInt(req.params.userId);

        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'ID user tidak valid' });
        }

        const [rel] = await pool.execute(
            `SELECT * FROM friends 
             WHERE (requester_id = ? AND recipient_id = ?) 
                OR (requester_id = ? AND recipient_id = ?)`,
            [userId, targetId, targetId, userId]
        );

        let status = 'none';
        let requestId = null;

        if (rel.length > 0) {
            requestId = rel[0].id;
            if (rel[0].status === 1) status = 'friend';
            else if (rel[0].requester_id === userId) status = 'sent_pending';
            else status = 'received_pending';
        }

        res.json({ success: true, status, requestId });
    } catch (error) {
        return handleControllerError(res, error, 'GET FRIENDSHIP STATUS');
    }
};
