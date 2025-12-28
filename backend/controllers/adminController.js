const pool = require("../config/mysql");

// Create New Role
exports.createRole = async (req, res) => {
    try {
        const { roleName } = req.body;
        if (!roleName) return res.status(400).json({ message: "Role name is required" });

        await pool.execute("INSERT INTO roles (name) VALUES (?)", [roleName]);
        res.json({ message: `Role '${roleName}' created successfully` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Role already exists" });
        }
        console.error("CREATE ROLE ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Get All Roles
exports.getAllRoles = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM roles ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        console.error("GET ROLES ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Delete Role
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting core roles
        const [role] = await pool.execute("SELECT name FROM roles WHERE id = ?", [id]);
        if (!role.length) return res.status(404).json({ message: "Role not found" });
        
        const protectedRoles = ['Admin', 'Member'];
        if (protectedRoles.includes(role[0].name)) {
            return res.status(403).json({ message: "Cannot delete core system roles (Admin/Member)" });
        }

        await pool.execute("DELETE FROM roles WHERE id = ?", [id]);
        res.json({ message: "Role deleted successfully" });
    } catch (err) {
        console.error("DELETE ROLE ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Update Role Customization
// Update Role Customization
exports.updateRoleCustomization = async (req, res) => {
    try {
        const { id } = req.params;
        const { badgeText, badgeColor, badgeStyle, coinPrice, idrPrice, description } = req.body;
        
        console.log(`[ADMIN] Updating Role ${id}`, req.body);

        await pool.execute(
            `UPDATE roles SET 
                badge_text = ?, 
                badge_color = ?, 
                badge_style = ?,
                price_coin = ?, 
                price_idr = ?, 
                description = ? 
            WHERE id = ?`, 
            [badgeText, badgeColor, badgeStyle || 'normal', coinPrice, idrPrice, description, id]
        );
        
        res.json({ message: "Role updated successfully" });
    } catch (err) {
        console.error("UPDATE ROLE ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Purchase Role
exports.purchaseRole = async (req, res) => {
    const userId = req.user.id;
    const { roleId, paymentMethod } = req.body; // paymentMethod: 'coin' or 'real'

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Get Role Data
        const [roles] = await conn.execute("SELECT * FROM roles WHERE id = ?", [roleId]);
        if (!roles.length) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ message: "Role tidak ditemukan" });
        }
        const role = roles[0];

        if (paymentMethod === 'coin') {
            // Check Gold Coin balance (assuming gold is the premium currency)
            const [users] = await conn.execute("SELECT coin_gold FROM users WHERE id = ?", [userId]);
            if (users[0].coin_gold < role.price_coin) {
                await conn.rollback();
                conn.release();
                return res.status(400).json({ message: "Koin Gold tidak cukup" });
            }

            // Deduct coins
            await conn.execute("UPDATE users SET coin_gold = coin_gold - ? WHERE id = ?", [role.price_coin, userId]);
        } 
        else if (paymentMethod === 'real') {
            // Placeholder: In a real app, this would verify a payment gateway response
            // For now, we assume the frontend sends this after a successful (mocked) payment
            console.log(`DEBUG: Real money purchase for role ${role.name} by user ${userId}`);
        } else {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ message: "Metode pembayaran tidak valid" });
        }

        // 2. Assign Role
        await conn.execute("UPDATE users SET role = ? WHERE id = ?", [role.name, userId]);

        await conn.commit();
        conn.release();

        res.json({ 
            success: true, 
            message: `Selamat! Anda sekarang adalah ${role.name}`,
            roleHeader: role.badge_text || role.name,
            roleColor: role.badge_color
        });

    } catch (err) {
        console.error("PURCHASE ROLE ERROR:", err);
        res.status(500).json({ message: "Gagal memproses pembelian" });
    }
};

// Assign Role to User
exports.assignRole = async (req, res) => {
    try {
        const { targetUserId, roleName } = req.body;
        
        // Check if role exists
        const [roles] = await pool.execute("SELECT * FROM roles WHERE name = ?", [roleName]);
        if (roles.length === 0) {
            return res.status(400).json({ message: "Role does not exist" });
        }

        // Update User
        await pool.execute("UPDATE users SET role = ? WHERE id = ?", [roleName, targetUserId]);
        
        res.json({ message: "User role updated successfully" });
    } catch (err) {
        console.error("ASSIGN ROLE ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Get All Users (for Admin selection)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT id, username, email, role, coin_bronze, coin_silver, coin_gold FROM users ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        console.error("GET ALL USERS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Update User Coins
exports.updateCoins = async (req, res) => {
    try {
        const { targetUserId, type, amount } = req.body;
        if (!['bronze', 'silver', 'gold'].includes(type)) {
            return res.status(400).json({ message: "Invalid coin type" });
        }

        const columnName = `coin_${type}`;
        const query = `UPDATE users SET ${columnName} = ? WHERE id = ?`;
        await pool.execute(query, [amount, targetUserId]);

        res.json({ message: `User coins (${type}) updated to ${amount}` });
    } catch (err) {
        console.error("UPDATE COINS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// --- BANNED WORDS MANAGEMENT ---

exports.addBannedWord = async (req, res) => {
    try {
        const { word } = req.body;
        if (!word) return res.status(400).json({ message: "Word is required" });
        
        await pool.execute("INSERT INTO banned_words (word) VALUES (?)", [word.toLowerCase()]);
        res.json({ message: `Kata '${word}' berhasil dilarang` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Kata sudah ada di daftar" });
        res.status(500).json({ message: "Gagal menambah kata terlarang" });
    }
};

exports.getBannedWords = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM banned_words ORDER BY created_at DESC");
        console.log(`DEBUG: getBannedWords found ${rows.length} words`);
        res.json(rows);
    } catch (err) {
        console.error("GET BANNED WORDS ERROR:", err);
        res.status(500).json({ message: "Gagal mengambil daftar kata", error: err.message });
    }
};

exports.deleteBannedWord = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM banned_words WHERE id = ?", [id]);
        res.json({ message: "Kata berhasil dihapus dari daftar" });
    } catch (err) {
        res.status(500).json({ message: "Gagal menghapus kata" });
    }
};

// --- USER MANAGEMENT (ADVANCED) ---

exports.deleteUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        // Hard delete by admin
        await pool.execute("DELETE FROM users WHERE id = ?", [id]);
        res.json({ message: "User permanently deleted from system" });
    } catch (err) {
        res.status(500).json({ message: "Gagal menghapus user" });
    }
};
// --- Forum Moderation ---

exports.getRecentThreads = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT t.*, u.username, u.email 
            FROM threads t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        console.error("GET THREADS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM threads WHERE id = ?", [id]);
        
        // Log action
        // Log action
        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'DELETE_THREAD', `Deleted thread ${id}`]);
        }
        
        res.json({ message: "Thread deleted permanently" });
    } catch (err) {
        console.error("DELETE THREAD ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.togglePinThread = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute("SELECT is_pinned FROM threads WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Thread not found" });

        const newStatus = rows[0].is_pinned ? 0 : 1;
        await pool.execute("UPDATE threads SET is_pinned = ? WHERE id = ?", [newStatus, id]);
        
        res.json({ message: newStatus ? "Thread pinned" : "Thread unpinned", isPinned: !!newStatus });
    } catch (err) {
        console.error("PIN THREAD ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// --- Global Settings ---

exports.getSettings = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM settings");
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?", [key, value, value]);
        
        if (req.user && req.user.id) {
             await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'UPDATE_SETTING', `Changed ${key} to ${value}`]);
        }

        res.json({ message: "Setting updated" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT l.*, u.username, u.email 
            FROM activity_logs l 
            JOIN users u ON l.user_id = u.id 
            ORDER BY l.created_at DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// --- COSMETICS ---
exports.getAllCosmetics = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM cosmetic_items ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.createCosmetic = async (req, res) => {
    try {
        const { name, type, priceBronze, priceSilver, priceGold, priceIdr, cssStyle, animationData } = req.body;
        await pool.execute(
            "INSERT INTO cosmetic_items (name, type, price_bronze, price_silver, price_gold, price_idr, css_style, animation_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, type, priceBronze || 0, priceSilver || 0, priceGold || 0, priceIdr || 0, cssStyle || '', animationData || '']
        );
        
        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'CREATE_COSMETIC', `Created ${type}: ${name}`]);
        }
        res.json({ message: "Item created" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.buyCosmetic = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, currency } = req.body; // currency: 'bronze', 'silver', 'gold'

        // 1. Get Item
        const [items] = await pool.execute("SELECT * FROM cosmetic_items WHERE id = ?", [itemId]);
        if (items.length === 0) return res.status(404).json({ message: "Item not found" });
        const item = items[0];

        // 2. Determine Price and User Balance Column
        let price = 0;
        let userCol = '';
        
        if (currency === 'bronze') { price = item.price_bronze; userCol = 'coin_bronze'; }
        else if (currency === 'silver') { price = item.price_silver; userCol = 'coin_silver'; }
        else if (currency === 'gold') { price = item.price_gold; userCol = 'coin_gold'; }
        else { return res.status(400).json({ message: "Invalid currency" }); }

        if (price <= 0) return res.status(400).json({ message: "Item not for sale in this currency" });

        // 3. Check Balance
        const [users] = await pool.execute(`SELECT ${userCol} FROM users WHERE id = ?`, [userId]);
        const currentBalance = users[0][userCol];

        if (currentBalance < price) {
            return res.status(400).json({ message: "Saldo tidak cukup!" });
        }

        // 4. Check Ownership
        const [owned] = await pool.execute("SELECT * FROM user_cosmetics WHERE user_id = ? AND item_id = ?", [userId, itemId]);
        if (owned.length > 0) return res.status(400).json({ message: "Anda sudah memiliki item ini" });

        // 5. Transaction
        await pool.execute(`UPDATE users SET ${userCol} = ${userCol} - ? WHERE id = ?`, [price, userId]);
        await pool.execute("INSERT INTO user_cosmetics (user_id, item_id) VALUES (?, ?)", [userId, itemId]);
        
        await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [userId, 'BUY_COSMETIC', `Bought ${item.name} for ${price} ${currency}`]);

        res.json({ message: "Pembelian berhasil!", newBalance: currentBalance - price });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteCosmetic = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM cosmetic_items WHERE id = ?", [id]);
        res.json({ message: "Item deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
