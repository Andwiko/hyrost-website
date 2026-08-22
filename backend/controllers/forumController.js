const pool = require("../config/mysql");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const filterContent = async (text) => {
    try {
        let cleanText = escapeHTML(text);
        const [rows] = await pool.execute("SELECT word FROM banned_words");
        rows.forEach(row => {
            const regex = new RegExp(`\\b${row.word}\\b`, 'gi');
            cleanText = cleanText.replace(regex, '*'.repeat(row.word.length));
        });
        return cleanText;
    } catch (err) {
        return escapeHTML(text);
    }
};

// Role hierarchy: Admin > VIP > Member > Guest
const ROLE_LEVELS = { 'Admin': 4, 'VIP': 3, 'Member': 2, 'Guest': 1 };

const getRoleLevel = (role) => ROLE_LEVELS[role] || 1;

// Category permission map — minimum role level required to POST
const CATEGORY_POST_PERMISSIONS = {
    'General':      2, // Member+
    'Guides':       2, // Member+
    'Announcement': 3, // VIP+
    'VIP-Lounge':   3, // VIP+
    'Game-Updates': 3, // VIP+
    'Economy':      2, // Member+
    'Minecraft':    2, // Member+
    'Report':       2, // Member+
};

const canPostInCategory = (role, category) => {
    const required = CATEGORY_POST_PERMISSIONS[category] ?? 2;
    return getRoleLevel(role) >= required;
};

// Max image size per role (bytes)
const MAX_IMAGE_SIZE = {
    'Admin': 5 * 1024 * 1024,
    'VIP':   2 * 1024 * 1024,
    'Member':1 * 1024 * 1024,
};

const getImageSizeLimit = (role) => MAX_IMAGE_SIZE[role] ?? MAX_IMAGE_SIZE['Member'];

// ─── SCHEMA INIT ──────────────────────────────────────────────────────────────

