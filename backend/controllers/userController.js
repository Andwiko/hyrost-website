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
        const [users] = await pool.execute("SELECT id, username, email, role, avatar_url, coin_bronze, coin_silver, coin_gold, created_at FROM users WHERE id = ?", [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = users[0];
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatar_url,
            coins: {
                bronze: user.coin_bronze,
                silver: user.coin_silver,
                gold: user.coin_gold
            },
            createdAt: user.created_at
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