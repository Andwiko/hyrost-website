const path = require('path');
const dotenv = require('dotenv');

// Load env vars BEFORE everything else
dotenv.config({ path: path.join(__dirname, '../.env') });

// Default Env Vars
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'fallback_secret_key_123';
if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/hyrost';

const app = require('./app');
const pool = require('./config/mysql');

const initDB = async () => {
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
        const colNames = roleCols.map(c => c.Field);
        if (!colNames.includes('badge_text')) await pool.execute("ALTER TABLE roles ADD COLUMN badge_text VARCHAR(50)");
        if (!colNames.includes('badge_color')) await pool.execute("ALTER TABLE roles ADD COLUMN badge_color VARCHAR(20) DEFAULT '#888888'");
        if (!colNames.includes('badge_style')) await pool.execute("ALTER TABLE roles ADD COLUMN badge_style VARCHAR(50) DEFAULT 'normal'");
        if (!colNames.includes('price_coin')) await pool.execute("ALTER TABLE roles ADD COLUMN price_coin INT DEFAULT 0");
        if (!colNames.includes('price_idr')) await pool.execute("ALTER TABLE roles ADD COLUMN price_idr INT DEFAULT 0");
        if (!colNames.includes('description')) await pool.execute("ALTER TABLE roles ADD COLUMN description TEXT");

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

        // --- 2. SEED ROLES & ADMIN ---
        await pool.execute("INSERT IGNORE INTO roles (name) VALUES ('Admin'), ('Member'), ('Vip')");
        
        // Promote specific user to Admin based on request
        await pool.execute("UPDATE users SET role = 'Admin' WHERE email = 'riwalandwiko03@gmail.com'");

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

        // Migration: Ensure threads has is_pinned
        const [threadCols] = await pool.execute("SHOW COLUMNS FROM threads");
        const threadColNames = threadCols.map(c => c.Field);
        if (!threadColNames.includes('is_pinned')) {
            await pool.execute("ALTER TABLE threads ADD COLUMN is_pinned TINYINT(1) DEFAULT 0");
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

        // Global Settings Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        // Seed default settings
        await pool.execute("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('announcement', ''), ('maintenance', 'false')");

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
        const cosColNames = cosCols.map(c => c.Field);
        if (!cosColNames.includes('price_bronze')) await pool.execute("ALTER TABLE cosmetic_items ADD COLUMN price_bronze INT DEFAULT 0");
        if (!cosColNames.includes('price_silver')) await pool.execute("ALTER TABLE cosmetic_items ADD COLUMN price_silver INT DEFAULT 0");
        if (!cosColNames.includes('price_gold')) await pool.execute("ALTER TABLE cosmetic_items ADD COLUMN price_gold INT DEFAULT 0");

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
        const userColNames = userCols.map(c => c.Field);
        if (!userColNames.includes('equipped_nametag')) await pool.execute("ALTER TABLE users ADD COLUMN equipped_nametag INT DEFAULT NULL");
        if (!userColNames.includes('equipped_badge')) await pool.execute("ALTER TABLE users ADD COLUMN equipped_badge INT DEFAULT NULL");
        if (!userColNames.includes('equipped_nameplate')) await pool.execute("ALTER TABLE users ADD COLUMN equipped_nameplate INT DEFAULT NULL");
        
        // Fix: Add Coins if missing (Critical for Account Page)
        if (!userColNames.includes('coin_bronze')) await pool.execute("ALTER TABLE users ADD COLUMN coin_bronze INT DEFAULT 0");
        if (!userColNames.includes('coin_silver')) await pool.execute("ALTER TABLE users ADD COLUMN coin_silver INT DEFAULT 0");
        if (!userColNames.includes('coin_gold')) await pool.execute("ALTER TABLE users ADD COLUMN coin_gold INT DEFAULT 0");

        console.log('✅ Database Initialization Complete (All Tables + Cosmetics)');
    } catch (err) {
        console.error('❌ Database Initialization Failed:', err);
    }
};

// Start Server
initDB().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
