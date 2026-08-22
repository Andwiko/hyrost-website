const pool = require('../config/mysql');
const { readPaymentMethods } = require('./adminController');

// Get All Ranks & Perks
exports.getRanksAndPerks = async (req, res) => {
    try {
        const [roles] = await pool.execute('SELECT * FROM roles ORDER BY price_coin ASC, price_idr ASC');
        
        // Define default perks matrix for Minecraft Realm ranks
        const rankPerks = [
            {
                name: 'VIP',
                badge_text: 'VIP',
                badge_color: '#ffd700',
                price_coin: 100,
                price_idr: 15000,
                description: 'Pangkat pendatang baru dengan berbagai keuntungan dasar realm.',
                perks: [
                    'Akses perintah /fly di Lobby & Claim Land',
                    'Warna obrolan game Kuning Emas',
                    'Bonus +50 Koin Bronze klaim harian',
                    '1x Crate Key Common gratis per hari',
                    'Batas Klaim Tanah: 5,000 Blocks'
                ]
            },
            {
                name: 'MVP',
                badge_text: 'MVP',
                badge_color: '#06b6d4',
                price_coin: 250,
                price_idr: 35000,
                description: 'Pangkat populer pilihan pemain aktif realm.',
                perks: [
                    'Akses perintah /fly & /heal (cooldown 5m)',
                    'Warna obrolan game Cyan Glow',
                    'Akses perintah /hat & /workbench',
                    'Bonus +150 Koin Bronze klaim harian',
                    '2x Crate Key Rare gratis per hari',
                    'Batas Klaim Tanah: 15,000 Blocks'
                ]
            },
            {
                name: 'SULTAN',
                badge_text: 'SULTAN',
                badge_color: '#ec4899',
                price_coin: 500,
                price_idr: 75000,
                description: 'Pangkat elite dengan hak istimewa tinggi di realm.',
                perks: [
                    'Akses perintah /fly, /heal & /feed (tanpa cooldown)',
                    'Warna obrolan game Magenta Sultan & Neon Nameplate',
                    'Akses perintah /enderchest & /condense',
                    'Bonus +300 Koin Bronze + 5 Gold Coins harian',
                    '3x Crate Key Epic gratis per hari',
                    'Batas Klaim Tanah: 50,000 Blocks'
                ]
            },
            {
                name: 'HYROST ROYAL',
                badge_text: 'ROYAL',
                badge_color: '#8b5cf6',
                price_coin: 1000,
                price_idr: 150000,
                description: 'Pangkat tertinggi penguasa Hyrost Realm dengan seluruh akses unlimted.',
                perks: [
                    'Seluruh Akses Perintah VIP, MVP & SULTAN',
                    'Bebas Biaya Pajak Marketplace',
                    'Warna Obrolan Rainbow Animated & Tag ROYAL Eksklusif',
                    'Bonus +500 Koin Bronze + 15 Gold Coins harian',
                    '5x Crate Key Legendary gratis per hari',
                    'Batas Klaim Tanah: UNLIMITED Blocks'
                ]
            }
        ];

        // Merge DB roles if present
        const mergedRanks = rankPerks.map(defaultRank => {
            const dbRole = roles.find(r => r.name.toUpperCase() === defaultRank.name.toUpperCase());
            if (dbRole) {
                return {
                    id: dbRole.id,
                    name: dbRole.name,
                    badge_text: dbRole.badge_text || defaultRank.badge_text,
                    badge_color: dbRole.badge_color || defaultRank.badge_color,
                    price_coin: dbRole.price_coin || defaultRank.price_coin,
                    price_idr: dbRole.price_idr || defaultRank.price_idr,
                    description: dbRole.description || defaultRank.description,
                    perks: defaultRank.perks
                };
            }
            return defaultRank;
        });

        res.json({ success: true, ranks: mergedRanks });
    } catch (err) {
        console.error("GET RANKS ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data toko pangkat' });
    }
};

// Buy Rank with Gold Coins
exports.buyRankWithCoins = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rankName } = req.body;

        if (!rankName) {
            return res.status(400).json({ success: false, message: 'Nama pangkat wajib ditentukan' });
        }

        // Get user details & balance
        const [users] = await pool.execute('SELECT username, coin_gold, coin_silver, role FROM users WHERE id = ?', [userId]);
        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        const user = users[0];

        // Determine price by rank
        const rankPrices = {
            'VIP': 100,
            'MVP': 250,
            'SULTAN': 500,
            'HYROST ROYAL': 1000,
            'ROYAL': 1000
        };

        const price = rankPrices[rankName.toUpperCase()] || 100;

        if (user.coin_gold < price) {
            return res.status(400).json({
                success: false,
                message: `Saldo Koin Gold tidak cukup. Diperlukan ${price} Gold Coins (Saldo Anda: ${user.coin_gold} Gold Coins)`
            });
        }

        // Deduct Gold Coins & update role
        await pool.execute('UPDATE users SET coin_gold = coin_gold - ?, role = ? WHERE id = ?', [price, rankName, userId]);

        // Log transaction & record delivery queue
        await pool.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [userId, 'BUY_RANK', `Purchased rank "${rankName}" for ${price} Gold Coins`]);
        await pool.execute('INSERT INTO pending_deliveries (user_id, item_type, item_name, status, plugin_id, source) VALUES (?, ?, ?, ?, ?, ?)', [userId, 'RANK', rankName, 'pending', 'hyrost_bridge', 'store']);

        res.json({
            success: true,
            message: `Selamat! Anda berhasil membeli Pangkat '${rankName}' seharga ${price} Gold Coins!`,
            newRole: rankName,
            newGoldBalance: user.coin_gold - price
        });
    } catch (err) {
        console.error("BUY RANK ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal memproses transaksi pangkat' });
    }
};

// Buy Rank with Real Money — creates pending payment order (Midtrans or manual approval)
exports.buyRankWithRealMoney = async (req, res) => {
    const paymentController = require('./paymentController');
    return paymentController.createRankPayment(req, res);
};

