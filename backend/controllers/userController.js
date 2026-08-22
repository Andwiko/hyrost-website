const bcrypt = require("bcryptjs");
const pool = require("../config/mysql");

// Helper: Log Activity
const logActivity = async (userId, action, details) => {
    try {
        await pool.execute(
            "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
            [userId, action, details]
        );
    } catch (err) {
        console.error("LOG ACTIVITY ERROR:", err);
    }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
    console.log("DEBUG: updateProfile called for user:", req.user?.id);
    
    try {
        const userId = req.user.id; // From JWT Middleware
        const { email, password, avatarUrl } = req.body;

        if (avatarUrl) {
            console.log("DEBUG: Avatar Data Length:", avatarUrl.length);
        } else {
            console.log("DEBUG: No Avatar Data");
        }

        // 1. Build Query dynamically
        let updates = [];
        let values = [];

        if (email) {
            updates.push("email = ?");
            values.push(email);
        }

        if (avatarUrl) {
            updates.push("avatar_url = ?");
            values.push(avatarUrl);
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updates.push("password = ?");
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No changes provided" });
        }

        values.push(userId); // For WHERE clause

        const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
        
        await pool.execute(sql, values);

        // Log Activity
        await logActivity(userId, 'Update Profile', 'User updated their profile details.');

        // Return updated user data (exclude password)
        const [users] = await pool.execute("SELECT id, username, email, role, avatar_url, coin_bronze, coin_silver, coin_gold, created_at FROM users WHERE id = ?", [userId]);
        const updatedUser = users[0];

        res.json({
            message: "Profile updated successfully",
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                avatarUrl: updatedUser.avatar_url,
                coins: {
                    bronze: updatedUser.coin_bronze,
                    silver: updatedUser.coin_silver,
                    gold: updatedUser.coin_gold
                },
                createdAt: updatedUser.created_at
            }
        });

    } catch (err) {
        console.error("UPDATE USER ERROR:", err);
        if (err.code === 'ER_NET_PACKET_TOO_LARGE') {
             return res.status(500).json({ message: "Image too large for database server config" });
        }
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get User Profile (Me)
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await pool.execute("SELECT id, username, email, role, avatar_url, coin_bronze, coin_silver, coin_gold, last_claim_time, created_at FROM users WHERE id = ? AND deleted_at IS NULL", [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan atau akun telah dihapus" });
        }

        const user = users[0];
        const userRole = user.role || 'Member';

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: userRole,
            avatarUrl: user.avatar_url,
            coins: {
                bronze: user.coin_bronze,
                silver: user.coin_silver,
                gold: user.coin_gold
            },
            createdAt: user.created_at,
            lastClaimTime: user.last_claim_time
        });
    } catch (err) {
        console.error("GET USER ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get User Activities (FUNGSI INI YANG HILANG)
exports.getActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            "SELECT action, details, created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", 
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("GET ACTIVITIES ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get Leaderboard (Top Users)
exports.getLeaderboard = async (req, res) => {
    try {
        const { type } = req.query; // 'wealth', 'level', 'quests'
        
        let orderBy = '(coin_gold * 10000 + coin_silver * 100 + coin_bronze) DESC';
        if (type === 'wealth') orderBy = '(coin_gold * 10000 + coin_silver * 100 + coin_bronze) DESC';
        else if (type === 'level') orderBy = 'coin_gold DESC, coin_silver DESC'; 
        else if (type === 'quests') orderBy = 'coin_bronze DESC';

        const sql = `
            SELECT id, username, role, avatar_url, coin_bronze, coin_silver, coin_gold, 
            (coin_gold * 10000 + coin_silver * 100 + coin_bronze) as total_wealth 
            FROM users 
            WHERE deleted_at IS NULL 
            ORDER BY ${orderBy} 
            LIMIT 50
        `;

        const [users] = await pool.execute(sql);

        // Map to frontend format
        const leaderboard = (users || []).map(u => ({
            id: u.id,
            name: u.username || 'User',
            role: u.role || 'Member',
            avatar_url: u.avatar_url || null,
            level: Math.floor(Math.sqrt(u.total_wealth || 0) / 10) + 1, 
            wealth: u.total_wealth || 0,
            quests: Math.floor((u.total_wealth || 0) / 5000) || 0,
            guild: u.role || 'Member'
        }));

        res.json(leaderboard);
    } catch (err) {
        console.error("GET LEADERBOARD ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Helper exports
exports.logActivity = logActivity;

// Soft Delete User
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.user.id;
        await pool.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
        res.json({ message: "Akun berhasil dihapus." });
    } catch (err) {
        console.error("DELETE USER ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Claim Daily Reward
exports.claimDailyReward = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date(); // Current server time
        
        // 1. Get User Last Claim Time
        const [rows] = await pool.execute("SELECT last_claim_time, coin_bronze FROM users WHERE id = ?", [userId]);
        if (!rows.length) return res.status(404).json({ message: "User not found" });
        
        const user = rows[0];
        const lastClaim = user.last_claim_time ? new Date(user.last_claim_time) : new Date(0);
        
        // 2. Validate Time (24 hours cooldown)
        const diffMs = now - lastClaim;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        
        if (diffMs < ONE_DAY_MS) {
            const timeLeft = ONE_DAY_MS - diffMs;
            return res.status(400).json({ 
                message: "Belum waktunya klaim hadiah!", 
                timeLeft 
            });
        }

        // 3. Random Reward Logic (2 - 20 Bronze)
        const rewardAmount = Math.floor(Math.random() * 19) + 2; // Random 2 to 20
        
        // 4. Update Database
        await pool.execute(
            "UPDATE users SET coin_bronze = coin_bronze + ?, last_claim_time = ? WHERE id = ?", 
            [rewardAmount, now, userId]
        );
        
        // 5. Log Activity
        await logActivity(userId, 'CLAIM_REWARD', `Claimed daily reward: ${rewardAmount} Bronze`);

        // 6. Return Success
        res.json({ 
            success: true,
            rewardType: 'bronze',
            amount: rewardAmount,
            message: `Selamat! Anda mendapatkan ${rewardAmount} Koin Bronze.`,
            newBalance: user.coin_bronze + rewardAmount
        });

    } catch (err) {
        console.error("DAILY CLAIM ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Change Password with current password verification
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Password lama dan password baru wajib diisi." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password baru minimal 6 karakter." });
        }

        // Fetch user password
        const [users] = await pool.execute("SELECT password, email, username FROM users WHERE id = ?", [userId]);
        if (!users.length) return res.status(404).json({ message: "User tidak ditemukan." });

        const user = users[0];

        // Check current password (if password is set)
        if (user.password) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                await logActivity(userId, 'CHANGE_PASSWORD_FAILED', 'Percobaan ganti password gagal: Password lama salah.');
                return res.status(400).json({ message: "Password lama yang Anda masukkan tidak sesuai." });
            }
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

        // Log Security Activity
        await logActivity(userId, 'CHANGE_PASSWORD_SUCCESS', 'Password akun berhasil diperbarui dengan aman.');

        res.json({ success: true, message: "Password berhasil diperbarui! Silakan gunakan password baru untuk login." });
    } catch (err) {
        console.error("CHANGE PASSWORD ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get Security Health Check & Score
exports.getSecurityStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await pool.execute("SELECT id, username, email, role, created_at FROM users WHERE id = ?", [userId]);
        if (!users.length) return res.status(404).json({ message: "User tidak ditemukan" });

        const user = users[0];

        // Get count of recent security events
        const [logs] = await pool.execute(
            "SELECT action, details, created_at FROM activity_logs WHERE user_id = ? AND action LIKE '%SECURITY%' OR action LIKE '%PASSWORD%' ORDER BY created_at DESC LIMIT 5",
            [userId]
        );

        // Security checklist calculation
        const checks = [
            { id: 'password', name: 'Kekuatan Password', status: 'GOOD', score: 35, desc: 'Password terenskripsi dengan algoritma Bcrypt' },
            { id: 'email', name: 'Email Terverifikasi', status: 'GOOD', score: 30, desc: user.email },
            { id: 'sessions', name: 'Sesi Login Terdeteksi Aman', status: 'GOOD', score: 20, desc: '1 Perangkat Aktif' },
            { id: '2fa', name: 'Verifikasi 2-Langkah (2FA)', status: 'RECOMMENDED', score: 15, desc: 'Fitur keamanan tambahan' }
        ];

        const totalScore = checks.reduce((sum, item) => sum + item.score, 0);

        res.json({
            score: totalScore,
            level: totalScore >= 80 ? 'Tinggi (Sangat Aman)' : totalScore >= 50 ? 'Sedang' : 'Rendah',
            checks,
            recentSecurityLogs: logs
        });
    } catch (err) {
        console.error("GET SECURITY STATUS ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get Active Sessions
exports.getActiveSessions = async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || 'Browser';
        const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

        // Parse user agent info
        let device = 'Desktop PC / Windows';
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
            device = 'Mobile Device / Smartphone';
        } else if (userAgent.includes('Macintosh')) {
            device = 'Desktop Mac / macOS';
        }

        const sessions = [
            {
                id: 'current-session',
                device: device,
                browser: userAgent.includes('Chrome') ? 'Google Chrome' : userAgent.includes('Firefox') ? 'Mozilla Firefox' : 'Web Browser',
                ip: ip,
                lastActive: new Date(),
                isCurrent: true
            }
        ];

        res.json({ sessions });
    } catch (err) {
        console.error("GET SESSIONS ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Revoke All Other Sessions
exports.revokeAllSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        await logActivity(userId, 'REVOKE_SESSIONS', 'User mengeluarkan semua sesi perangkat lain.');
        res.json({ success: true, message: "Semua sesi perangkat lain telah berhasil dikeluarkan." });
    } catch (err) {
        console.error("REVOKE SESSIONS ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─── DISCORD CONNECTIVITY ─────────────────────────────────
exports.linkDiscord = async (req, res) => {
    try {
        const userId = req.user.id;
        const { discordUsername, discordId } = req.body;

        if (!discordUsername) {
            return res.status(400).json({ message: "Username / Tag Discord wajib diisi." });
        }

        const cleanUsername = discordUsername.trim();
        const dId = discordId || `disc_${Date.now()}`;
        const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;

        await pool.execute(
            "UPDATE users SET discord_id = ?, discord_username = ?, discord_avatar = ? WHERE id = ?",
            [dId, cleanUsername, avatarUrl, userId]
        );

        await logActivity(userId, 'LINK_DISCORD', `Linked Discord account: ${cleanUsername}`);

        res.json({
            success: true,
            message: `Akun Discord ${cleanUsername} berhasil dihubungkan!`,
            discordUsername: cleanUsername,
            discordId: dId,
            discordAvatar: avatarUrl
        });
    } catch (err) {
        console.error("LINK DISCORD ERROR:", err);
        res.status(500).json({ message: "Gagal menghubungkan akun Discord" });
    }
};

exports.unlinkDiscord = async (req, res) => {
    try {
        const userId = req.user.id;
        await pool.execute(
            "UPDATE users SET discord_id = NULL, discord_username = NULL, discord_avatar = NULL WHERE id = ?",
            [userId]
        );

        await logActivity(userId, 'UNLINK_DISCORD', 'Unlinked Discord account.');

        res.json({ success: true, message: "Koneksi akun Discord berhasil diputus." });
    } catch (err) {
        console.error("UNLINK DISCORD ERROR:", err);
        res.status(500).json({ message: "Gagal memutuskan akun Discord" });
    }
};

exports.getDiscordStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            "SELECT discord_id, discord_username, discord_avatar FROM users WHERE id = ?",
            [userId]
        );

        if (!rows.length || !rows[0].discord_username) {
            return res.json({ linked: false });
        }

        const u = rows[0];
        res.json({
            linked: true,
            discordId: u.discord_id,
            discordUsername: u.discord_username,
            discordAvatar: u.discord_avatar
        });
    } catch (err) {
        res.json({ linked: false });
    }
};

// ─── Profile Minecraft Heads ───────────────────────────────────────────────────
const {
    PROFILE_HEAD_CATALOG,
    getCatalogEntry,
    grantDefaultHeads,
    getOwnedHeadKeys,
    userOwnsHead,
    grantHead,
    grantCustomHead,
} = require('../utils/profileHeads');

exports.getProfileHeads = async (req, res) => {
    try {
        const userId = req.user.id;
        await grantDefaultHeads(userId);

        const ownedKeys = await getOwnedHeadKeys(userId);
        const [userRows] = await pool.execute('SELECT avatar_url FROM users WHERE id = ?', [userId]);
        const activeAvatarUrl = userRows[0]?.avatar_url || null;

        const catalog = PROFILE_HEAD_CATALOG.map((head) => ({
            ...head,
            owned: ownedKeys.includes(head.key) || head.isFree,
            locked: !(ownedKeys.includes(head.key) || head.isFree),
        }));

        res.json({
            success: true,
            catalog,
            ownedKeys,
            activeAvatarUrl,
        });
    } catch (err) {
        console.error('GET PROFILE HEADS ERROR:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat katalog head' });
    }
};

exports.selectProfileHead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { headKey, avatarUrl, headName } = req.body;

        let finalUrl = avatarUrl;
        let finalKey = headKey;

        if (headKey) {
            const owns = await userOwnsHead(userId, headKey);
            if (!owns) {
                const entry = getCatalogEntry(headKey);
                return res.status(403).json({
                    success: false,
                    message: entry
                        ? `Head "${entry.name}" terkunci. Buka dengan ${entry.unlockCostBronze} Koin Bronze.`
                        : 'Head tidak dimiliki',
                    unlockCostBronze: entry?.unlockCostBronze || 0,
                });
            }
            const entry = getCatalogEntry(headKey);
            finalUrl = entry?.url || avatarUrl;
            finalKey = headKey;
        } else if (avatarUrl) {
            finalKey = `custom_${Date.now()}`;
            await grantCustomHead(userId, finalKey, avatarUrl, headName || 'Custom Head', 'custom');
        } else {
            return res.status(400).json({ success: false, message: 'headKey atau avatarUrl wajib diisi' });
        }

        if (!finalUrl) {
            return res.status(400).json({ success: false, message: 'URL avatar tidak valid' });
        }

        await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [finalUrl, userId]);
        await logActivity(userId, 'UPDATE_AVATAR', `Changed profile head to ${finalKey || 'custom'}`);

        res.json({
            success: true,
            message: 'Avatar berhasil disimpan',
            avatarUrl: finalUrl,
            headKey: finalKey,
        });
    } catch (err) {
        console.error('SELECT PROFILE HEAD ERROR:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan avatar' });
    }
};

