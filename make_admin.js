const pool = require('./backend/config/mysql');

const updateRoles = async () => {
    console.log("🚀 Starting Admin Role Update Script...");
    
    try {
        const emails = ['riwalandwiko03@gmail.com', 'wikocraft32@gmail.com'];
        
        // 1. Ensure 'Admin' role exists in roles table
        console.log("Checking if 'Admin' role exists...");
        try {
             await pool.execute("INSERT IGNORE INTO roles (name) VALUES ('Admin')");
        } catch(e) { 
            console.log("⚠️ Note: Role check skipped or already exists."); 
        }

        // 2. Update Users
        console.log(`Targeting emails: ${emails.join(', ')}`);
        
        const placeholders = emails.map(() => '?').join(',');
        const sql = `UPDATE users SET role = 'Admin' WHERE email IN (${placeholders})`;
        
        const [result] = await pool.execute(sql, emails);
        
        if (result.affectedRows > 0) {
            console.log(`✅ SUCCESS: Updated ${result.affectedRows} users to 'Admin' role.`);
        } else {
            console.log("⚠️ WARNING: No users were updated. Check if the emails are correct and exist in the 'users' table.");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR: Failed to update roles.");
        console.error(err);
        console.log("\n💡 TIP: Make sure your .env file has the correct DB_PASS and this script is in the project root.");
        process.exit(1);
    }
};

updateRoles();
