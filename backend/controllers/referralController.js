const pool = require('../config/mysql');

const MILESTONES = [
  { tier: 1, required: 1, name: 'Perekrut Pemula', rewardDesc: '+50 Koin Bronze', rewardType: 'bronze', rewardAmount: 50 },
  { tier: 2, required: 3, name: 'Duta Komunitas', rewardDesc: '+150 Koin Silver', rewardType: 'silver', rewardAmount: 150 },
  { tier: 3, required: 5, name: 'Influencer Realm', rewardDesc: '+1 Koin Gold', rewardType: 'gold', rewardAmount: 1 },
  { tier: 4, required: 10, name: 'Legenda Afiliasi', rewardDesc: '+5 Koin Gold & Badge Eksklusif', rewardType: 'gold', rewardAmount: 5 }
];

const referralController = {
  // GET /api/referrals/stats
  getStats: async (req, res) => {
    try {
      const userId = req.user.id;

      // 1. Fetch user data
      const [users] = await pool.execute(
        'SELECT id, username, referral_code, coin_bronze, coin_silver, coin_gold FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      }

      const user = users[0];
      let referralCode = user.referral_code;

      // Generate referral code if missing
      if (!referralCode) {
        referralCode = (user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'HYR') + user.id.toString(36).toUpperCase();
        await pool.execute('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, userId]);
      }

      // 2. Fetch list of invited friends
      const [referredUsers] = await pool.execute(`
        SELECT u.id, u.username, u.avatar_url, u.created_at, u.role
        FROM referrals r
        JOIN users u ON r.referred_user_id = u.id
        WHERE r.referrer_id = ?
        ORDER BY r.created_at DESC
      `, [userId]);

      // 3. Fetch claimed milestones
      const [claimedRows] = await pool.execute(
        'SELECT milestone_tier, claimed_at FROM referral_claims WHERE user_id = ?',
        [userId]
      );
      const claimedTiers = new Set(claimedRows.map(c => c.milestone_tier));

      const totalInvited = referredUsers.length;

      const milestones = MILESTONES.map(m => ({
        ...m,
        is_completed: totalInvited >= m.required,
        is_claimed: claimedTiers.has(m.tier),
        progress: Math.min(totalInvited, m.required)
      }));

      return res.json({
        success: true,
        data: {
          referral_code: referralCode,
          invite_url: `${req.protocol}://${req.get('host')}/auth/register.html?ref=${referralCode}`,
          total_invited: totalInvited,
          invited_users: referredUsers,
          milestones
        }
      });
    } catch (err) {
      console.error('Error fetching referral stats:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil statistik referral' });
    }
  },

  // POST /api/referrals/claim-milestone
  claimMilestone: async (req, res) => {
    try {
      const userId = req.user.id;
      const { tier } = req.body;

      const milestone = MILESTONES.find(m => m.tier === parseInt(tier, 10));
      if (!milestone) {
        return res.status(400).json({ success: false, message: 'Tier milestone tidak valid' });
      }

      // Check total invited
      const [referred] = await pool.execute(
        'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?',
        [userId]
      );
      const totalInvited = referred[0]?.count || 0;

      if (totalInvited < milestone.required) {
        return res.status(400).json({
          success: false,
          message: `Anda membutuhkan ${milestone.required} undangan untuk klaim hadiah ini (saat ini: ${totalInvited})`
        });
      }

      // Check if already claimed
      const [claimed] = await pool.execute(
        'SELECT id FROM referral_claims WHERE user_id = ? AND milestone_tier = ?',
        [userId, milestone.tier]
      );

      if (claimed.length > 0) {
        return res.status(400).json({ success: false, message: 'Hadiah milestone ini sudah diklaim sebelumnya' });
      }

      // Grant rewards
      let coinColumn = 'coin_bronze';
      if (milestone.rewardType === 'silver') coinColumn = 'coin_silver';
      if (milestone.rewardType === 'gold') coinColumn = 'coin_gold';

      await pool.execute(
        `UPDATE users SET ${coinColumn} = ${coinColumn} + ? WHERE id = ?`,
        [milestone.rewardAmount, userId]
      );

      await pool.execute(
        'INSERT INTO referral_claims (user_id, milestone_tier, reward_details) VALUES (?, ?, ?)',
        [userId, milestone.tier, milestone.rewardDesc]
      );

      return res.json({
        success: true,
        message: `Selamat! Hadiah ${milestone.rewardDesc} berhasil diklaim!`
      });
    } catch (err) {
      console.error('Error claiming milestone:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengklaim hadiah milestone' });
    }
  }
};

module.exports = referralController;
