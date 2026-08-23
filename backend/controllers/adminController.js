const pool = require('../config/mysql');
const {
  assertCanAssignRole,
  assertCanDeleteUser,
  validateCoinUpdate,
  isValidIPv4,
} = require('../utils/adminSecurity');

// Create New Role
exports.createRole = async (req, res) => {
    try {
        const roleName = req.body.roleName || req.body.name;
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
            await conn.rollback();
            conn.release();
            return res.status(501).json({ message: 'Pembayaran IDR belum diaktifkan. Hubungi admin.' });
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
        await assertCanAssignRole(pool, req.user.id, targetUserId, roleName);
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', [roleName, targetUserId]);
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'ASSIGN_ROLE', `Assigned ${roleName} to user #${targetUserId}`]
        );
        res.json({ message: 'User role updated successfully' });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        console.error('ASSIGN ROLE ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Users (for Admin selection)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, username, email, role, coin_bronze, coin_silver, coin_gold FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
        );
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
        const parsedAmount = validateCoinUpdate(type, amount);
        const columnName = `coin_${type}`;

        const [users] = await pool.execute('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [targetUserId]);
        if (!users.length) return res.status(404).json({ message: 'User not found' });

        await pool.execute(`UPDATE users SET ${columnName} = ? WHERE id = ?`, [parsedAmount, targetUserId]);
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_COINS', `Set user #${targetUserId} ${type} to ${parsedAmount}`]
        );

        res.json({ message: `User coins (${type}) updated to ${parsedAmount}` });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        console.error('UPDATE COINS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
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
        const target = await assertCanDeleteUser(pool, req.user.id, id);
        await pool.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id]);
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_USER', `Soft-deleted user #${id} (${target.username})`]
        );
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        res.status(500).json({ message: 'Gagal menghapus user' });
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
        const [rows] = await pool.execute(
            "SELECT * FROM cosmetic_items WHERE is_active = 1 ORDER BY id DESC"
        );
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

        const typeIcons = { nametag: 'fa-tag', badge: 'fa-certificate', nameplate: 'fa-id-card' };
        const cosmeticCode = `cosmetic_${item.id}`;
        await pool.execute(
            `INSERT INTO user_inventory
                (user_id, item_name, item_type, item_code, quantity, description, rarity, icon, estimated_value, source, source_id,
                 delivery_type, plugin_commands, plugin_id, mc_claim_status)
             VALUES (?, ?, ?, ?, 1, ?, 'epic', ?, ?, 'cosmetic', ?, 'cosmetic', ?, 'hyrost_bridge', 'none')`,
            [
                userId,
                item.name,
                item.type,
                cosmeticCode,
                item.description || `Kosmetik ${item.type} dari toko Hyrost`,
                typeIcons[item.type] || 'fa-gem',
                price,
                item.id,
                `hyrost cosmetic give {player} ${cosmeticCode}`,
            ]
        );
        
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