exports.initForumDB_Internal = async () => {
    console.log("DEBUG: Running initForumDB_Internal (v2 — role-based)...");

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS threads (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            user_id      INT NOT NULL,
            title        VARCHAR(255) NOT NULL,
            content      TEXT NOT NULL,
            category     VARCHAR(100) DEFAULT 'General',
            tags         VARCHAR(500) DEFAULT '',
            image_url    LONGTEXT DEFAULT NULL,
            status       VARCHAR(50) DEFAULT 'active',
            is_pinned    TINYINT(1) DEFAULT 0,
            views        INT DEFAULT 0,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS replies (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            thread_id  INT NOT NULL,
            user_id    INT NOT NULL,
            content    TEXT NOT NULL,
            image_url  LONGTEXT DEFAULT NULL,
            likes      INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS votes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            thread_id  INT NOT NULL,
            user_id    INT NOT NULL,
            vote_type  ENUM('up', 'down') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vote (thread_id, user_id),
            FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
        )
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS reply_likes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            reply_id   INT NOT NULL,
            user_id    INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_reply_like (reply_id, user_id),
            FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE
        )
    `);

    // Try to add new columns if upgrading from old schema
    const alterQueries = [
        "ALTER TABLE threads ADD COLUMN IF NOT EXISTS tags VARCHAR(500) DEFAULT ''",
        "ALTER TABLE threads ADD COLUMN IF NOT EXISTS image_url LONGTEXT DEFAULT NULL",
        "ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_pinned TINYINT(1) DEFAULT 0",
        "ALTER TABLE threads ADD COLUMN IF NOT EXISTS views INT DEFAULT 0",
        "ALTER TABLE replies ADD COLUMN IF NOT EXISTS image_url LONGTEXT DEFAULT NULL",
        "ALTER TABLE replies ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0",
    ];

    for (const q of alterQueries) {
        try { await pool.execute(q); } catch (_) {}
    }

    console.log("DEBUG: initForumDB_Internal v2 completed successfully");
};

exports.initForumDB = async (req, res) => {
    try {
        await exports.initForumDB_Internal();
        res.json({ message: "Forum tables (v2) initialized successfully — role-based system active" });
    } catch (error) {
        res.status(500).json({ message: "Failed to init forum tables", error: error.message });
    }
};

// ─── CREATE THREAD ────────────────────────────────────────────────────────────

exports.createThread = async (req, res) => {
    try {
        const { title, content, category, tags, image_url } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role || 'Member';

        // Role-based category permission check
        if (!canPostInCategory(userRole, category)) {
            return res.status(403).json({
                message: `Kategori "${category}" hanya bisa diposting oleh ${
                    category === 'VIP-Lounge' || category === 'Announcement' || category === 'Game-Updates' ? 'VIP atau Admin' : 'Member ke atas'
                }.`
            });
        }

        // Validate image size if provided
        if (image_url && image_url.length > getImageSizeLimit(userRole)) {
            return res.status(400).json({ message: `Ukuran gambar melebihi batas untuk role ${userRole}.` });
        }

        const cleanTitle   = await filterContent(title);
        const cleanContent = await filterContent(content);
        const cleanTags    = tags ? tags.substring(0, 500) : '';

        const [result] = await pool.execute(
            "INSERT INTO threads (user_id, title, content, category, tags, image_url) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, cleanTitle, cleanContent, category || 'General', cleanTags, image_url || null]
        );

        res.status(201).json({
            id: result.insertId,
            title: cleanTitle,
            message: "Thread berhasil dibuat"
        });
    } catch (error) {
        console.error("CREATE THREAD ERROR:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── UPDATE THREAD ────────────────────────────────────────────────────────────

exports.updateThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, tags, image_url } = req.body;
        const userId   = req.user.id;
        const userRole = req.user.role || 'Member';

        const [threads] = await pool.execute("SELECT * FROM threads WHERE id = ?", [id]);
        if (threads.length === 0) return res.status(404).json({ message: "Thread tidak ditemukan" });

        const thread = threads[0];
        if (thread.user_id !== userId && userRole !== 'Admin') {
            return res.status(403).json({ message: "Tidak punya akses untuk mengedit thread ini" });
        }

        if (category && !canPostInCategory(userRole, category)) {
            return res.status(403).json({ message: `Kategori "${category}" tidak diizinkan untuk role Anda.` });
        }

        const cleanTitle   = title   ? await filterContent(title)   : thread.title;
        const cleanContent = content ? await filterContent(content) : thread.content;
        const newCategory  = category || thread.category;
        const newTags      = tags !== undefined ? tags.substring(0, 500) : thread.tags;
        const newImageUrl  = image_url !== undefined ? image_url : thread.image_url;

        await pool.execute(
            "UPDATE threads SET title = ?, content = ?, category = ?, tags = ?, image_url = ? WHERE id = ?",
            [cleanTitle, cleanContent, newCategory, newTags, newImageUrl, id]
        );

        res.json({ message: "Thread diperbarui", title: cleanTitle, content: cleanContent });
    } catch (error) {
        console.error("UPDATE THREAD ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── DELETE THREAD ────────────────────────────────────────────────────────────

exports.deleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const userId   = req.user.id;
        const userRole = req.user.role || 'Member';

        const [threads] = await pool.execute("SELECT * FROM threads WHERE id = ?", [id]);
        if (threads.length === 0) return res.status(404).json({ message: "Thread tidak ditemukan" });
        if (threads[0].user_id !== userId && userRole !== 'Admin') {
            return res.status(403).json({ message: "Tidak punya akses untuk menghapus thread ini" });
        }

        await pool.execute("DELETE FROM threads WHERE id = ?", [id]);
        res.json({ message: "Thread berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── PIN / UNPIN THREAD (Admin only) ─────────────────────────────────────────

exports.pinThread = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role || 'Member';

        if (userRole !== 'Admin') {
            return res.status(403).json({ message: "Hanya Admin yang bisa mempin thread." });
        }

        const [threads] = await pool.execute("SELECT is_pinned FROM threads WHERE id = ?", [id]);
        if (threads.length === 0) return res.status(404).json({ message: "Thread tidak ditemukan" });

        const newPinState = threads[0].is_pinned ? 0 : 1;
        await pool.execute("UPDATE threads SET is_pinned = ? WHERE id = ?", [newPinState, id]);

        res.json({
            message: newPinState ? "Thread berhasil dipin" : "Thread berhasil diunpin",
            is_pinned: newPinState
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── LIST THREADS ─────────────────────────────────────────────────────────────

exports.listThreads = async (req, res) => {
    try {
        const { category, sort, search } = req.query;

        let whereClause = "WHERE t.status = 'active'";
        const params = [];

        if (category && category !== 'all') {
            whereClause += " AND t.category = ?";
            params.push(category);
        }

        if (search) {
            whereClause += " AND (t.title LIKE ? OR t.content LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        let orderClause = "ORDER BY t.is_pinned DESC, t.created_at DESC";
        if (sort === 'popular') orderClause = "ORDER BY t.is_pinned DESC, vote_score DESC, t.created_at DESC";
        if (sort === 'unanswered') orderClause = "ORDER BY t.is_pinned DESC, reply_count ASC, t.created_at DESC";
        if (sort === 'views') orderClause = "ORDER BY t.is_pinned DESC, t.views DESC";

        const [rows] = await pool.execute(`
            SELECT
                t.id, t.user_id, t.title, t.content, t.category, t.tags, t.image_url,
                t.status, t.is_pinned, t.views, t.created_at, t.updated_at,
                u.username, u.avatar_url, u.role as user_role,
                rl.badge_text, rl.badge_color,
                (SELECT COUNT(*) FROM replies r WHERE r.thread_id = t.id) AS reply_count,
                (SELECT IFNULL(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0)
                 FROM votes v WHERE v.thread_id = t.id) AS vote_score
            FROM threads t
            LEFT JOIN users u  ON t.user_id = u.id
            LEFT JOIN roles rl ON u.role = rl.name
            ${whereClause}
            ${orderClause}
            LIMIT 100
        `, params);

        res.json(rows);
    } catch (error) {
        console.error("LIST THREADS ERROR:", error);

        if (error.code === 'ER_NO_SUCH_TABLE' || (error.message && error.message.includes("doesn't exist"))) {
            try {
                await exports.initForumDB_Internal();
                return res.json([]);
            } catch (initErr) {
                return res.status(500).json({ message: 'Server error: Table missing', error: initErr.message });
            }
        }

        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── GET THREAD DETAILS ───────────────────────────────────────────────────────

exports.getThreadDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        try {
            await pool.execute("UPDATE threads SET views = views + 1 WHERE id = ?", [id]);
        } catch (_) {}

        const [threads] = await pool.execute(`
            SELECT t.*, u.username, u.avatar_url, u.role as user_role,
                   rl.badge_text, rl.badge_color,
                   (SELECT IFNULL(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0)
                    FROM votes v WHERE v.thread_id = t.id) AS vote_score
            FROM threads t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN roles rl ON u.role = rl.name
            WHERE t.id = ?
        `, [id]);

        if (threads.length === 0) return res.status(404).json({ message: "Thread tidak ditemukan" });

        const [replies] = await pool.execute(`
            SELECT r.*,
                   u.username, u.avatar_url, u.role as user_role,
                   rl.badge_text, rl.badge_color,
                   (SELECT COUNT(*) FROM reply_likes rl2 WHERE rl2.reply_id = r.id) AS like_count
            FROM replies r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN roles rl ON u.role = rl.name
            WHERE r.thread_id = ?
            ORDER BY r.created_at ASC
        `, [id]);

        res.json({ thread: threads[0], replies });
    } catch (error) {
        console.error("GET THREAD DETAILS ERROR:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── LIST CATEGORIES ──────────────────────────────────────────────────────────

exports.listCategories = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT category, COUNT(*) AS thread_count
            FROM threads
            WHERE status = 'active'
            GROUP BY category
            ORDER BY thread_count DESC
        `);

        const defaultCategories = [
            { category: 'General',      thread_count: 0, icon: 'fa-comments', color: '#6366f1' },
            { category: 'Announcement', thread_count: 0, icon: 'fa-bullhorn',  color: '#ef4444' },
            { category: 'Guides',       thread_count: 0, icon: 'fa-book',      color: '#10b981' },
            { category: 'Economy',      thread_count: 0, icon: 'fa-coins',     color: '#f59e0b' },
            { category: 'Game-Updates', thread_count: 0, icon: 'fa-code-branch', color: '#06b6d4' },
            { category: 'VIP-Lounge',   thread_count: 0, icon: 'fa-star',      color: '#ffd700' },
            { category: 'Report',       thread_count: 0, icon: 'fa-flag',      color: '#ef4444' },
            { category: 'Minecraft',    thread_count: 0, icon: 'fa-cube',      color: '#84cc16' },
        ];

        // Merge DB counts into defaults
        const catMap = {};
        rows.forEach(r => { catMap[r.category] = r.thread_count; });
        defaultCategories.forEach(d => {
            if (catMap[d.category] !== undefined) d.thread_count = catMap[d.category];
        });

        res.json(defaultCategories);
    } catch (error) {
        res.json([
            { category: 'General',      thread_count: 0, icon: 'fa-comments',  color: '#6366f1' },
            { category: 'Announcement', thread_count: 0, icon: 'fa-bullhorn',   color: '#ef4444' },
            { category: 'Guides',       thread_count: 0, icon: 'fa-book',       color: '#10b981' },
            { category: 'Economy',      thread_count: 0, icon: 'fa-coins',      color: '#f59e0b' },
            { category: 'Game-Updates', thread_count: 0, icon: 'fa-code-branch',color: '#06b6d4' },
            { category: 'VIP-Lounge',   thread_count: 0, icon: 'fa-star',       color: '#ffd700' },
            { category: 'Report',       thread_count: 0, icon: 'fa-flag',       color: '#ef4444' },
            { category: 'Minecraft',    thread_count: 0, icon: 'fa-cube',       color: '#84cc16' },
        ]);
    }
};

