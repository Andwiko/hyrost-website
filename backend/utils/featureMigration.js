'use strict';

/** Additional feature tables — called from server.js initDB */
async function migrateFeatureTables(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      order_code VARCHAR(64) NOT NULL UNIQUE,
      order_type VARCHAR(30) DEFAULT 'rank',
      item_name VARCHAR(100) NOT NULL,
      amount_idr INT NOT NULL,
      payment_method VARCHAR(30),
      status VARCHAR(20) DEFAULT 'pending',
      midtrans_order_id VARCHAR(100),
      midtrans_token TEXT,
      promo_code VARCHAR(50),
      admin_note TEXT,
      approved_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id INT NOT NULL,
      notification_id INT NOT NULL,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, notification_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      title VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50) DEFAULT 'fa-trophy',
      reward_bronze INT DEFAULT 0,
      criteria_type VARCHAR(30) DEFAULT 'manual',
      criteria_value INT DEFAULT 1
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id INT NOT NULL,
      achievement_id INT NOT NULL,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_id INT NOT NULL,
      referred_user_id INT NOT NULL UNIQUE,
      referral_code VARCHAR(20),
      reward_claimed TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS vote_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      vote_site VARCHAR(50) NOT NULL,
      voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reward_claimed TINYINT(1) DEFAULT 0,
      UNIQUE KEY uniq_user_site_day (user_id, vote_site, voted_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS auction_bids (
      id INT AUTO_INCREMENT PRIMARY KEY,
      listing_id INT NOT NULL,
      bidder_id INT NOT NULL,
      amount INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
      FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_group_members (
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_group_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS scheduled_commands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      command_text TEXT NOT NULL,
      run_at DATETIME NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_by INT,
      executed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admin_totp (
      user_id INT PRIMARY KEY,
      secret VARCHAR(128) NOT NULL,
      enabled TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS mc_player_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      world VARCHAR(50),
      x DOUBLE, y DOUBLE, z DOUBLE,
      player_count INT DEFAULT 0,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_mc_user (username)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT,
      auth_key TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  const safeCols = (rows) => (Array.isArray(rows) ? rows.map((c) => c && (c.Field || c.field || c.COLUMN_NAME || '')).filter(Boolean) : []);

  const [userCols] = await pool.execute('SHOW COLUMNS FROM users');
  const names = safeCols(userCols);
  if (!names.includes('referral_code')) {
    await pool.execute('ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE NULL');
  }
  if (!names.includes('referred_by')) {
    await pool.execute('ALTER TABLE users ADD COLUMN referred_by INT NULL');
  }

  const [questCols] = await pool.execute('SHOW COLUMNS FROM quests');
  const qNames = safeCols(questCols);
  if (!qNames.includes('requirement_type')) {
    await pool.execute("ALTER TABLE quests ADD COLUMN requirement_type VARCHAR(30) DEFAULT 'daily_claim'");
  }
  if (!qNames.includes('requirement_value')) {
    await pool.execute('ALTER TABLE quests ADD COLUMN requirement_value INT DEFAULT 1');
  }

  const [mpCols] = await pool.execute('SHOW COLUMNS FROM marketplace_items');
  const mpNames = safeCols(mpCols);
  if (!mpNames.includes('listing_type')) {
    await pool.execute("ALTER TABLE marketplace_items ADD COLUMN listing_type VARCHAR(20) DEFAULT 'sale'");
  }
  if (!mpNames.includes('auction_ends_at')) {
    await pool.execute('ALTER TABLE marketplace_items ADD COLUMN auction_ends_at DATETIME NULL');
  }
  if (!mpNames.includes('current_bid')) {
    await pool.execute('ALTER TABLE marketplace_items ADD COLUMN current_bid INT DEFAULT 0');
  }
  if (!mpNames.includes('min_bid_increment')) {
    await pool.execute('ALTER TABLE marketplace_items ADD COLUMN min_bid_increment INT DEFAULT 10');
  }

  const defaultAchievements = [
    ['first_login', 'Pendatang Baru', 'Login pertama ke Hyrost Realm', 'fa-door-open', 50, 'manual', 1],
    ['forum_starter', 'Penjelajah Forum', 'Buat thread forum pertama', 'fa-comments', 100, 'forum_post', 1],
    ['referral_1', 'Recruiter', 'Ajak 1 teman bergabung', 'fa-user-plus', 200, 'referral', 1],
    ['voter', 'Pendukung Server', 'Vote server Hyrost', 'fa-thumbs-up', 75, 'vote', 1],
  ];
  for (const a of defaultAchievements) {
    await pool.execute(
      `INSERT IGNORE INTO achievements (code, title, description, icon, reward_bronze, criteria_type, criteria_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      a
    );
  }

  await pool.execute(`
    UPDATE quests SET requirement_type = 'daily_claim', requirement_value = 1 WHERE id = 1 AND (requirement_type IS NULL OR requirement_type = '')
  `).catch(() => {});
  await pool.execute(`
    UPDATE quests SET requirement_type = 'forum_reply', requirement_value = 1 WHERE id = 2
  `).catch(() => {});
  await pool.execute(`
    UPDATE quests SET requirement_type = 'cosmetic_owned', requirement_value = 1 WHERE id = 3
  `).catch(() => {});

  console.log('✅ Feature tables migrated (payments, achievements, auction, chat groups, etc.)');
}

module.exports = { migrateFeatureTables };