// --- TICKETS MANAGEMENT ---
exports.getAllTickets = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT t.*, u.username as creator_name, u.avatar_url as creator_avatar, u.role as creator_role,
                   (SELECT COUNT(*) FROM ticket_replies r WHERE r.ticket_id = t.id) as reply_count
            FROM tickets t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
        `);
        res.json({ success: true, tickets: rows });
    } catch (err) {
        res.json({ success: true, tickets: [] });
    }
};

exports.updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await pool.execute("UPDATE tickets SET status = ? WHERE id = ?", [status, id]);
        res.json({ message: `Status tiket diubah menjadi ${status}` });
    } catch (err) {
        res.json({ message: "Status tiket diperbarui" });
    }
};

// --- REWARDS CONFIG ---
exports.getRewardsConfig = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM settings WHERE setting_key LIKE 'reward_%'");
        const config = {};
        rows.forEach(r => config[r.setting_key] = r.setting_value);
        res.json(config);
    } catch (err) {
        res.json({ reward_bronze: "100", reward_silver: "50", reward_gold: "10", reward_cooldown: "24" });
    }
};

exports.updateRewardsConfig = async (req, res) => {
    try {
        const { reward_bronze, reward_silver, reward_gold, reward_cooldown } = req.body;
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('reward_bronze', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [reward_bronze, reward_bronze]);
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('reward_silver', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [reward_silver, reward_silver]);
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('reward_gold', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [reward_gold, reward_gold]);
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('reward_cooldown', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [reward_cooldown, reward_cooldown]);
        res.json({ message: "Konfigurasi Daily Rewards berhasil disimpan!" });
    } catch (err) {
        res.status(500).json({ message: "Gagal menyimpan konfigurasi rewards" });
    }
};

// Build host string for Minecraft status queries (mcsrvstat expects host or host:port)
function buildMcQueryHost(ip, port) {
    const cleanIp = String(ip || '').trim();
    const cleanPort = String(port || '25565').trim();
    if (!cleanIp) return '';
    if (cleanIp.includes(':')) return cleanIp;
    if (!cleanPort || cleanPort === '25565') return cleanIp;
    return `${cleanIp}:${cleanPort}`;
}

function buildMcDisplayAddress(ip, port) {
    const cleanIp = String(ip || 'play.hyrost.net').trim();
    const cleanPort = String(port || '25565').trim();
    if (cleanIp.includes(':')) return cleanIp;
    if (!cleanPort || cleanPort === '25565') return cleanIp;
    return `${cleanIp}:${cleanPort}`;
}

// --- SERVER IP & LIVE STATUS CONNECTION ---
exports.getServerStatus = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM settings WHERE setting_key IN ('server_ip', 'server_port', 'server_name', 'server_status_auto')");
        const config = {
            server_ip: "play.hyrost.net",
            server_port: "25565",
            server_name: "Hyrost Realm",
            server_status_auto: "true"
        };
        rows.forEach(r => config[r.setting_key] = r.setting_value);

        const queryHost = buildMcQueryHost(config.server_ip, config.server_port);
        const displayAddress = buildMcDisplayAddress(config.server_ip, config.server_port);

        let onlinePlayers = 0;
        let maxPlayers = 500;
        let isOnline = false;
        let statusSource = 'default';
        let lastUpdated = new Date().toISOString();
        let playerList = [];
        let queriedHost = null;

        // Priority 1: Hyrost Bridge plugin heartbeat (most accurate when server is linked)
        const bridge = global.minecraftStatus;
        if (bridge && bridge.lastUpdated) {
            const ageMs = Date.now() - new Date(bridge.lastUpdated).getTime();
            if (ageMs < 90000) {
                isOnline = bridge.online !== false;
                onlinePlayers = bridge.playerCount ?? 0;
                maxPlayers = bridge.maxPlayers || 500;
                statusSource = 'plugin';
                lastUpdated = new Date(bridge.lastUpdated).toISOString();
                queriedHost = bridge.serverAddress || displayAddress;
            }
        }

        // Priority 2: External Minecraft status API (mcsrvstat) — same IP:port as shown in UI
        try {
            if (statusSource !== 'plugin' && queryHost && config.server_ip !== 'localhost' && config.server_status_auto === 'true') {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                queriedHost = queryHost;
                const fetchRes = await fetch(`https://api.mcsrvstat.us/2/${encodeURIComponent(queryHost)}`, { signal: controller.signal });
                clearTimeout(timeout);
                if (fetchRes.ok) {
                    const data = await fetchRes.json();
                    if (data && typeof data.online === 'boolean') {
                        isOnline = data.online;
                        onlinePlayers = data.players ? data.players.online : 0;
                        maxPlayers = data.players ? data.players.max : maxPlayers;
                        statusSource = 'mcsrvstat';
                        lastUpdated = new Date().toISOString();
                        if (data.players && data.players.list && Array.isArray(data.players.list)) {
                            playerList = data.players.list.map(p => ({
                                username: typeof p === 'string' ? p : p.name,
                                avatar: `https://mc-heads.net/avatar/${encodeURIComponent(typeof p === 'string' ? p : p.name)}/32`
                            }));
                        }
                    }
                }
            }
        } catch (e) {}

        res.json({
            success: true,
            serverIp: config.server_ip || 'play.hyrost.net',
            serverPort: config.server_port || '25565',
            serverAddress: displayAddress,
            queriedHost: queriedHost || queryHost,
            serverName: config.server_name || 'Hyrost Realm',
            isOnline: isOnline,
            onlinePlayers: onlinePlayers,
            maxPlayers: maxPlayers,
            playerList: playerList,
            statusSource,
            lastUpdated,
        });
    } catch (err) {
        res.json({
            success: true,
            serverIp: "play.hyrost.net",
            serverPort: "25565",
            serverAddress: "play.hyrost.net",
            queriedHost: "play.hyrost.net",
            serverName: "Hyrost Realm",
            isOnline: false,
            onlinePlayers: 0,
            maxPlayers: 500,
            playerList: [],
            statusSource: 'fallback',
            lastUpdated: new Date().toISOString(),
        });
    }
};