// ─── REPLY THREAD ─────────────────────────────────────────────────────────────

exports.replyThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, image_url } = req.body;
        const userId   = req.user.id;
        const userRole = req.user.role || 'Member';

        if (!content) return res.status(400).json({ message: "Isi balasan tidak boleh kosong" });

        // Validate image size
        if (image_url && image_url.length > getImageSizeLimit(userRole)) {
            return res.status(400).json({ message: `Ukuran gambar melebihi batas untuk role ${userRole}.` });
        }

        const cleanContent = await filterContent(content);

        const [result] = await pool.execute(
            "INSERT INTO replies (thread_id, user_id, content, image_url) VALUES (?, ?, ?, ?)",
            [id, userId, cleanContent, image_url || null]
        );

        res.status(201).json({ id: result.insertId, content: cleanContent, message: "Balasan berhasil dikirim" });
    } catch (error) {
        console.error("REPLY THREAD ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── VOTE THREAD ──────────────────────────────────────────────────────────────

exports.voteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body;
        const userId = req.user.id;

        if (!['up', 'down'].includes(voteType)) return res.status(400).json({ message: "Vote tidak valid" });

        const [existing] = await pool.execute(
            "SELECT * FROM votes WHERE thread_id = ? AND user_id = ?", [id, userId]
        );

        if (existing.length > 0) {
            if (existing[0].vote_type === voteType) {
                await pool.execute("DELETE FROM votes WHERE id = ?", [existing[0].id]);
                return res.json({ message: "Vote dihapus", status: 'cleared' });
            } else {
                await pool.execute("UPDATE votes SET vote_type = ? WHERE id = ?", [voteType, existing[0].id]);
                return res.json({ message: "Vote diperbarui", status: 'updated' });
            }
        } else {
            await pool.execute("INSERT INTO votes (thread_id, user_id, vote_type) VALUES (?, ?, ?)", [id, userId, voteType]);
            return res.json({ message: "Vote berhasil", status: 'added' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── LIKE REPLY ───────────────────────────────────────────────────────────────

exports.likeReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const userId = req.user.id;

        const [existing] = await pool.execute(
            "SELECT * FROM reply_likes WHERE reply_id = ? AND user_id = ?", [replyId, userId]
        );

        if (existing.length > 0) {
            await pool.execute("DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?", [replyId, userId]);
            return res.json({ message: "Like dihapus", liked: false });
        } else {
            await pool.execute("INSERT INTO reply_likes (reply_id, user_id) VALUES (?, ?)", [replyId, userId]);
            return res.json({ message: "Reply disukai", liked: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── DELETE REPLY (owner or Admin) ───────────────────────────────────────────

exports.deleteReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const userId   = req.user.id;
        const userRole = req.user.role || 'Member';

        const [replies] = await pool.execute("SELECT * FROM replies WHERE id = ?", [replyId]);
        if (replies.length === 0) return res.status(404).json({ message: "Balasan tidak ditemukan" });
        if (replies[0].user_id !== userId && userRole !== 'Admin') {
            return res.status(403).json({ message: "Tidak punya akses untuk menghapus balasan ini" });
        }

        await pool.execute("DELETE FROM replies WHERE id = ?", [replyId]);
        res.json({ message: "Balasan berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── GET POSTING PERMISSIONS (for frontend role check) ───────────────────────

exports.getPermissions = async (req, res) => {
    const userRole = req.user ? req.user.role || 'Member' : 'Guest';

    const permissions = {
        role: userRole,
        can_post_general:      canPostInCategory(userRole, 'General'),
        can_post_announcement: canPostInCategory(userRole, 'Announcement'),
        can_post_vip_lounge:   canPostInCategory(userRole, 'VIP-Lounge'),
        can_post_game_updates: canPostInCategory(userRole, 'Game-Updates'),
        can_pin:               userRole === 'Admin',
        can_moderate:          userRole === 'Admin',
        max_image_bytes:       getImageSizeLimit(userRole),
        allowed_categories:    Object.keys(CATEGORY_POST_PERMISSIONS).filter(cat =>
            canPostInCategory(userRole, cat)
        )
    };

    res.json(permissions);
};

exports.listUserBadges = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM roles ORDER BY id ASC");
        res.json(rows);
    } catch (e) {
        res.json([]);
    }
};
