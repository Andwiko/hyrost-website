const path = require("path");
const Module = require("module");

// Ensure node_modules paths are searched in container root and www root
const extraPaths = [
  path.resolve(__dirname, "../node_modules"),
  path.resolve(__dirname, "../../node_modules"),
  "/home/container/www/node_modules",
  "/home/container/node_modules"
];
extraPaths.forEach(p => {
  if (Module.globalPaths && !Module.globalPaths.includes(p)) {
    Module.globalPaths.push(p);
  }
});

let dotenv;
try {
  dotenv = require("dotenv");
} catch (e) {
  console.log("dotenv not found, skipping .env file loading");
}

// Load env vars BEFORE everything else
if (dotenv) {
  dotenv.config({ path: path.join(__dirname, "../.env") });
}

// Security & Default Env Vars
const { getJwtSecret } = require("./utils/security");
process.env.JWT_SECRET = getJwtSecret();

if (!process.env.PORT) {
  process.env.PORT = '3044';
}

const app = require("./app");
const pool = require("./config/mysql");
const { ensureAdminUser } = require("./utils/adminSeed");
const localFileStore = require("./utils/localFileStore");
const { startAutoBackup, runBackup } = require("./utils/autoBackup");

const initDB = async () => {
  const safeCols = (rows) => Array.isArray(rows) ? rows.map((c) => c.Field || c.field || '') : [];
  try {
    // --- 1. CORE TABLES ---

    // Users Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'Member',
                avatar_url LONGTEXT,
                google_id VARCHAR(255),
                coin_bronze INT DEFAULT 0,
                coin_silver INT DEFAULT 0,
                coin_gold INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL
            )
        `);

    // Migration: Ensure new columns exist on users table
    const [connCols] = await pool.execute("SHOW COLUMNS FROM users");
    const connColNames = safeCols(connCols);
    if (!connColNames.includes("discord_id"))
      await pool.execute("ALTER TABLE users ADD COLUMN discord_id VARCHAR(255) DEFAULT NULL");
    if (!connColNames.includes("discord_username"))
      await pool.execute("ALTER TABLE users ADD COLUMN discord_username VARCHAR(255) DEFAULT NULL");
    if (!connColNames.includes("discord_avatar"))
      await pool.execute("ALTER TABLE users ADD COLUMN discord_avatar LONGTEXT DEFAULT NULL");
    if (!connColNames.includes("mojang_username"))
      await pool.execute("ALTER TABLE users ADD COLUMN mojang_username VARCHAR(255) DEFAULT NULL");
    if (!connColNames.includes("mojang_uuid"))
      await pool.execute("ALTER TABLE users ADD COLUMN mojang_uuid VARCHAR(255) DEFAULT NULL");

    // Roles Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                badge_text VARCHAR(50),
                badge_color VARCHAR(20) DEFAULT '#888888',
                badge_style VARCHAR(50) DEFAULT 'normal',
                price_coin INT DEFAULT 0,
                price_idr INT DEFAULT 0,
                description TEXT,
                permissions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Migration: Ensure new columns exist
    const [roleCols] = await pool.execute("SHOW COLUMNS FROM roles");
    const colNames = safeCols(roleCols);
    if (!colNames.includes("badge_text"))
      await pool.execute("ALTER TABLE roles ADD COLUMN badge_text VARCHAR(50)");
    if (!colNames.includes("badge_color"))
      await pool.execute(
        "ALTER TABLE roles ADD COLUMN badge_color VARCHAR(20) DEFAULT '#888888'",
      );
    if (!colNames.includes("badge_style"))
      await pool.execute(
        "ALTER TABLE roles ADD COLUMN badge_style VARCHAR(50) DEFAULT 'normal'",
      );
    if (!colNames.includes("price_coin"))
      await pool.execute(
        "ALTER TABLE roles ADD COLUMN price_coin INT DEFAULT 0",
      );
    if (!colNames.includes("price_idr"))
      await pool.execute(
        "ALTER TABLE roles ADD COLUMN price_idr INT DEFAULT 0",
      );
    if (!colNames.includes("description"))
      await pool.execute("ALTER TABLE roles ADD COLUMN description TEXT");

    // Activity Logs
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action VARCHAR(255) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // --- 2. SEED ROLES & DEFAULT ADMIN ACCOUNT ---
    await pool.execute(
      "INSERT IGNORE INTO roles (name) VALUES ('Admin'), ('Member'), ('Vip')",
    );

    await ensureAdminUser(pool);

    // Messages Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NULL,
                group_id VARCHAR(100) NULL,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Migration: ensure is_read column exists in messages
    try {
      const [msgCols] = await pool.execute("SHOW COLUMNS FROM messages");
      const msgColNames = safeCols(msgCols);
      if (!msgColNames.includes("is_read")) {
        await pool.execute("ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE");
      }
      if (!msgColNames.includes("deleted_at")) {
        await pool.execute("ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP NULL");
      }
    } catch (e) {}

    // Friends Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS friends (
                id INT AUTO_INCREMENT PRIMARY KEY,
                requester_id INT NOT NULL,
                recipient_id INT NOT NULL,
                status TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Blocked Users Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                blocker_id INT NOT NULL,
                blocked_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Infractions Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS infractions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                staff_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                reason TEXT NOT NULL,
                duration VARCHAR(50) NULL,
                expires_at TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Jobs Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS jobs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                requirements TEXT NULL,
                reward VARCHAR(100) NULL,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Password Resets Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Support Tickets Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_code VARCHAR(50) NOT NULL,
                user_id INT NOT NULL,
                subject VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                priority VARCHAR(50) DEFAULT 'Medium',
                status VARCHAR(50) DEFAULT 'Open',
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Ticket Replies Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS ticket_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Banned Words Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS banned_words (
                id INT AUTO_INCREMENT PRIMARY KEY,
                word VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Forum Threads Table (Ensuring it's SQL-based)
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS threads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100) DEFAULT 'General',
                status VARCHAR(50) DEFAULT 'active',
                is_pinned TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Migration: ensure forum thread columns match forumController schema
    const [threadCols] = await pool.execute("SHOW COLUMNS FROM threads");
    const threadColNames = safeCols(threadCols);
    const threadMigrations = {
      is_pinned: "ALTER TABLE threads ADD COLUMN is_pinned TINYINT(1) DEFAULT 0",
      tags: "ALTER TABLE threads ADD COLUMN tags VARCHAR(500) DEFAULT ''",
      image_url: "ALTER TABLE threads ADD COLUMN image_url LONGTEXT DEFAULT NULL",
      views: "ALTER TABLE threads ADD COLUMN views INT DEFAULT 0",
    };
    for (const [col, sql] of Object.entries(threadMigrations)) {
      if (!threadColNames.includes(col)) {
        await pool.execute(sql);
      }
    }

    // Forum Replies Table
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

    const [replyCols] = await pool.execute("SHOW COLUMNS FROM replies");
    const replyColNames = safeCols(replyCols);
    const replyMigrations = {
      image_url: "ALTER TABLE replies ADD COLUMN image_url LONGTEXT DEFAULT NULL",
      likes: "ALTER TABLE replies ADD COLUMN likes INT DEFAULT 0",
    };
    for (const [col, sql] of Object.entries(replyMigrations)) {
      if (!replyColNames.includes(col)) {
        await pool.execute(sql);
      }
    }

    // Forum Votes Table
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

    await pool.execute(`
            CREATE TABLE IF NOT EXISTS reply_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reply_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_reply_like (reply_id, user_id),
                FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Global Settings Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
    // Seed default settings
    await pool.execute(
      "INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('announcement', ''), ('maintenance', 'false')",
    );

    // --- 3. COSMETIC SYSTEM TABLES ---

    // Cosmetic Items Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS cosmetic_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type ENUM('nametag', 'badge', 'nameplate') NOT NULL,
                description TEXT,
                price_bronze INT DEFAULT 0,
                price_silver INT DEFAULT 0,
                price_gold INT DEFAULT 0,
                price_idr INT DEFAULT 0,
                css_style TEXT,
                animation_data TEXT,
                icon_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Migration: Add new prices if missing
    const [cosCols] = await pool.execute("SHOW COLUMNS FROM cosmetic_items");
    const cosColNames = safeCols(cosCols);
    if (!cosColNames.includes("price_bronze"))
      await pool.execute(
        "ALTER TABLE cosmetic_items ADD COLUMN price_bronze INT DEFAULT 0",
      );
    if (!cosColNames.includes("price_silver"))
      await pool.execute(
        "ALTER TABLE cosmetic_items ADD COLUMN price_silver INT DEFAULT 0",
      );
    if (!cosColNames.includes("price_gold"))
      await pool.execute(
        "ALTER TABLE cosmetic_items ADD COLUMN price_gold INT DEFAULT 0",
      );

    // User Cosmetics (Ownership)
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS user_cosmetics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                is_equipped BOOLEAN DEFAULT FALSE,
                acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES cosmetic_items(id) ON DELETE CASCADE
            )
        `);

    // Migration: Add equipped columns and COINS to users
    const [userCols] = await pool.execute("SHOW COLUMNS FROM users");
    const userColNames = safeCols(userCols);
      if (!userColNames.includes("equipped_nametag"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN equipped_nametag INT DEFAULT NULL",
        );
      if (!userColNames.includes("equipped_badge"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN equipped_badge INT DEFAULT NULL",
        );
      if (!userColNames.includes("equipped_nameplate"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN equipped_nameplate INT DEFAULT NULL",
        );

      // Fix: Add Coins if missing (Critical for Account Page)
      if (!userColNames.includes("coin_bronze"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN coin_bronze INT DEFAULT 0",
        );
      if (!userColNames.includes("coin_silver"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN coin_silver INT DEFAULT 0",
        );
      if (!userColNames.includes("coin_gold"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN coin_gold INT DEFAULT 0",
        );
      if (!userColNames.includes("last_claim_time"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN last_claim_time TIMESTAMP NULL DEFAULT NULL",
        );

      // Skin Studio Premium Columns
      if (!userColNames.includes("skin_studio_vip_expires"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN skin_studio_vip_expires TIMESTAMP NULL DEFAULT NULL",
        );
      if (!userColNames.includes("skin_studio_plan"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN skin_studio_plan VARCHAR(100) DEFAULT NULL",
        );
      if (!userColNames.includes("skin_studio_ad_until"))
        await pool.execute(
          "ALTER TABLE users ADD COLUMN skin_studio_ad_until TIMESTAMP NULL DEFAULT NULL",
        );

    // Pending Deliveries Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS pending_deliveries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                mc_uuid VARCHAR(100) NULL,
                item_type VARCHAR(50) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_code VARCHAR(100) NULL,
                quantity INT DEFAULT 1,
                commands TEXT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivered_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Account Links Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS account_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                mc_username VARCHAR(100) NOT NULL,
                mc_uuid VARCHAR(100) NULL,
                verify_code VARCHAR(50) NULL,
                is_verified TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // Marketplace Items Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS marketplace_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                seller_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_type VARCHAR(50) DEFAULT 'cosmetic',
                price_coin INT DEFAULT 0,
                price_type VARCHAR(20) DEFAULT 'bronze',
                is_sold TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // User Inventory Table
    await pool.execute(`
            CREATE TABLE IF NOT EXISTS user_inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_type VARCHAR(50) DEFAULT 'general',
                item_code VARCHAR(100) NULL,
                description TEXT,
                rarity VARCHAR(20) DEFAULT 'common',
                icon VARCHAR(50) DEFAULT 'fa-gem',
                estimated_value INT DEFAULT 0,
                source VARCHAR(30) DEFAULT 'unknown',
                source_id INT NULL,
                quantity INT DEFAULT 1,
                is_equipped TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    const [invCols] = await pool.execute("SHOW COLUMNS FROM user_inventory");
    const invColNames = safeCols(invCols);
    if (!invColNames.includes("description"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN description TEXT");
    if (!invColNames.includes("rarity"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN rarity VARCHAR(20) DEFAULT 'common'");
    if (!invColNames.includes("icon"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN icon VARCHAR(50) DEFAULT 'fa-gem'");
    if (!invColNames.includes("estimated_value"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN estimated_value INT DEFAULT 0");
    if (!invColNames.includes("source"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN source VARCHAR(30) DEFAULT 'unknown'");
    if (!invColNames.includes("source_id"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN source_id INT NULL");
    if (!invColNames.includes("mc_claim_status"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN mc_claim_status VARCHAR(20) DEFAULT 'none'");
    if (!invColNames.includes("pending_delivery_id"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN pending_delivery_id INT NULL");
    if (!invColNames.includes("minecraft_material"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN minecraft_material VARCHAR(100) NULL");
    if (!invColNames.includes("delivery_type"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN delivery_type VARCHAR(30) DEFAULT 'item'");
    if (!invColNames.includes("plugin_commands"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN plugin_commands TEXT NULL");
    if (!invColNames.includes("plugin_id"))
      await pool.execute("ALTER TABLE user_inventory ADD COLUMN plugin_id VARCHAR(50) DEFAULT 'hyrost_bridge'");

    const [mpCols] = await pool.execute("SHOW COLUMNS FROM marketplace_items");
    const mpColNames = safeCols(mpCols);
    if (!mpColNames.includes("description"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN description TEXT");
    if (!mpColNames.includes("item_code"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN item_code VARCHAR(100) NULL");
    if (!mpColNames.includes("is_active"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN is_active TINYINT(1) DEFAULT 1");
    if (!mpColNames.includes("catalog_item_code"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN catalog_item_code VARCHAR(100) NULL");
    if (!mpColNames.includes("minecraft_material"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN minecraft_material VARCHAR(100) NULL");
    if (!mpColNames.includes("delivery_type"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN delivery_type VARCHAR(30) DEFAULT 'item'");
    if (!mpColNames.includes("plugin_commands"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN plugin_commands TEXT NULL");
    if (!mpColNames.includes("plugin_id"))
      await pool.execute("ALTER TABLE marketplace_items ADD COLUMN plugin_id VARCHAR(50) DEFAULT 'hyrost_bridge'");

    const [pdCols] = await pool.execute("SHOW COLUMNS FROM pending_deliveries");
    const pdColNames = safeCols(pdCols);
    if (!pdColNames.includes("inventory_id"))
      await pool.execute("ALTER TABLE pending_deliveries ADD COLUMN inventory_id INT NULL");
    if (!pdColNames.includes("plugin_id"))
      await pool.execute("ALTER TABLE pending_deliveries ADD COLUMN plugin_id VARCHAR(50) DEFAULT 'hyrost_bridge'");
    if (!pdColNames.includes("source"))
      await pool.execute("ALTER TABLE pending_deliveries ADD COLUMN source VARCHAR(50) DEFAULT 'web'");

    // --- 4. COMMUNITY & CONTENT TABLES ---
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS plugin_item_catalog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        item_type VARCHAR(50) DEFAULT 'item',
        minecraft_material VARCHAR(100) NULL,
        delivery_type VARCHAR(30) DEFAULT 'item',
        plugin_commands TEXT NULL,
        plugin_id VARCHAR(50) DEFAULT 'hyrost_bridge',
        description TEXT,
        rarity VARCHAR(20) DEFAULT 'common',
        icon VARCHAR(50) DEFAULT 'fa-cube',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const defaultCatalog = JSON.stringify([
      { item_code: 'diamond_sword', name: 'Diamond Sword', item_type: 'weapon', minecraft_material: 'DIAMOND_SWORD', delivery_type: 'item', plugin_commands: 'give {player} DIAMOND_SWORD {quantity}', plugin_id: 'hyrost_bridge', description: 'Pedang berlian standar', rarity: 'rare', icon: 'fa-khanda' },
      { item_code: 'netherite_ingot', name: 'Netherite Ingot', item_type: 'item', minecraft_material: 'NETHERITE_INGOT', delivery_type: 'item', plugin_commands: 'give {player} NETHERITE_INGOT {quantity}', plugin_id: 'hyrost_bridge', description: 'Ingot netherite langka', rarity: 'legendary', icon: 'fa-gem' },
      { item_code: 'common_key', name: 'Common Crate Key', item_type: 'key', minecraft_material: null, delivery_type: 'key', plugin_commands: 'crate give {player} common {quantity}', plugin_id: 'hyrost_bridge', description: 'Kunci crate common', rarity: 'common', icon: 'fa-key' },
      { item_code: 'vip_rank', name: 'VIP Rank', item_type: 'rank', minecraft_material: null, delivery_type: 'rank', plugin_commands: 'lp user {player} parent add vip', plugin_id: 'hyrost_bridge', description: 'Pangkat VIP in-game', rarity: 'epic', icon: 'fa-crown' },
      { item_code: 'gold_nametag', name: 'Gold Nametag', item_type: 'nametag', minecraft_material: null, delivery_type: 'nametag', plugin_commands: 'hyrost nametag give {player} gold', plugin_id: 'hyrost_bridge', description: 'Nametag emas', rarity: 'epic', icon: 'fa-tag' }
    ]);
    const catalogRows = JSON.parse(defaultCatalog);
    for (const item of catalogRows) {
      await pool.execute(
        `INSERT INTO plugin_item_catalog (item_code, name, item_type, minecraft_material, delivery_type, plugin_commands, plugin_id, description, rarity, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [item.item_code, item.name, item.item_type, item.minecraft_material, item.delivery_type, item.plugin_commands, item.plugin_id, item.description, item.rarity, item.icon]
      );
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS wiki_articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Guide',
        icon VARCHAR(50) DEFAULT 'fa-book',
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        target_role VARCHAR(50) DEFAULT 'ALL',
        sender_id INT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        reward_type VARCHAR(20) DEFAULT 'bronze',
        reward_amount INT DEFAULT 0,
        icon VARCHAR(50) DEFAULT 'fa-gift',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quest_id INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        claimed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_quest (user_id, quest_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        reward_type VARCHAR(20) DEFAULT 'bronze',
        reward_amount INT DEFAULT 0,
        max_uses INT DEFAULT 100,
        used_count INT DEFAULT 0,
        expires_at DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_vouchers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        voucher_id INT NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_voucher (user_id, voucher_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS live_chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(100) NOT NULL,
        avatar_url TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        reason TEXT,
        blocked_by VARCHAR(100) DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const defaultPayMethods = JSON.stringify([
      { id: 1, key: 'qris', name: 'QRIS Instant (All E-Wallet)', icon: 'fa-qrcode', color: '#10b981', account: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=HYROST_REALM_QRIS', instructions: 'Scan QRIS menggunakan GoPay, OVO, Dana, ShopeePay, LinkAja, atau Mobile Banking pilihan Anda.', is_active: true },
      { id: 2, key: 'bca_va', name: 'BCA Virtual Account', icon: 'fa-university', color: '#06b6d4', account: '88009442808943', instructions: 'Transfer tepat sesuai nominal ke nomor BCA Virtual Account di atas via ATM / M-Banking BCA.', is_active: true },
      { id: 3, key: 'mandiri_va', name: 'Mandiri Virtual Account', icon: 'fa-university', color: '#f59e0b', account: '88012398471230', instructions: 'Bayar melalui Livin by Mandiri atau ATM Mandiri dengan memasukkan nomor VA di atas.', is_active: true },
      { id: 4, key: 'credit_card', name: 'Kartu Kredit / Debit (3DS2)', icon: 'fa-credit-card', color: '#ec4899', account: 'Visa / Mastercard SSL Secured', instructions: 'Transaksi kartu kredit terenkripsi 256-Bit SSL dengan verifikasi OTP 3D Secure.', is_active: true },
      { id: 5, key: 'indomaret', name: 'Indomaret / Alfamart', icon: 'fa-store', color: '#84cc16', account: 'HYR-894210491', instructions: 'Tunjukkan kode bayar kasir Indomaret / Alfamart terdekat untuk menyelesaikan pembayaran.', is_active: true }
    ]);
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('custom_payment_methods', ?) ON DUPLICATE KEY UPDATE setting_value = setting_value",
      [defaultPayMethods]
    );

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS profile_head_catalog (
        head_key VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        head_url TEXT NOT NULL,
        tag VARCHAR(100) DEFAULT '',
        category VARCHAR(30) DEFAULT 'legends',
        is_free TINYINT(1) DEFAULT 0,
        unlock_cost_bronze INT DEFAULT 0,
        sort_order INT DEFAULT 0
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_owned_heads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        head_key VARCHAR(80) NOT NULL,
        head_url TEXT NOT NULL,
        head_name VARCHAR(100) DEFAULT '',
        source VARCHAR(30) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_head (user_id, head_key)
      )
    `);

    // --- 5. BUILD SHOWCASE & REFERRAL TABLES ---
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS build_showcases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url LONGTEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'Survival Base',
        coordinates VARCHAR(100) DEFAULT '',
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS showcase_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        showcase_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (showcase_id) REFERENCES build_showcases(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_showcase_like (showcase_id, user_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referrer_id INT NOT NULL,
        referred_user_id INT NOT NULL,
        status VARCHAR(30) DEFAULT 'completed',
        reward_claimed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_referral (referred_user_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS referral_claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        milestone_tier INT NOT NULL,
        reward_details VARCHAR(255) NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_milestone (user_id, milestone_tier)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) DEFAULT 'image/jpeg',
        file_size INT DEFAULT 0,
        storage_driver VARCHAR(30) DEFAULT 'local',
        gdrive_file_id VARCHAR(255) DEFAULT NULL,
        gdrive_view_link TEXT DEFAULT NULL,
        direct_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { migrateFeatureTables } = require('./utils/featureMigration');
    await migrateFeatureTables(pool);

    const { seedCatalog, grantDefaultHeads } = require('./utils/profileHeads');
    await seedCatalog();
    const [allUsers] = await pool.execute('SELECT id FROM users WHERE deleted_at IS NULL');
    for (const u of allUsers) {
      await grantDefaultHeads(u.id);
    }

    const [userCols2] = await pool.execute("SHOW COLUMNS FROM users");
    const userColNames2 = safeCols(userCols2);
    if (!userColNames2.includes("streak_count"))
      await pool.execute("ALTER TABLE users ADD COLUMN streak_count INT DEFAULT 0");
    if (!userColNames2.includes("referral_code"))
      await pool.execute("ALTER TABLE users ADD COLUMN referral_code VARCHAR(32) DEFAULT NULL");
    if (!userColNames2.includes("referred_by"))
      await pool.execute("ALTER TABLE users ADD COLUMN referred_by INT DEFAULT NULL");

    // --- CLEANUP: Remove all non-essential / test users permanently ---
    // Only keeps the designated Admin account 'Ikoo'. All other accounts
    // that registered themselves will remain; only cleanup demo/seed accounts.
    try {
      // Delete the secondary seeded Admin account if it exists
      await pool.execute(`DELETE FROM users WHERE LOWER(username) = 'admin' AND email = 'admin@hyrost.net'`);
      // Delete any auto-generated test user accounts (User1, User2 ... User99)
      await pool.execute(`DELETE FROM users WHERE username REGEXP '^User[0-9]+$'`);
      console.log("✅ Startup cleanup: removed test/seed accounts from database.");
    } catch(cleanErr) {
      console.warn("Notice during startup cleanup:", cleanErr.message);
    }

    console.log("✅ Database Initialization Complete (All Tables + Cosmetics + Dedicated Admin)");
  } catch (err) {
    console.error("❌ Database Initialization Failed:", err);
  }
};

// Start Server - Always listen IMMEDIATELY on 0.0.0.0 so Nginx reverse proxy never fails
const PORT = parseInt(process.env.PORT, 10) || 3044;
const HOST = process.env.HOST || '0.0.0.0';
const httpServer = app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
});

// Init DB and background tasks asynchronously (non-blocking)
(async () => {
  try {
    await localFileStore.ensureDirs();
    console.log(`📁 Local data directory: ${localFileStore.ROOT}`);
  } catch (err) {
    console.warn('⚠️ Local data directory init failed:', err.message);
  }

  try {
    await pool.waitForDb();
    await initDB();
    const mode = pool.getStorageMode ? pool.getStorageMode() : 'local-file';
    console.log(`🗄️  Storage mode: ${mode === 'mysql' ? 'MySQL (primary)' : 'Local file fallback (data/store/)'}`);
    startAutoBackup(pool);
  } catch (err) {
    console.warn('⚠️ DB init failed, running in local-file fallback mode:', err.message);
  }

  try {
    const auctionController = require('./controllers/auctionController');
    setInterval(() => auctionController.finalizeExpiredAuctions().catch(() => {}), 60000);
  } catch (err) {
    console.warn('⚠️ Auction controller not found, skipping:', err.message);
  }
})();

const shutdown = async () => {
  try { await runBackup(pool, 'shutdown'); } catch (e) {}
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Keep server alive
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // Keep server alive
});

