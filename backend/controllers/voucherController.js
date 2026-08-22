const pool = require('../config/mysql');

// Claim Voucher Code (User Endpoint)
exports.claimVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Kode voucher wajib diisi' });
        }

        const upperCode = code.trim().toUpperCase();

        // 1. Find voucher in DB / Memory Store
        const [vouchers] = await pool.execute('SELECT * FROM vouchers WHERE UPPER(code) = ?', [upperCode]);
        if (!vouchers || vouchers.length === 0) {
            return res.status(404).json({ success: false, message: 'Kode voucher tidak valid atau tidak ditemukan' });
        }

        const voucher = vouchers[0];

        // 2. Check if expired or max uses reached
        if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
            return res.status(400).json({ success: false, message: 'Kode voucher sudah habis (kuota penuh)' });
        }

        if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'Kode voucher telah kedaluwarsa' });
        }

        // 3. Check if user already claimed this voucher
        const [alreadyClaimed] = await pool.execute(
            'SELECT * FROM user_vouchers WHERE user_id = ? AND voucher_id = ?',
            [userId, voucher.id]
        );

        if (alreadyClaimed && alreadyClaimed.length > 0) {
            return res.status(400).json({ success: false, message: 'Anda sudah pernah mengklaim kode voucher ini' });
        }

        // 4. Record claim & update balance
        const coinCol = `coin_${voucher.reward_type || 'bronze'}`;
        await pool.execute(`UPDATE users SET ${coinCol} = ${coinCol} + ? WHERE id = ?`, [voucher.reward_amount, userId]);
        await pool.execute('INSERT INTO user_vouchers (user_id, voucher_id, claimed_at) VALUES (?, ?, NOW())', [userId, voucher.id]);
        await pool.execute('UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?', [voucher.id]);

        // Audit log
        await pool.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [userId, 'CLAIM_VOUCHER', `Claimed voucher ${upperCode} (+${voucher.reward_amount} ${voucher.reward_type})`]);

        res.json({
            success: true,
            message: `Selamat! Berhasil mengklaim voucher '${upperCode}' dan mendapatkan +${voucher.reward_amount} Koin ${voucher.reward_type.toUpperCase()}!`,
            rewardType: voucher.reward_type,
            rewardAmount: voucher.reward_amount
        });

    } catch (err) {
        console.error("CLAIM VOUCHER ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal memproses klaim kode voucher' });
    }
};

// Get All Vouchers (Admin Endpoint)
exports.getAllVouchers = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM vouchers ORDER BY id DESC');
        res.json({ success: true, vouchers: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar voucher' });
    }
};

// Create Voucher (Admin Endpoint)
exports.createVoucher = async (req, res) => {
    try {
        const { code, reward_type, reward_amount, max_uses, expires_at } = req.body;
        if (!code || !reward_amount) {
            return res.status(400).json({ success: false, message: 'Kode dan jumlah hadiah wajib diisi' });
        }

        const upperCode = code.trim().toUpperCase();

        await pool.execute(
            'INSERT INTO vouchers (code, reward_type, reward_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?)',
            [upperCode, reward_type || 'bronze', parseInt(reward_amount), parseInt(max_uses) || 100, expires_at || '2030-12-31']
        );

        if (req.user && req.user.id) {
            await pool.execute('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)', [req.user.id, 'CREATE_VOUCHER', `Created voucher ${upperCode}`]);
        }

        res.json({ success: true, message: `Voucher '${upperCode}' berhasil dibuat!` });
    } catch (err) {
        console.error("CREATE VOUCHER ERROR:", err);
        res.status(500).json({ success: false, message: 'Gagal membuat kode voucher baru' });
    }
};

// Delete Voucher (Admin Endpoint)
exports.deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM vouchers WHERE id = ?', [id]);
        res.json({ success: true, message: 'Voucher berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal menghapus voucher' });
    }
};
