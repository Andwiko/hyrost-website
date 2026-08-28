// controllers/minecraftController.js
const pool = require('../config/mysql');
const {
  enqueueDelivery,
  finalizeDelivery,
  parseCommandsForPlugin,
  PLUGIN_ID,
} = require('../utils/pluginDelivery');

// Secret API key for plugin verification (can be configured via env)
const SERVER_API_KEY = process.env.MINECRAFT_BRIDGE_KEY;

// ─── DB SCHEMA INIT ────────────────────────────────────────────────────────────

exports.initMinecraftDB_Internal = async () => {
    console.log("DEBUG: Initializing Minecraft Bridge Database Tables...");

    // 1. Account Links table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS account_links (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            user_id      INT NOT NULL,
            mc_username  VARCHAR(64) DEFAULT NULL,
            mc_uuid      VARCHAR(64) DEFAULT NULL,
            link_code    VARCHAR(12) NOT NULL,
            is_verified  TINYINT(1) DEFAULT 0,
            expires_at   TIMESTAMP NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user (user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 2. Pending Deliveries Queue
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS pending_deliveries (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            user_id      INT NOT NULL,
            mc_uuid      VARCHAR(64) DEFAULT NULL,
            item_type    VARCHAR(50) DEFAULT 'item', -- 'item', 'rank', 'coin', 'cosmetic'
            item_name    VARCHAR(100) NOT NULL,
            item_code    VARCHAR(100) DEFAULT NULL,
            quantity     INT DEFAULT 1,
            commands     TEXT DEFAULT NULL, -- Pipe/JSON commands e.g. "give {player} diamond 5|lp user {player} parent add vip"
            status       ENUM('pending', 'delivered', 'failed', 'cancelled') DEFAULT 'pending',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            delivered_at TIMESTAMP NULL DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 3. Server Sync Logs
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS server_sync_logs (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            event_type   VARCHAR(50) NOT NULL,
            details      TEXT DEFAULT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("DEBUG: initMinecraftDB_Internal completed successfully");
};

// Emergency/Manual Init API
exports.initDB = async (req, res) => {
    try {
        await exports.initMinecraftDB_Internal();
        res.json({ success: true, message: "Minecraft Bridge tables initialized" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// ─── STATUS API (Existing + Enhanced) ──────────────────────────────────────────

exports.updateStatus = async (req, res) => {
    try {
        const { server, status, playerCount, maxPlayers, serverIp, serverPort, serverAddress } = req.body;
        const ip = serverIp || serverAddress?.split(':')[0];
        const port = serverPort || (serverAddress?.includes(':') ? serverAddress.split(':')[1] : null);
        const address = serverAddress || (ip && port && port !== '25565' ? `${ip}:${port}` : ip);

        global.minecraftStatus = {
            online: status !== 'offline' && status !== false,
            serverName: server || 'Hyrost Realm',
            serverIp: ip || null,
            serverPort: port || null,
            serverAddress: address || null,
            playerCount: playerCount || 0,
            maxPlayers: maxPlayers || 100,
            lastUpdated: new Date()
        };

        return res.status(200).json({ success: true, message: 'Status updated' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const status = global.minecraftStatus || { online: false, playerCount: 0, maxPlayers: 100 };
        if (status.lastUpdated && (new Date() - new Date(status.lastUpdated) > 60000)) {
            status.online = false;
        }
        return res.json(status);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching status' });
    }
};

// ─── ACCOUNT LINKING (Web <-> Minecraft) ─────────────────────────────────────

// Request a new verification link code from Web
exports.requestAccountLink = async (req, res) => {
    try {
        const userId = req.user.id;

        // Generate 6-digit random code
        const codeDigits = Math.floor(100000 + Math.random() * 900000);
        const linkCode = `HYR-${codeDigits}`;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // Delete existing unverified codes for this user
        try {
            await pool.execute("DELETE FROM account_links WHERE user_id = ? AND is_verified = 0", [userId]);
        } catch (_) {}

        // Insert new code
        await pool.execute(
            "INSERT INTO account_links (user_id, link_code, expires_at) VALUES (?, ?, ?)",
            [userId, linkCode, expiresAt]
        );

        res.json({
            success: true,
            linkCode,
            expiresAt,
            instruction: `Ketik perintah ini di-game: /link ${linkCode}`
        });
    } catch (error) {
        console.error("REQUEST ACCOUNT LINK ERROR:", error);
        res.status(500).json({ success: false, message: "Gagal membuat kode verifikasi" });
    }
};

// Called by Minecraft Plugin when player types `/link <code>`
exports.verifyAccountLink = async (req, res) => {
    try {
        const apiKey = req.headers['x-bridge-api-key'];
        if (!SERVER_API_KEY || apiKey !== SERVER_API_KEY) {
            return res.status(401).json({ success: false, message: "Unauthorized plugin key" });
        }

        const { code, uuid, username } = req.body;
        if (!code || !uuid || !username) {
            return res.status(400).json({ success: false, message: "Missing code, uuid, or username" });
        }

        const [rows] = await pool.execute(
            "SELECT * FROM account_links WHERE link_code = ? AND is_verified = 0 AND expires_at > NOW()",
            [code.trim().toUpperCase()]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Kode verifikasi tidak ditemukan atau sudah kadaluarsa. Buat kode baru di Web."
            });
        }

        const linkRecord = rows[0];

        // Mark as verified and attach UUID & Username
        await pool.execute(
            "UPDATE account_links SET mc_uuid = ?, mc_username = ?, is_verified = 1 WHERE id = ?",
            [uuid, username, linkRecord.id]
        );

        // Mark as verified — do not overwrite user-selected profile head
        try {
            const avatarUrl = `https://cravatar.eu/helmavatar/${username}/64.png`;
            await pool.execute(
                "UPDATE users SET avatar_url = ? WHERE id = ? AND (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '%ui-avatars%')",
                [avatarUrl, linkRecord.user_id]
            );
        } catch (_) {}

        console.log(`⚡ Minecraft Account Linked: User #${linkRecord.user_id} <-> ${username} (${uuid})`);

        res.json({
            success: true,
            message: `Akun Minecraft ${username} berhasil ditautkan dengan Web Hyrost!`,
            userId: linkRecord.user_id
        });
    } catch (error) {
        console.error("VERIFY LINK ERROR:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get current user's linked MC account status
exports.getAccountLinkStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            "SELECT mc_username, mc_uuid, is_verified, created_at FROM account_links WHERE user_id = ? AND is_verified = 1",
            [userId]
        );

        if (rows.length === 0) {
            return res.json({ linked: false });
        }

        res.json({
            linked: true,
            mcUsername: rows[0].mc_username,
            mcUuid: rows[0].mc_uuid,
            linkedAt: rows[0].created_at
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Unlink account
exports.unlinkAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        await pool.execute("DELETE FROM account_links WHERE user_id = ?", [userId]);
        res.json({ success: true, message: "Tautan akun Minecraft berhasil dilepas" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── DELIVERIES & CLAIMING (Marketplace / Inventory -> Minecraft) ───────────

// Plugin fetches pending deliveries for player when they join or type `/claim`
exports.getPendingDeliveries = async (req, res) => {
    try {
        const { uuid, username } = req.query;

        let whereClause = "WHERE LOWER(pd.status) IN ('pending', 'queued')";
        const params = [];

        if (uuid) {
            whereClause += " AND (pd.mc_uuid = ? OR al.mc_uuid = ?)";
            params.push(uuid, uuid);
        } else if (username) {
            whereClause += " AND al.mc_username = ?";
            params.push(username);
        }

        const [rows] = await pool.execute(`
            SELECT pd.id, pd.user_id, pd.inventory_id, pd.item_type, pd.item_name, pd.item_code, pd.quantity,
                   pd.commands, pd.plugin_id, pd.source, pd.created_at,
                   COALESCE(pd.mc_uuid, al.mc_uuid) as target_uuid,
                   al.mc_username
            FROM pending_deliveries pd
            LEFT JOIN account_links al ON pd.user_id = al.user_id AND al.is_verified = 1
            ${whereClause}
            ORDER BY pd.created_at ASC
        `, params);

        const deliveries = rows.map((row) => ({
          ...row,
          pluginId: row.plugin_id || PLUGIN_ID,
          commandList: parseCommandsForPlugin(row.commands),
        }));

        res.json({ success: true, count: deliveries.length, pluginId: PLUGIN_ID, deliveries });
    } catch (error) {
        console.error("GET PENDING DELIVERIES ERROR:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Plugin confirms that an item/command was delivered successfully
exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveryId, status } = req.body;
        if (!deliveryId) return res.status(400).json({ success: false, message: "Missing deliveryId" });

        const deliveryStatus = await finalizeDelivery(deliveryId, status === 'failed' ? 'failed' : 'delivered');

        res.json({ success: true, message: `Delivery #${deliveryId} marked as ${deliveryStatus}` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// User clicks "Klaim ke Minecraft" from Web Inventory (HyrostBridge queue)
exports.claimWebItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const inventoryId = parseInt(req.body.itemId || req.body.inventoryId, 10);

        if (!inventoryId) {
            return res.status(400).json({ success: false, message: 'itemId inventaris wajib diisi' });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM user_inventory WHERE id = ? AND user_id = ?',
            [inventoryId, userId]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Item inventaris tidak ditemukan' });
        }

        const item = rows[0];
        if (item.mc_claim_status === 'queued') {
            return res.status(400).json({
                success: false,
                message: 'Item sudah dalam antrean. Ketik /claim di server Minecraft.',
            });
        }
        if (item.mc_claim_status === 'delivered') {
            return res.status(400).json({ success: false, message: 'Item sudah diklaim ke Minecraft.' });
        }

        const [links] = await pool.execute(
            "SELECT mc_uuid, mc_username FROM account_links WHERE user_id = ? AND is_verified = 1",
            [userId]
        );
        if (!links.length) {
            return res.status(400).json({
                success: false,
                message: 'Akun Minecraft belum ditautkan! Tautkan akun Anda terlebih dahulu di Profil.',
            });
        }

        const delivery = await enqueueDelivery({
            userId,
            inventoryId: item.id,
            source: req.body.source || 'inventory',
            itemName: item.item_name,
            itemType: item.item_type,
            itemCode: item.item_code,
            quantity: item.quantity || 1,
            minecraftMaterial: item.minecraft_material,
            deliveryType: item.delivery_type,
            pluginCommands: item.plugin_commands,
            pluginId: item.plugin_id,
            catalogItemCode: item.item_code,
        });

        res.json({
            success: true,
            deliveryId: delivery.deliveryId,
            pluginId: delivery.pluginId,
            commandList: parseCommandsForPlugin(delivery.commands),
            message: `Item "${item.item_name}" masuk antrean HyrostBridge! Ketik /claim di server (${links[0].mc_username}).`,
        });
    } catch (error) {
        console.error('CLAIM WEB ITEM ERROR:', error);
        res.status(500).json({ success: false, message: 'Gagal memproses klaim item' });
    }
};

// Internal Helper: queue delivery from other modules
exports.enqueuePurchaseDelivery = async (userId, itemName, itemType, itemCode, quantity, customCommands, inventoryId) => {
    try {
        return await enqueueDelivery({
            userId,
            inventoryId: inventoryId || null,
            source: 'purchase',
            itemName,
            itemType,
            itemCode,
            quantity,
            pluginCommands: customCommands,
            catalogItemCode: itemCode,
        });
    } catch (err) {
        console.error('ENQUEUE DELIVERY ERROR:', err);
        return null;
    }
};

// Redeem Code (Existing Handler)
const RedeemCode = require('../models/RedeemCode');

exports.redeemCode = async (req, res) => {
    try {
        const { code, uuid, username } = req.body;

        if (!code || !uuid) {
            return res.status(400).json({ success: false, message: 'Missing code or uuid' });
        }

        const redeemCode = await RedeemCode.findOne({ code: code.toUpperCase() });

        if (!redeemCode || !redeemCode.isActive) {
            return res.status(404).json({ success: false, message: 'Kode tidak valid atau tidak aktif' });
        }

        if (redeemCode.usedBy.includes(uuid)) {
            return res.status(400).json({ success: false, message: 'Kode sudah pernah digunakan oleh akun ini' });
        }

        redeemCode.usedBy.push(uuid);
        await redeemCode.save();

        return res.status(200).json({ 
            success: true, 
            message: 'Kode redeem berhasil diklaim!',
            rewardCommand: redeemCode.rewardCommand
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Direct Mojang Username Linking
exports.linkMojangDirect = async (req, res) => {
    try {
        const userId = req.user.id;
        const { mcUsername } = req.body;

        if (!mcUsername || !mcUsername.trim()) {
            return res.status(400).json({ success: false, message: "Username Mojang/Minecraft wajib diisi." });
        }

        const cleanName = mcUsername.trim();
        let mojangUuid = null;

        // Query Mojang API
        try {
            const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(cleanName)}`);
            if (mojangRes.ok) {
                const data = await mojangRes.json();
                if (data && data.id) {
                    mojangUuid = data.id;
                }
            }
        } catch (e) {
            console.log("Mojang API lookup offline/skipped, generating fallback UUID");
        }

        if (!mojangUuid) {
            // Generate deterministic offline UUID string
            mojangUuid = `mc_${cleanName.toLowerCase()}_${Date.now()}`;
        }

        // Delete unverified entries
        try {
            await pool.execute("DELETE FROM account_links WHERE user_id = ?", [userId]);
        } catch (_) {}

        // Insert into account_links
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await pool.execute(
            "INSERT INTO account_links (user_id, mc_username, mc_uuid, link_code, is_verified, expires_at) VALUES (?, ?, ?, 'DIRECT_MOJANG', 1, ?)",
            [userId, cleanName, mojangUuid, expiresAt]
        );

        // Update users table with Mojang skin head avatar
        const mcAvatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/128`;
        await pool.execute(
            "UPDATE users SET mojang_username = ?, mojang_uuid = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
            [cleanName, mojangUuid, mcAvatarUrl, userId]
        );

        res.json({
            success: true,
            message: `Akun Mojang ${cleanName} berhasil dihubungkan!`,
            mcUsername: cleanName,
            mcUuid: mojangUuid,
            mcAvatarUrl: mcAvatarUrl
        });

    } catch (err) {
        console.error("LINK MOJANG ERROR:", err);
        res.status(500).json({ success: false, message: "Gagal menghubungkan akun Mojang" });
    }
};

exports.unlinkMinecraftAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        await pool.execute("DELETE FROM account_links WHERE user_id = ?", [userId]);
        await pool.execute("UPDATE users SET mojang_username = NULL, mojang_uuid = NULL WHERE id = ?", [userId]);

        res.json({ success: true, message: "Koneksi akun Minecraft/Mojang berhasil diputus." });
    } catch (err) {
        console.error("UNLINK MC ERROR:", err);
        res.status(500).json({ success: false, message: "Gagal memutuskan tautan Minecraft" });
    }
};
