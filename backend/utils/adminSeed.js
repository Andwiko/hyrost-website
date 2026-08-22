const bcrypt = require('bcryptjs');

function getAdminSeedConfig() {
  const username = process.env.ADMIN_SEED_USERNAME;
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!username || !email || !password) return null;
  return { username, email, password };
}

async function ensureAdminUser(pool) {
  const config = getAdminSeedConfig();
  if (!config) {
    console.log(
      'ℹ️  Admin seed skipped — set ADMIN_SEED_USERNAME, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD in .env to auto-create admin on first run.'
    );
    return;
  }

  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [config.username, config.email]
  );

  if (rows.length > 0) {
    console.log(`ℹ️  Admin user '${config.username}' already exists — password unchanged.`);
    return;
  }

  const hash = await bcrypt.hash(config.password, await bcrypt.genSalt(10));
  await pool.execute(
    `INSERT INTO users (username, email, password, role, coin_bronze, coin_silver, coin_gold, avatar_url)
     VALUES (?, ?, ?, 'Admin', 1000, 1000, 1000, ?)`,
    [
      config.username,
      config.email,
      hash,
      `https://ui-avatars.com/api/?name=${encodeURIComponent(config.username)}&background=6366f1&color=fff`,
    ]
  );
  console.log(`✅ Admin account '${config.username}' created.`);
}

async function seedInMemoryAdmin(inMemoryStore) {
  const config = getAdminSeedConfig();
  if (!config) return;

  const hash = await bcrypt.hash(config.password, await bcrypt.genSalt(10));
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(config.username)}&background=6366f1&color=fff`;

  const existing = inMemoryStore.users.find(
    (u) =>
      (u.username && u.username.toLowerCase() === config.username.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === config.email.toLowerCase())
  );

  if (existing) {
    existing.password = hash;
    existing.role = 'Admin';
    return;
  }

  inMemoryStore.users.push({
    id: inMemoryStore.users.length + 1,
    username: config.username,
    email: config.email,
    password: hash,
    role: 'Admin',
    avatar_url: avatar,
    google_id: null,
    coin_bronze: 1000,
    coin_silver: 1000,
    coin_gold: 1000,
    last_claim_time: null,
    created_at: new Date(),
    deleted_at: null,
  });
}

module.exports = { getAdminSeedConfig, ensureAdminUser, seedInMemoryAdmin };
