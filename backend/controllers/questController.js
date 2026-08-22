const pool = require('../config/mysql');

// Get All Quests & User Progress
exports.getUserQuests = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const [quests] = await pool.execute('SELECT * FROM quests ORDER BY id ASC');
        let claimedQuestIds = [];

        if (userId) {
            const [userQuests] = await pool.execute('SELECT quest_id FROM user_quests WHERE user_id = ?', [userId]);
            claimedQuestIds = userQuests.map(uq => uq.quest_id);
        }

        const formattedQuests = quests.map(q => ({
            ...q,
            is_claimed: claimedQuestIds.includes(q.id)
        }));

        res.json({ success: true, quests: formattedQuests });
    } catch (err) {
        console.error("GET QUESTS ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar misi' });
    }
};

const { coinColumn } = require('../utils/security');
const { checkQuestCompletion } = require('../utils/questValidator');

// Claim Quest Reward
exports.claimQuestReward = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questId } = req.params;

        const [quests] = await pool.execute('SELECT * FROM quests WHERE id = ?', [questId]);
        if (!quests || quests.length === 0) {
            return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
        }

        const quest = quests[0];

        const [already] = await pool.execute('SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?', [userId, quest.id]);
        if (already && already.length > 0) {
            return res.status(400).json({ success: false, message: 'Hadiah misi ini sudah pernah Anda klaim' });
        }

        const validation = await checkQuestCompletion(userId, quest);
        if (!validation.ok) {
            return res.status(400).json({ success: false, message: validation.reason || 'Syarat misi belum terpenuhi' });
        }

        const coinCol = coinColumn(quest.reward_type || 'bronze');
        if (!coinCol) {
            return res.status(400).json({ success: false, message: 'Tipe reward tidak valid' });
        }
        await pool.execute(`UPDATE users SET ${coinCol} = ${coinCol} + ? WHERE id = ?`, [quest.reward_amount, userId]);
        await pool.execute('INSERT INTO user_quests (user_id, quest_id, claimed_at) VALUES (?, ?, NOW())', [userId, quest.id]);

        await pool.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [userId, 'CLAIM_QUEST', `Completed quest "${quest.title}" (+${quest.reward_amount} ${quest.reward_type})`]);

        res.json({
            success: true,
            message: `Selamat! Misi '${quest.title}' selesai. Berhasil mengklaim +${quest.reward_amount} Koin ${quest.reward_type.toUpperCase()}!`,
            rewardType: quest.reward_type,
            rewardAmount: quest.reward_amount
        });
    } catch (err) {
        console.error("CLAIM QUEST ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal mengklaim hadiah misi' });
    }
};

// --- WEB LIVE CHATBOX ---
exports.getLiveChatMessages = async (req, res) => {
    try {
        const sinceId = parseInt(req.query.since || req.query.sinceId || '0', 10);

        if (sinceId > 0) {
            const [rows] = await pool.execute(
                'SELECT * FROM live_chats WHERE id > ? ORDER BY id ASC LIMIT 50',
                [sinceId]
            );
            const lastId = rows.length ? rows[rows.length - 1].id : sinceId;
            return res.json({ success: true, messages: rows, lastChatId: lastId });
        }

        const [rows] = await pool.execute('SELECT * FROM live_chats ORDER BY id DESC LIMIT 30');
        const messages = rows.reverse();
        const lastChatId = messages.length ? messages[messages.length - 1].id : 0;
        res.json({ success: true, messages, lastChatId });
    } catch (err) {
        res.json({ success: true, messages: [], lastChatId: 0 });
    }
};

exports.sendLiveChatMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Pesan obrolan tidak boleh kosong' });
        }

        const [users] = await pool.execute('SELECT username, avatar_url FROM users WHERE id = ?', [userId]);
        const user = users[0] || {};
        const username = user.username || req.user.username || 'Pemain';
        const avatar_url = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=fff`;

        const [result] = await pool.execute(
            'INSERT INTO live_chats (user_id, username, avatar_url, message, created_at) VALUES (?, ?, ?, ?, NOW())',
            [userId, username, avatar_url, message.trim()]
        );

        const chat = {
            id: result.insertId || Date.now(),
            user_id: userId,
            username,
            avatar_url,
            message: message.trim(),
            created_at: new Date().toISOString(),
        };

        try {
            const liveChatBus = require('../utils/liveChatBus');
            liveChatBus.publish({ type: 'chat', message: chat });
        } catch (_) {}

        res.json({
            success: true,
            message: 'Pesan terkirim',
            chat,
            lastChatId: chat.id,
        });
    } catch (err) {
        console.error("SEND CHAT ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal mengirim pesan obrolan' });
    }
};