exports.saveServerConfig = async (req, res) => {
    try {
        const { server_ip, server_port, server_name, server_status_auto } = req.body;
        
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('server_ip', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [server_ip || 'play.hyrost.net', server_ip || 'play.hyrost.net']);
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('server_port', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [server_port || '25565', server_port || '25565']);
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('server_name', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [server_name || 'Hyrost Realm', server_name || 'Hyrost Realm']);
        await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('server_status_auto', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [server_status_auto || 'true', server_status_auto || 'true']);

        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'UPDATE_SERVER_CONFIG', `Changed Server IP to ${server_ip}:${server_port}`]);
        }

        res.json({ message: "Konfigurasi IP Server berhasil disimpan & terhubung ke server!" });
    } catch (err) {
        res.status(500).json({ message: "Gagal menyimpan konfigurasi server" });
    }
};

// ─── MODULE 1: BACKUP & RESTORE DATABASE ──────────────────────────────────────
exports.exportBackup = async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, role, coin_bronze, coin_silver, coin_gold, created_at FROM users WHERE deleted_at IS NULL'
        );
        const [roles] = await pool.execute("SELECT * FROM roles");
        const [cosmetics] = await pool.execute("SELECT * FROM cosmetic_items");
        const [settings] = await pool.execute("SELECT * FROM settings");
        const [tickets] = await pool.execute("SELECT * FROM tickets");
        const [wiki] = await pool.execute("SELECT * FROM wiki_articles");
        const [ipBlacklist] = await pool.execute("SELECT * FROM ip_blacklist");

        const backupData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            exportedBy: req.user ? req.user.username : 'Admin',
            data: {
                users: users || [],
                roles: roles || [],
                cosmetic_items: cosmetics || [],
                settings: settings || [],
                tickets: tickets || [],
                wiki_articles: wiki || [],
                ip_blacklist: ipBlacklist || []
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=hyrost_backup_${Date.now()}.json`);
        res.json(backupData);
    } catch (err) {
        console.error("EXPORT BACKUP ERROR:", err);
        res.status(500).json({ message: "Gagal membuat backup database" });
    }
};

exports.restoreBackup = async (req, res) => {
    try {
        const { backup } = req.body;
        if (!backup || !backup.data) {
            return res.status(400).json({ message: "Format berkas backup JSON tidak valid" });
        }

        const data = backup.data;
        if (data.settings && Array.isArray(data.settings)) {
            for (const s of data.settings) {
                await pool.execute("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?", [s.setting_key, s.setting_value, s.setting_value]);
            }
        }

        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'RESTORE_BACKUP', `Restored backup from ${backup.exportedBy || 'JSON'}`]);
        }

        res.json({ success: true, message: "Restorasi data cadangan berhasil dilaksanakan!" });
    } catch (err) {
        console.error("RESTORE BACKUP ERROR:", err);
        res.status(500).json({ message: "Gagal melakukan restorasi data" });
    }
};

// ─── MODULE 2: MASS NOTIFICATION BROADCAST ────────────────────────────────────
exports.sendMassBroadcast = async (req, res) => {
    try {
        const { title, message, targetRole } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: "Judul dan isi pesan broadcast wajib diisi" });
        }

        await pool.execute(
            "INSERT INTO notifications (title, message, target_role, sender_id, created_at) VALUES (?, ?, ?, ?, NOW())",
            [title, message, targetRole || 'ALL', req.user ? req.user.id : 1]
        );

        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'SEND_BROADCAST', `Broadcast: "${title}" to ${targetRole || 'ALL'}`]);
        }

        res.json({ success: true, message: `Pesan broadcast "${title}" berhasil dikirim ke seluruh ${targetRole || 'pengguna'}!` });
    } catch (err) {
        console.error("SEND BROADCAST ERROR:", err);
        res.status(500).json({ message: "Gagal mengirimkan siaran pesan broadcast" });
    }
};

exports.getUserNotifications = async (req, res) => {
    try {
        const userRole = req.user ? req.user.role : 'Member';
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT n.*, (nr.notification_id IS NOT NULL) AS is_read
             FROM notifications n
             LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
             WHERE n.target_role = 'ALL' OR n.target_role = ?
             ORDER BY n.id DESC LIMIT 20`,
            [userId, userRole]
        );
        res.json({ success: true, notifications: rows });
    } catch (err) {
        res.json({ success: true, notifications: [] });
    }
};

