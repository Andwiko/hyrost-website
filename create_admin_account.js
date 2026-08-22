const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });
const pool = require('./backend/config/mysql');
const { getAdminSeedConfig } = require('./backend/utils/adminSeed');

const createAdmin = async () => {
    console.log('🚀 Starting Admin Creation Script...');

    const config = getAdminSeedConfig();
    if (!config) {
        console.error('❌ Set ADMIN_SEED_USERNAME, ADMIN_SEED_EMAIL, and ADMIN_SEED_PASSWORD in .env first.');
        process.exit(1);
    }

    try {
        await pool.waitForDb();

        await pool.execute("INSERT IGNORE INTO roles (name) VALUES ('Admin')");

        const hashedPassword = await bcrypt.hash(config.password, await bcrypt.genSalt(10));

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [config.username, config.email]
        );

        if (existing.length === 0) {
            await pool.execute(
                'INSERT INTO users (username, email, password, role, coin_bronze, coin_silver, coin_gold) VALUES (?, ?, ?, ?, 1000, 1000, 1000)',
                [config.username, config.email, hashedPassword, 'Admin']
            );
            console.log(`✅ SUCCESS: Admin user '${config.username}' created.`);
        } else {
            await pool.execute(
                'UPDATE users SET password = ?, role = ? WHERE username = ? OR email = ?',
                [hashedPassword, 'Admin', config.username, config.email]
            );
            console.log(`✅ SUCCESS: Admin user '${config.username}' password updated.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to create admin:', err.message);
        process.exit(1);
    }
};

createAdmin();