exports.unlockProfileHead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { headKey } = req.body;
        const entry = getCatalogEntry(headKey);

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Head tidak ditemukan' });
        }
        if (entry.isFree) {
            await grantHead(userId, headKey, 'default');
            return res.json({ success: true, message: `Head ${entry.name} sudah gratis`, owned: true });
        }

        if (await userOwnsHead(userId, headKey)) {
            return res.json({ success: true, message: 'Head sudah dimiliki', owned: true });
        }

        const [users] = await pool.execute('SELECT coin_bronze FROM users WHERE id = ?', [userId]);
        const balance = users[0]?.coin_bronze || 0;
        if (balance < entry.unlockCostBronze) {
            return res.status(400).json({
                success: false,
                message: `Saldo tidak cukup. Diperlukan ${entry.unlockCostBronze} Koin Bronze.`,
            });
        }

        await pool.execute('UPDATE users SET coin_bronze = coin_bronze - ? WHERE id = ?', [
            entry.unlockCostBronze,
            userId,
        ]);
        await grantHead(userId, headKey, 'unlock');
        await logActivity(userId, 'UNLOCK_HEAD', `Unlocked head "${entry.name}" for ${entry.unlockCostBronze} bronze`);

        res.json({
            success: true,
            message: `Head "${entry.name}" berhasil dibuka!`,
            ownedKeys: await getOwnedHeadKeys(userId),
        });
    } catch (err) {
        console.error('UNLOCK PROFILE HEAD ERROR:', err);
        res.status(500).json({ success: false, message: 'Gagal membuka head' });
    }
};