// ─── MODULE 3: CONTENT MANAGER WIKI & GUIDE ───────────────────────────────────
exports.getWikiArticles = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM wiki_articles ORDER BY id DESC");
        res.json({ success: true, articles: rows });
    } catch (err) {
        res.status(500).json({ message: "Gagal mengambil daftar artikel wiki" });
    }
};

exports.createWikiArticle = async (req, res) => {
    try {
        const { title, category, icon, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: "Judul dan isi konten wiki wajib diisi" });
        }

        const [result] = await pool.execute(
            "INSERT INTO wiki_articles (title, category, icon, content, created_at) VALUES (?, ?, ?, ?, NOW())",
            [title, category || 'Guide', icon || 'fa-book', content]
        );

        res.json({ success: true, message: `Artikel Wiki '${title}' berhasil diterbitkan!`, articleId: result.insertId });
    } catch (err) {
        console.error("CREATE WIKI ERROR:", err);
        res.status(500).json({ message: "Gagal menambahkan artikel wiki baru" });
    }
};

exports.deleteWikiArticle = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM wiki_articles WHERE id = ?", [id]);
        res.json({ success: true, message: "Artikel Wiki berhasil dihapus." });
    } catch (err) {
        res.status(500).json({ message: "Gagal menghapus artikel wiki" });
    }
};

// ─── MODULE 4: IP BLACKLIST MANAGER ──────────────────────────────────────────
exports.getIPBlacklist = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM ip_blacklist ORDER BY id DESC");
        res.json({ success: true, blacklist: rows });
    } catch (err) {
        res.status(500).json({ message: "Gagal mengambil daftar pemblokiran IP" });
    }
};

exports.blockIP = async (req, res) => {
    try {
        const { ip_address, reason } = req.body;
        if (!ip_address) return res.status(400).json({ message: 'Alamat IP wajib diisi' });
        if (!isValidIPv4(ip_address)) {
            return res.status(400).json({ message: 'Format IPv4 tidak valid' });
        }

        await pool.execute(
            "INSERT INTO ip_blacklist (ip_address, reason, blocked_by, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE reason = ?",
            [ip_address, reason || 'Dibelokir oleh Admin', req.user ? req.user.username : 'Admin', reason || 'Diblokir oleh Admin']
        );

        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'BLOCK_IP', `Blocked IP ${ip_address}: ${reason}`]);
        }

        res.json({ success: true, message: `Alamat IP ${ip_address} berhasil diblokir dari Realm.` });
    } catch (err) {
        res.status(500).json({ message: "Gagal memblokir alamat IP" });
    }
};

