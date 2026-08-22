/**
 * Scheduled local backups of MySQL data → data/backups/ (AES-256-GCM encrypted)
 * Optional: auto-upload to Google Drive
 */
const localFileStore = require('./localFileStore');
const googleDriveBackup = require('./googleDriveBackup');

let backupRunning = false;

async function collectBackupData(pool) {
  const tables = [
    ['users', 'SELECT id, username, email, role, coin_bronze, coin_silver, coin_gold, created_at FROM users WHERE deleted_at IS NULL'],
    ['roles', 'SELECT * FROM roles'],
    ['settings', 'SELECT * FROM settings'],
    ['site_settings', 'SELECT * FROM site_settings'],
    ['cosmetic_items', 'SELECT * FROM cosmetic_items'],
    ['wiki_articles', 'SELECT * FROM wiki_articles'],
    ['vouchers', 'SELECT * FROM vouchers'],
    ['quests', 'SELECT * FROM quests'],
    ['plugin_item_catalog', 'SELECT * FROM plugin_item_catalog'],
    ['ip_blacklist', 'SELECT * FROM ip_blacklist'],
    ['threads', 'SELECT id, user_id, title, category, status, is_pinned, views, created_at FROM threads LIMIT 500'],
    ['tickets', 'SELECT id, ticket_code, user_id, subject, status, priority, created_at FROM tickets LIMIT 500'],
  ];

  const data = {};
  for (const [name, sql] of tables) {
    try {
      const [rows] = await pool.execute(sql);
      data[name] = rows || [];
    } catch {
      data[name] = [];
    }
  }
  return data;
}

async function runBackup(pool, reason = 'scheduled') {
  if (process.env.LOCAL_BACKUP_ENABLED === 'false') return null;
  if (backupRunning) return null;

  backupRunning = true;
  try {
    const payload = {
      version: '2.0',
      reason,
      timestamp: new Date().toISOString(),
      encrypted: process.env.LOCAL_BACKUP_ENCRYPT !== 'false',
      data: await collectBackupData(pool),
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${stamp}`;
    const filePath = await localFileStore.writeSecureBackup(filename, payload);

    const keep = parseInt(process.env.LOCAL_BACKUP_KEEP || '7', 10);
    await localFileStore.pruneBackups(keep);

    console.log(`💾 Local backup saved: ${filePath}`);

    if (googleDriveBackup.isEnabled()) {
      try {
        await googleDriveBackup.uploadBackupFile(filePath);
        await googleDriveBackup.pruneOldBackups();
      } catch (driveErr) {
        console.warn('⚠️ Google Drive upload failed:', driveErr.message);
      }
    }

    return filePath;
  } catch (err) {
    console.warn('⚠️ Local backup failed:', err.message);
    return null;
  } finally {
    backupRunning = false;
  }
}

function startAutoBackup(pool) {
  if (process.env.LOCAL_BACKUP_ENABLED === 'false') {
    console.log('ℹ️  Local auto-backup disabled (LOCAL_BACKUP_ENABLED=false)');
    return;
  }

  const hours = Math.max(1, parseInt(process.env.LOCAL_BACKUP_INTERVAL_HOURS || '24', 10));
  const ms = hours * 60 * 60 * 1000;

  setTimeout(() => runBackup(pool, 'startup').catch(() => {}), 15000);
  setInterval(() => runBackup(pool, 'scheduled').catch(() => {}), ms);

  console.log(`💾 Local auto-backup enabled (every ${hours}h → data/backups/)`);
  googleDriveBackup.logStartupStatus();
}

module.exports = { runBackup, startAutoBackup };
