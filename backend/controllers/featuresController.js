'use strict';

const pool = require('../config/mysql');
const localFileStore = require('../utils/localFileStore');
const googleDriveBackup = require('../utils/googleDriveBackup');
const { decryptBuffer } = require('../utils/localFileStore');
const fs = require('fs');
const path = require('path');

exports.getHealth = async (req, res) => {
  try {
    const poolMod = require('../config/mysql');
    const mysqlOk = poolMod.isMysqlConnected ? poolMod.isMysqlConnected() : true;
    const bridge = global.minecraftStatus;
    const bridgeAge = bridge?.lastUpdated
      ? Date.now() - new Date(bridge.lastUpdated).getTime()
      : null;

    let driveStatus = { enabled: googleDriveBackup.isEnabled(), ok: false };
    if (driveStatus.enabled) {
      driveStatus = { ...(await googleDriveBackup.verifyConnection()), enabled: true };
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storage: poolMod.getStorageMode ? poolMod.getStorageMode() : 'mysql',
      mysql: mysqlOk,
      minecraft: {
        online: bridge?.online !== false && bridgeAge !== null && bridgeAge < 90000,
        playerCount: bridge?.playerCount ?? 0,
        lastSeen: bridge?.lastUpdated || null,
      },
      googleDrive: driveStatus,
      smtp: require('../utils/mailer').isConfigured(),
      midtrans: process.env.MIDTRANS_ENABLED === 'true' && !!process.env.MIDTRANS_SERVER_KEY,
      discord: !!process.env.DISCORD_WEBHOOK_URL,
      sseSubscribers: require('../utils/liveChatBus').subscriberCount(),
      webOnline: require('../utils/webPresence').count(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const username = req.params.username;
    const [users] = await pool.execute(
      `SELECT id, username, role, avatar_url, coin_bronze, coin_silver, coin_gold, streak_count, created_at
       FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [username]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    const user = users[0];

    const [achievements] = await pool.execute(
      `SELECT a.code, a.title, a.icon, ua.earned_at FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ?`,
      [user.id]
    );

    const [threads] = await pool.execute('SELECT COUNT(*) AS c FROM threads WHERE user_id = ?', [user.id]);

    res.json({
      success: true,
      profile: {
        ...user,
        threadCount: threads[0]?.c || 0,
        achievements,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActivityFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      'SELECT action, details, created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    );
    res.json({ success: true, activities: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user?.id;
    const [all] = await pool.execute('SELECT * FROM achievements ORDER BY id');
    let earned = [];
    if (userId) {
      const [e] = await pool.execute('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);
      earned = e.map((x) => x.achievement_id);
    }
    res.json({
      success: true,
      achievements: all.map((a) => ({ ...a, earned: earned.includes(a.id) })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

async function grantAchievement(userId, code) {
  const [ach] = await pool.execute('SELECT * FROM achievements WHERE code = ?', [code]);
  if (!ach.length) return;
  const a = ach[0];
  const [exists] = await pool.execute('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?', [userId, a.id]);
  if (exists.length) return;
  await pool.execute('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)', [userId, a.id]);
  if (a.reward_bronze > 0) {
    await pool.execute('UPDATE users SET coin_bronze = coin_bronze + ? WHERE id = ?', [a.reward_bronze, userId]);
  }
}

exports.getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.execute('SELECT referral_code FROM users WHERE id = ?', [userId]);
    let code = users[0]?.referral_code;
    if (!code) {
      const { generateReferralCode } = require('../utils/security');
      const [u] = await pool.execute('SELECT username FROM users WHERE id = ?', [userId]);
      code = generateReferralCode(u[0]?.username);
      await pool.execute('UPDATE users SET referral_code = ? WHERE id = ?', [code, userId]);
    }
    const [count] = await pool.execute('SELECT COUNT(*) AS c FROM referrals WHERE referrer_id = ?', [userId]);
    res.json({ success: true, referralCode: code, referralCount: count[0]?.c || 0, rewardPerReferral: 100 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.claimVoteReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { voteSite } = req.body;
    const site = String(voteSite || 'minecraft-mp').slice(0, 50);

    const [today] = await pool.execute(
      `SELECT id FROM vote_records WHERE user_id = ? AND vote_site = ? AND DATE(voted_at) = CURDATE()`,
      [userId, site]
    );
    if (today.length) {
      return res.status(400).json({ success: false, message: 'Anda sudah vote hari ini' });
    }

    await pool.execute('INSERT INTO vote_records (user_id, vote_site) VALUES (?, ?)', [userId, site]);
    await pool.execute('UPDATE users SET coin_bronze = coin_bronze + 25 WHERE id = ?', [userId]);
    await grantAchievement(userId, 'voter');

    res.json({ success: true, message: 'Terima kasih sudah vote! +25 Koin Bronze' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getVoteSites = async (_req, res) => {
  res.json({
    success: true,
    sites: [
      { key: 'minecraft-mp', name: 'Minecraft-MP', url: 'https://minecraft-mp.com/server/hyrost', reward: 25 },
      { key: 'topg', name: 'TopG', url: 'https://topg.org/minecraft-servers/server-hyrost', reward: 25 },
    ],
  });
};

exports.syncMcLeaderboard = async (_req, res) => {
  try {
    const [sessions] = await pool.execute(
      'SELECT username, world, last_seen FROM mc_player_sessions ORDER BY last_seen DESC LIMIT 50'
    );
    const [users] = await pool.execute(
      `SELECT username, coin_gold, coin_silver, coin_bronze, role FROM users WHERE deleted_at IS NULL
       ORDER BY (coin_gold * 10000 + coin_silver * 100 + coin_bronze) DESC LIMIT 50`
    );
    res.json({ success: true, onlinePlayers: sessions, wealthLeaderboard: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reportInfraction = async (req, res) => {
  try {
    const { mcUsername, reason, severity = 'medium' } = req.body;
    if (!mcUsername || !reason) return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

    const [users] = await pool.execute(
      'SELECT u.id FROM users u JOIN account_links al ON al.user_id = u.id WHERE al.mc_username = ? LIMIT 1',
      [mcUsername]
    );
    if (!users.length) {
      return res.json({ success: true, message: 'Player not linked to web account — logged only' });
    }
    const userId = users[0].id;

    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'Admin' LIMIT 1");
    const staffId = admins[0]?.id || userId;

    await pool.execute(
      'INSERT INTO infractions (user_id, staff_id, type, reason) VALUES (?, ?, ?, ?)',
      [userId, staffId, severity, `[Plugin] ${reason}`]
    );

    res.json({ success: true, message: 'Infraction recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listScheduledCommands = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM scheduled_commands WHERE status = 'pending' ORDER BY run_at ASC LIMIT 50"
    );
    res.json({ success: true, commands: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createScheduledCommand = async (req, res) => {
  try {
    const { commandText, runAt } = req.body;
    if (!commandText || !runAt) return res.status(400).json({ success: false, message: 'Command dan waktu wajib' });
    await pool.execute(
      'INSERT INTO scheduled_commands (command_text, run_at, created_by) VALUES (?, ?, ?)',
      [commandText, new Date(runAt), req.user.id]
    );
    res.json({ success: true, message: 'Command dijadwalkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPendingScheduledForPlugin = async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, command_text FROM scheduled_commands WHERE status = 'pending' AND run_at <= NOW() LIMIT 20"
    );
    res.json({ success: true, commands: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markScheduledExecuted = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute("UPDATE scheduled_commands SET status = 'executed', executed_at = NOW() WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMcSessions = async (req, res) => {
  try {
    const { players } = req.body;
    if (!Array.isArray(players)) return res.status(400).json({ success: false, message: 'Invalid payload' });

    for (const p of players.slice(0, 200)) {
      if (!p.username) continue;
      await pool.execute(
        `INSERT INTO mc_player_sessions (username, world, x, y, z, last_seen)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE world = VALUES(world), x = VALUES(x), y = VALUES(y), z = VALUES(z), last_seen = NOW()`,
        [p.username, p.world || null, p.x || null, p.y || null, p.z || null]
      );
    }
    res.json({ success: true, count: players.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.restoreLocalBackup = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename || !/^backup-[\w.-]+\.(hybk|json)$/i.test(filename)) {
      return res.status(400).json({ success: false, message: 'Nama file backup tidak valid' });
    }
    const filePath = path.join(localFileStore.getBackupsDir(), path.basename(filename));
    if (!filePath.startsWith(localFileStore.getBackupsDir())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File tidak ditemukan' });

    let raw = fs.readFileSync(filePath);
    if (filename.endsWith('.hybk')) {
      raw = decryptBuffer(raw);
    }
    const backup = JSON.parse(raw.toString('utf8'));
    const data = backup.data || backup;

    if (data.settings) {
      for (const s of data.settings) {
        await pool.execute(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
          [s.setting_key, s.setting_value, s.setting_value]
        );
      }
    }

    res.json({ success: true, message: 'Backup settings restored. Full restore via Admin Panel JSON.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ success: false, message: 'notificationIds array required' });
    }
    for (const nid of notificationIds.slice(0, 50)) {
      await pool.execute(
        'INSERT IGNORE INTO notification_reads (user_id, notification_id) VALUES (?, ?)',
        [userId, parseInt(nid, 10)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.grantAchievement = grantAchievement;

exports.getBotInfo = async (req, res) => {
  try {
    let rawVersion = '2.54.5.1.1';
    let displayVersion = 'v2.54.5';
    let botName = 'Mei Labs';
    let prefix = '!';
    let commandsCount = 197;
    let featuresCount = 23;

    // Search for Bot package.json or bot-info.json
    const searchPaths = [
      path.join(__dirname, '../../../../A Mei Labs/package.json'),
      path.join(process.cwd(), '../A Mei Labs/package.json'),
      path.join(process.cwd(), '../../A Mei Labs/package.json'),
      path.join(__dirname, '../../bot/data/bot-info.json'),
      path.join(process.cwd(), 'bot/data/bot-info.json'),
      path.join(process.cwd(), 'data/bot-info.json'),
    ];

    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (data.version) {
            rawVersion = data.version;
            const cleanVer = String(rawVersion).replace(/^v/i, '');
            const parts = cleanVer.split('.');
            displayVersion = `v${parts.slice(0, 3).join('.')}`;
          }
          if (data.displayVersion) displayVersion = data.displayVersion;
          if (data.name) botName = data.name === 'mei-labs' ? 'Mei Labs' : data.name;
          if (data.prefix) prefix = data.prefix;
          if (data.commandsCount) commandsCount = data.commandsCount;
          if (data.featuresCount) featuresCount = data.featuresCount;
          break;
        } catch {}
      }
    }

    if (process.env.BOT_VERSION) {
      rawVersion = process.env.BOT_VERSION;
      const cleanVer = String(rawVersion).replace(/^v/i, '');
      const parts = cleanVer.split('.');
      displayVersion = `v${parts.slice(0, 3).join('.')}`;
    }

    res.json({
      success: true,
      name: botName,
      version: rawVersion,
      displayVersion: displayVersion,
      prefix,
      commandsCount,
      featuresCount,
      engine: 'Google Gemini AI & Lavalink HQ',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