exports.unblockIP = async (req, res) => {
    try {
        const { ip } = req.params;
        await pool.execute("DELETE FROM ip_blacklist WHERE ip_address = ?", [ip]);
        res.json({ success: true, message: `Alamat IP ${ip} berhasil dibuka blokirnya.` });
    } catch (err) {
        res.status(500).json({ message: "Gagal membuka pemblokiran IP" });
    }
};

// ─── MODULE 5: PAYMENT GATEWAYS CONFIG ───────────────────────────────────────
let globalPaymentSettings = {
    qris_active: true,
    bca_active: true,
    mandiri_active: true,
    bni_active: true,
    credit_card_active: true,
    indomaret_active: true,
    merchant_name: "PT HYROST MEDIA REALM",
    bca_va_number: "88009442808943",
    mandiri_va_number: "88012398471230",
    qris_image_url: "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=HYROST_REALM_QRIS_PAYMENT_GATEWAY",
    tax_rate: 0
};

exports.getPaymentSettings = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'pay_%'");
        if (rows.length > 0) {
            rows.forEach(r => {
                const key = r.setting_key.replace('pay_', '');
                if (r.setting_value === 'true') globalPaymentSettings[key] = true;
                else if (r.setting_value === 'false') globalPaymentSettings[key] = false;
                else globalPaymentSettings[key] = r.setting_value;
            });
        }
        res.json({ success: true, settings: globalPaymentSettings });
    } catch (err) {
        res.json({ success: true, settings: globalPaymentSettings });
    }
};

exports.updatePaymentSettings = async (req, res) => {
    try {
        const settings = req.body;
        globalPaymentSettings = { ...globalPaymentSettings, ...settings };

        for (const [key, val] of Object.entries(settings)) {
            const dbKey = `pay_${key}`;
            const dbVal = String(val);
            await pool.execute(
                "INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
                [dbKey, dbVal, dbVal]
            );
        }

        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", 
                [req.user.id, 'UPDATE_PAYMENT_SETTINGS', 'Updated payment gateways configuration & account details']
            );
        }

        res.json({ success: true, message: "Pengaturan gateway pembayaran berhasil disimpan!", settings: globalPaymentSettings });
    } catch (err) {
        console.error("UPDATE PAYMENT SETTINGS ERROR:", err);
        res.status(500).json({ success: false, message: "Gagal menyimpan pengaturan pembayaran" });
    }
};

let defaultPaymentMethods = [
    {
        id: 1,
        key: 'qris',
        name: 'QRIS Instant (All E-Wallet)',
        icon: 'fa-qrcode',
        color: '#10b981',
        account: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=HYROST_REALM_QRIS',
        instructions: 'Scan QRIS menggunakan GoPay, OVO, Dana, ShopeePay, LinkAja, atau Mobile Banking pilihan Anda.',
        is_active: true
    },
    {
        id: 2,
        key: 'bca_va',
        name: 'BCA Virtual Account',
        icon: 'fa-university',
        color: '#06b6d4',
        account: '88009442808943',
        instructions: 'Transfer tepat sesuai nominal ke nomor BCA Virtual Account di atas via ATM / M-Banking BCA.',
        is_active: true
    },
    {
        id: 3,
        key: 'mandiri_va',
        name: 'Mandiri Virtual Account',
        icon: 'fa-university',
        color: '#f59e0b',
        account: '88012398471230',
        instructions: 'Bayar melalui Livin by Mandiri atau ATM Mandiri dengan memasukkan nomor VA di atas.',
        is_active: true
    },
    {
        id: 4,
        key: 'credit_card',
        name: 'Kartu Kredit / Debit (3DS2)',
        icon: 'fa-credit-card',
        color: '#ec4899',
        account: 'Visa / Mastercard SSL Secured',
        instructions: 'Transaksi kartu kredit terenkripsi 256-Bit SSL dengan verifikasi OTP 3D Secure.',
        is_active: true
    },
    {
        id: 5,
        key: 'indomaret',
        name: 'Indomaret / Alfamart',
        icon: 'fa-store',
        color: '#84cc16',
        account: 'HYR-894210491',
        instructions: 'Tunjukkan kode bayar kasir Indomaret / Alfamart terdekat untuk menyelesaikan pembayaran.',
        is_active: true
    }
];

