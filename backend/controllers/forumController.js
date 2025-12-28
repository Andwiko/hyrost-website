const pool = require("../config/mysql");

// Helper: Filter Banned Words
const filterContent = async (text) => {
    try {
        const [rows] = await pool.execute("SELECT word FROM banned_words");
        let filteredText = text;
        rows.forEach(row => {
            const regex = new RegExp(`\\b${row.word}\\b`, 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(row.word.length));
        });
        return filteredText;
    } catch (err) {
        return text;
    }
};

// SQL-Based Forum Controller
exports.createThread = async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const userId = req.user.id;

        const cleanTitle = await filterContent(title);
        const cleanContent = await filterContent(content);

        const [result] = await pool.execute(
            "INSERT INTO threads (user_id, title, content, category) VALUES (?, ?, ?, ?)",
            [userId, cleanTitle, cleanContent, category || 'General']
        );

        res.status(201).json({ id: result.insertId, title: cleanTitle, content: cleanContent, message: "Thread created" });
    } catch (error) {
        console.error("CREATE THREAD ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category } = req.body;
        const userId = req.user.id;

        // Check ownership
        const [threads] = await pool.execute("SELECT * FROM threads WHERE id = ?", [id]);
        if (threads.length === 0) return res.status(404).json({ message: "Thread not found" });
        if (threads[0].user_id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const cleanTitle = title ? await filterContent(title) : threads[0].title;
        const cleanContent = content ? await filterContent(content) : threads[0].content;
        const newCategory = category || threads[0].category;

        await pool.execute(
            "UPDATE threads SET title = ?, content = ?, category = ? WHERE id = ?",
            [cleanTitle, cleanContent, newCategory, id]
        );

        res.json({ message: "Thread updated", title: cleanTitle, content: cleanContent, category: newCategory });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check ownership
        const [threads] = await pool.execute("SELECT * FROM threads WHERE id = ?", [id]);
        if (threads.length === 0) return res.status(404).json({ message: "Thread not found" });
        if (threads[0].user_id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await pool.execute("DELETE FROM threads WHERE id = ?", [id]);
        res.json({ message: "Thread deleted" });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.listThreads = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                t.*, 
                u.username, 
                u.avatar_url,
                rl.badge_text,
                rl.badge_color,
                (SELECT COUNT(*) FROM replies r WHERE r.thread_id = t.id) as reply_count,
                (SELECT IFNULL(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) 
                 FROM votes v WHERE v.thread_id = t.id) as vote_score
            FROM threads t 
            LEFT JOIN users u ON t.user_id = u.id 
            LEFT JOIN roles rl ON u.role = rl.name
            ORDER BY t.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("LIST THREADS ERROR:", error);
        
        // Auto-fix if table is missing
        if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
            console.log("DEBUG: Table missing detected. Attempting auto-init...");
            try {
                await exports.initForumDB_Internal();
                // Retry once
                const [rowsRetry] = await pool.execute(`
                    SELECT t.*, u.username, u.avatar_url,
                    (SELECT COUNT(*) FROM replies r WHERE r.thread_id = t.id) as reply_count,
                    (SELECT IFNULL(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) FROM votes v WHERE v.thread_id = t.id) as vote_score
                    FROM threads t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC
                `);
                return res.json(rowsRetry);
            } catch (initErr) {
                return res.status(500).json({ message: 'Server error: Table missing and auto-init failed', error: initErr.message });
            }
        }
        
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Internal version of initDB (helper)
exports.initForumDB_Internal = async () => {
    console.log("DEBUG: Running initForumDB_Internal...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS threads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            category VARCHAR(100) DEFAULT 'General',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS replies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            thread_id INT NOT NULL,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS votes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            thread_id INT NOT NULL,
            user_id INT NOT NULL,
            vote_type ENUM('up', 'down') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vote (thread_id, user_id),
            FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log("DEBUG: initForumDB_Internal completed successfully");
};

exports.getThreadDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch thread
        const [threads] = await pool.execute(`
            SELECT t.*, u.username, u.avatar_url, rl.badge_text, rl.badge_color
            FROM threads t 
            JOIN users u ON t.user_id = u.id 
            LEFT JOIN roles rl ON u.role = rl.name
            WHERE t.id = ?
        `, [id]);
        
        if (threads.length === 0) return res.status(404).json({ message: "Thread not found" });
        
        // Fetch replies
        const [replies] = await pool.execute(`
            SELECT r.*, u.username, u.avatar_url, rl.badge_text, rl.badge_color 
            FROM replies r 
            JOIN users u ON r.user_id = u.id 
            LEFT JOIN roles rl ON u.role = rl.name
            WHERE r.thread_id = ? 
            ORDER BY r.created_at ASC
        `, [id]);
        
        res.json({
            thread: threads[0],
            replies: replies
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.listCategories = async (req, res) => {
    res.json(['General', 'Announcement', 'Question', 'Economy', 'Minecraft']);
};

// Placeholder for remaining features (Replies/Votes) if needed for SQL
// SQL-Based Features
exports.replyThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) return res.status(400).json({ message: "Content is required" });

        const cleanContent = await filterContent(content);

        const [result] = await pool.execute(
            "INSERT INTO replies (thread_id, user_id, content) VALUES (?, ?, ?)",
            [id, userId, cleanContent]
        );

        res.status(201).json({ id: result.insertId, content: cleanContent, message: "Reply added" });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.voteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 'up' or 'down'
        const userId = req.user.id;

        if (!['up', 'down'].includes(voteType)) return res.status(400).json({ message: "Invalid vote type" });

        // Check existing vote
        const [existing] = await pool.execute("SELECT * FROM votes WHERE thread_id = ? AND user_id = ?", [id, userId]);

        if (existing.length > 0) {
            if (existing[0].vote_type === voteType) {
                // Toggle off
                await pool.execute("DELETE FROM votes WHERE id = ?", [existing[0].id]);
                return res.json({ message: "Vote removed", status: 'cleared' });
            } else {
                // Update vote
                await pool.execute("UPDATE votes SET vote_type = ? WHERE id = ?", [voteType, existing[0].id]);
                return res.json({ message: "Vote updated", status: 'updated' });
            }
        } else {
            // New vote
            await pool.execute("INSERT INTO votes (thread_id, user_id, vote_type) VALUES (?, ?, ?)", [id, userId, voteType]);
            return res.json({ message: "Vote recorded", status: 'added' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.listUserBadges = async (req, res) => {
    // Basic implementation for now
    res.json([]);
};

// Emergency: Manual Init DB for Forum
exports.initForumDB = async (req, res) => {
    try {
        await exports.initForumDB_Internal();
        res.json({ message: "Forum tables (threads, replies, votes) initialized successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to init forum tables", error: error.message });
    }
};
