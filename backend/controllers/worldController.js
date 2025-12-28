const pool = require('../config/mysql');
const { logActivity } = require('./userController');

// 1. Get Leaderboard (Tahta)
// Weighted Score: Bronze=1, Silver=100, Gold=10000
exports.getLeaderboard = async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                username, avatar_url, role,
                coin_bronze, coin_silver, coin_gold,
                (coin_bronze + (coin_silver * 100) + (coin_gold * 10000)) as total_score
            FROM users 
            WHERE deleted_at IS NULL
            ORDER BY total_score DESC 
            LIMIT 10
        `);

        res.json(users);
    } catch (err) {
        console.error("GET LEADERBOARD ERROR:", err);
        res.status(500).json({ message: "Gagal mengambil data tahta" });
    }
};

// 2. Open Mystery Box (Kotak Misteri)
// Cost: 50 Bronze
// Rewards: Random coins
exports.openMysteryBox = async (req, res) => {
    const userId = req.user.id;
    const BOX_COST = 50;

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        // Check Balance
        const [userBalance] = await conn.execute("SELECT coin_bronze FROM users WHERE id = ? FOR UPDATE", [userId]);
        if (userBalance[0].coin_bronze < BOX_COST) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ message: "Koin Bronze tidak cukup (Butuh 50)" });
        }

        // Deduct Cost
        await conn.execute("UPDATE users SET coin_bronze = coin_bronze - ? WHERE id = ?", [BOX_COST, userId]);

        // Generate Reward
        // Logic: 70% Bronze (20-100), 25% Silver (1-5), 5% Gold (1)
        const rand = Math.random() * 100;
        let reward = { type: 'bronze', amount: 0 };
        
        if (rand < 70) {
            reward.type = 'bronze';
            reward.amount = Math.floor(Math.random() * 81) + 20; // 20 - 100
        } else if (rand < 95) {
            reward.type = 'silver';
            reward.amount = Math.floor(Math.random() * 5) + 1; // 1 - 5
        } else {
            reward.type = 'gold';
            reward.amount = 1;
        }

        // Add Reward
        const column = reward.type === 'bronze' ? 'coin_bronze' : (reward.type === 'silver' ? 'coin_silver' : 'coin_gold');
        await conn.execute(`UPDATE users SET ${column} = ${column} + ? WHERE id = ?`, [reward.amount, userId]);

        await conn.commit();
        conn.release();

        // Log
        logActivity(userId, 'Mystery Box', `Membuka Kotak Misteri dan mendapatkan ${reward.amount} ${reward.type}`);

        res.json({ 
            success: true, 
            message: "Kotak Misteri Berhasil Dibuka!",
            reward: reward
        });

    } catch (err) {
        console.error("OPEN MYSTERY BOX ERROR:", err);
        res.status(500).json({ message: "Gagal membuka kotak misteri" });
    }
};