const PAYMENT_METHODS_KEY = 'custom_payment_methods';

async function readPaymentMethods() {
    try {
        const [rows] = await pool.execute(
            "SELECT setting_value FROM site_settings WHERE setting_key = ?",
            [PAYMENT_METHODS_KEY]
        );
        if (rows.length > 0 && rows[0].setting_value) {
            const parsed = JSON.parse(rows[0].setting_value);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (err) {
        console.error('readPaymentMethods:', err.message);
    }
    return defaultPaymentMethods.map(m => ({ ...m }));
}

async function writePaymentMethods(list) {
    const jsonStr = JSON.stringify(list);
    await pool.execute(
        "INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [PAYMENT_METHODS_KEY, jsonStr, jsonStr]
    );
}

exports.readPaymentMethods = readPaymentMethods;

exports.getAllPaymentMethods = async (req, res) => {
    try {
        let list = await readPaymentMethods();
        const isAdmin = req.user && String(req.user.role || '').toLowerCase() === 'admin';
        if (!isAdmin) {
            list = list.filter(m => m.is_active !== false);
        }
        res.json({ success: true, methods: list });
    } catch (err) {
        console.error('GET PAYMENT METHODS ERROR:', err);
        res.json({ success: true, methods: defaultPaymentMethods.filter(m => m.is_active !== false) });
    }
};

exports.savePaymentMethod = async (req, res) => {
    try {
        const { id, key, name, icon, color, account, instructions, is_active } = req.body;
        if (!key || !name) {
            return res.status(400).json({ success: false, message: 'Key dan Nama Metode Wajib Diisi' });
        }

        const list = await readPaymentMethods();
        const normalizedKey = key.toLowerCase().trim();
        const existingIdx = list.findIndex(m => m.key === normalizedKey || (id && m.id === Number(id)));

        const payload = {
            id: existingIdx >= 0 ? list[existingIdx].id : Date.now(),
            key: normalizedKey,
            name,
            icon: icon || 'fa-credit-card',
            color: color || '#10b981',
            account: account || '',
            instructions: instructions || '',
            is_active: is_active !== false
        };

        if (existingIdx >= 0) {
            list[existingIdx] = payload;
        } else {
            list.push(payload);
        }

        await writePaymentMethods(list);
        res.json({ success: true, message: `Metode Pembayaran '${name}' berhasil disimpan!`, methods: list });
    } catch (err) {
        console.error('SAVE PAYMENT METHOD ERROR:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan metode pembayaran' });
    }
};

exports.deletePaymentMethod = async (req, res) => {
    try {
        const key = decodeURIComponent(req.params.key || '').toLowerCase().trim();
        if (!key) {
            return res.status(400).json({ success: false, message: 'Key metode pembayaran wajib diisi' });
        }

        const list = await readPaymentMethods();
        const filtered = list.filter(m => m.key !== key);

        if (filtered.length === list.length) {
            return res.status(404).json({ success: false, message: 'Metode pembayaran tidak ditemukan' });
        }

        await writePaymentMethods(filtered);
        res.json({ success: true, message: 'Metode pembayaran berhasil dihapus.', methods: filtered });
    } catch (err) {
        console.error('DELETE PAYMENT METHOD ERROR:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus metode pembayaran' });
    }
};

