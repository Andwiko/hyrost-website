'use strict';

const pool = require('../config/mysql');

async function checkQuestCompletion(userId, quest) {
  const type = (quest.requirement_type || 'manual').toLowerCase();
  const value = parseInt(quest.requirement_value || '1', 10);

  switch (type) {
    case 'daily_claim': {
      const [rows] = await pool.execute(
        'SELECT last_claim_time FROM users WHERE id = ?',
        [userId]
      );
      const last = rows[0]?.last_claim_time;
      if (!last) return { ok: false, reason: 'Belum pernah klaim daily reward' };
      const hours = (Date.now() - new Date(last).getTime()) / 3600000;
      return hours < 48
        ? { ok: true }
        : { ok: false, reason: 'Klaim daily reward terlebih dahulu' };
    }
    case 'forum_post': {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS c FROM threads WHERE user_id = ?',
        [userId]
      );
      return (rows[0]?.c || 0) >= value
        ? { ok: true }
        : { ok: false, reason: `Buat minimal ${value} thread forum` };
    }
    case 'forum_reply': {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS c FROM replies WHERE user_id = ?',
        [userId]
      );
      return (rows[0]?.c || 0) >= value
        ? { ok: true }
        : { ok: false, reason: `Balas minimal ${value} thread` };
    }
    case 'cosmetic_owned': {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS c FROM user_cosmetics WHERE user_id = ?',
        [userId]
      );
      return (rows[0]?.c || 0) >= value
        ? { ok: true }
        : { ok: false, reason: `Miliki minimal ${value} item kosmetik` };
    }
    case 'referral': {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS c FROM referrals WHERE referrer_id = ?',
        [userId]
      );
      return (rows[0]?.c || 0) >= value
        ? { ok: true }
        : { ok: false, reason: `Ajak ${value} teman mendaftar` };
    }
    case 'vote': {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS c FROM vote_records WHERE user_id = ?',
        [userId]
      );
      return (rows[0]?.c || 0) >= value
        ? { ok: true }
        : { ok: false, reason: `Vote server di ${value} situs` };
    }
    case 'manual':
    default:
      return { ok: false, reason: 'Misi belum memenuhi syarat' };
  }
}

module.exports = { checkQuestCompletion };
