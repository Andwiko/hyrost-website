const path = require('path');
const dotenv = require('dotenv');

// Load env vars explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = require('./backend/config/mysql');

const updateRoles = async () => {
    try {
        const emails = ['riwalandwiko03@gmail.com', 'wikocraft32@gmail.com'];
        
        // 1. Ensure 'Admin' role exists in roles table (just in case)
        try {
             await pool.execute("INSERT IGNORE INTO roles (name) VALUES ('Admin')");
        } catch(e) { console.log("Role insertion skipped/failed", e.message); }

        // 2. Update Users
        const placeholders = emails.map(() => '?').join(',');
        const sql = `UPDATE users SET role = 'Admin' WHERE email IN (${placeholders})`;
        
        console.log(`Executing: ${sql} for ${emails.join(', ')}`);
        
        const [result] = await pool.execute(sql, emails);
        
        console.log("✅ Update Result:", result);
        console.log(`Updated ${result.affectedRows} users to Admin.`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Error updating roles:", err);
        process.exit(1);
    }
};

updateRoles();