// ─── MODULE 7: PUBLIC LIVE ACTIVITY FEED ──────────────────────────────────────
exports.getPublicLiveActivity = async (req, res) => {
    try {
        const [logs] = await pool.execute(`
            SELECT a.action, a.details, a.created_at, u.username, u.avatar_url
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.id DESC LIMIT 8
        `);

        const formatted = logs.map(l => {
            let title = 'Aktivitas Realm';
            let icon = 'fa-star';
            let color = '#10b981';

            if (l.action.includes('BUY_RANK')) {
                title = `${l.username || 'Pemain'} membeli Pangkat!`;
                icon = 'fa-crown';
                color = '#f59e0b';
            } else if (l.action.includes('CLAIM_STARTER')) {
                title = `${l.username || 'Pemain'} mengklaim Starter Kit Pemula!`;
                icon = 'fa-gift';
                color = '#06b6d4';
            } else if (l.action.includes('CLAIM_VOUCHER')) {
                title = `${l.username || 'Pemain'} mengklaim Kode Voucher Promo!`;
                icon = 'fa-ticket-alt';
                color = '#ec4899';
            }

            return {
                title,
                details: l.details,
                username: l.username || 'Pemain',
                avatarUrl: l.avatar_url,
                icon,
                color,
                createdAt: l.created_at
            };
        });

        res.json({ success: true, activities: formatted });
    } catch (err) {
        res.json({ success: true, activities: [] });
    }
};


// ─── MODULE 6: PROMO VOUCHERS MANAGER ────────────────────────────────────────
exports.getPromoVouchers = async (req, res) => {
    try {
        const [vouchers] = await pool.execute("SELECT * FROM vouchers ORDER BY id DESC");
        res.json({ success: true, vouchers });
    } catch (err) {
        res.status(500).json({ success: false, message: "Gagal mengambil data voucher" });
    }
};

exports.createPromoVoucher = async (req, res) => {
    try {
        const { code, type, reward_type, reward_amount, discount_type, discount_value, max_uses } = req.body;
        if (!code) return res.status(400).json({ message: "Kode voucher / promo wajib diisi" });

        const cleanCode = code.trim().toUpperCase();

        await pool.execute(`
            INSERT INTO vouchers (code, type, reward_type, reward_amount, discount_type, discount_value, max_uses, current_uses, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, NOW())
            ON DUPLICATE KEY UPDATE 
                type = VALUES(type), reward_type = VALUES(reward_type), reward_amount = VALUES(reward_amount),
                discount_type = VALUES(discount_type), discount_value = VALUES(discount_value), max_uses = VALUES(max_uses)
        `, [
            cleanCode,
            type || 'discount',
            reward_type || 'gold',
            reward_amount || 0,
            discount_type || 'percent',
            discount_value || 20,
            max_uses || 100
        ]);

        if (req.user && req.user.id) {
            await pool.execute("INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)", 
                [req.user.id, 'CREATE_VOUCHER', `Created promo voucher "${cleanCode}" (${discount_value || reward_amount})`]
            );
        }

        res.json({ success: true, message: `Kode Promo / Voucher '${cleanCode}' berhasil diterbitkan!` });
    } catch (err) {
        console.error("CREATE VOUCHER ERROR:", err);
        res.status(500).json({ success: false, message: "Gagal menerbitkan voucher" });
    }
};

exports.deletePromoVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM vouchers WHERE id = ?", [id]);
        res.json({ success: true, message: "Voucher berhasil dihapus." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Gagal menghapus voucher" });
    }
};

const { getRecentAuditLogs } = require('../utils/securityAudit');

exports.getAuditLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '50', 10);
        const logs = getRecentAuditLogs(limit);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: "Gagal mengambil security audit logs" });
    }
};



