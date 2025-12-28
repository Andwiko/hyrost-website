const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars if not already loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'hyperion.kyth.me',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'u24_5PeM4Zb0ZG',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 's24_hyrost',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL Database Connected Successfully!');
        conn.release();
    })
    .catch(err => {
        console.error('❌ MySQL Database Connection Failed:', err.message);
    });

module.exports = pool;
