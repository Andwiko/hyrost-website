const pool = require('../config/mysql');

const PROFILE_HEAD_CATALOG = [
  { key: 'steve', name: 'Steve', tag: 'Classic Hero', category: 'legends', url: 'https://cravatar.eu/helmavatar/Steve/128.png', isFree: true, unlockCostBronze: 0 },
  { key: 'alex', name: 'Alex', tag: 'Classic Heroine', category: 'legends', url: 'https://cravatar.eu/helmavatar/Alex/128.png', isFree: true, unlockCostBronze: 0 },
  { key: 'herobrine', name: 'Herobrine', tag: 'Legenda Mistik', category: 'legends', url: 'https://cravatar.eu/helmavatar/Herobrine/128.png', isFree: false, unlockCostBronze: 300 },
  { key: 'notch', name: 'Notch', tag: 'Minecraft Creator', category: 'legends', url: 'https://cravatar.eu/helmavatar/Notch/128.png', isFree: false, unlockCostBronze: 300 },
  { key: 'dream', name: 'Dream', tag: 'Speedrun King', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Dream/128.png', isFree: false, unlockCostBronze: 500 },
  { key: 'technoblade', name: 'Technoblade', tag: 'The Pig King', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Technoblade/128.png', isFree: false, unlockCostBronze: 500 },
  { key: 'mumbojumbo', name: 'MumboJumbo', tag: 'Redstone Master', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/MumboJumbo/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'grian', name: 'Grian', tag: 'Master Builder', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Grian/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'dantdm', name: 'DanTDM', tag: 'Diamond Minecart', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/DanTDM/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'skeppy', name: 'Skeppy', tag: 'Diamond Knight', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Skeppy/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'badboyhalo', name: 'BadBoyHalo', tag: 'Demon Hero', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/BadBoyHalo/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'tommyinnit', name: 'TommyInnit', tag: 'Chaos King', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/TommyInnit/128.png', isFree: false, unlockCostBronze: 500 },
  { key: 'tubbo', name: 'Tubbo', tag: 'Bee Master', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Tubbo/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'ranboo', name: 'Ranboo', tag: 'Ender Prince', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Ranboo/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'georgenotfound', name: 'GeorgeNF', tag: 'Goggles Hero', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/GeorgeNotFound/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'sapnap', name: 'Sapnap', tag: 'Fire Warrior', category: 'youtubers', url: 'https://cravatar.eu/helmavatar/Sapnap/128.png', isFree: false, unlockCostBronze: 400 },
  { key: 'creeper', name: 'Creeper', tag: 'Creeper Head', category: 'mobs', url: 'https://cravatar.eu/helmavatar/MHF_Creeper/128.png', isFree: true, unlockCostBronze: 0 },
  { key: 'enderman', name: 'Enderman', tag: 'Enderman Head', category: 'mobs', url: 'https://cravatar.eu/helmavatar/MHF_Enderman/128.png', isFree: true, unlockCostBronze: 0 },
  { key: 'pigman', name: 'Zombie Pigman', tag: 'Pigman Head', category: 'mobs', url: 'https://cravatar.eu/helmavatar/MHF_PigZombie/128.png', isFree: true, unlockCostBronze: 0 },
  { key: 'iron_golem', name: 'Iron Golem', tag: 'Iron Golem Head', category: 'mobs', url: 'https://cravatar.eu/helmavatar/MHF_Golem/128.png', isFree: true, unlockCostBronze: 0 },
];

function getCatalogEntry(headKey) {
  return PROFILE_HEAD_CATALOG.find((h) => h.key === headKey) || null;
}

async function seedCatalog() {
  for (const head of PROFILE_HEAD_CATALOG) {
    await pool.execute(
      `INSERT INTO profile_head_catalog (head_key, name, head_url, tag, category, is_free, unlock_cost_bronze, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), head_url=VALUES(head_url), tag=VALUES(tag), category=VALUES(category), is_free=VALUES(is_free), unlock_cost_bronze=VALUES(unlock_cost_bronze)`,
      [head.key, head.name, head.url, head.tag, head.category, head.isFree ? 1 : 0, head.unlockCostBronze, PROFILE_HEAD_CATALOG.indexOf(head)]
    );
  }
}

async function grantDefaultHeads(userId) {
  const freeHeads = PROFILE_HEAD_CATALOG.filter((h) => h.isFree);
  for (const head of freeHeads) {
    await pool.execute(
      `INSERT IGNORE INTO user_owned_heads (user_id, head_key, head_url, head_name, source) VALUES (?, ?, ?, ?, 'default')`,
      [userId, head.key, head.url, head.name]
    );
  }
}

async function getOwnedHeadKeys(userId) {
  const [rows] = await pool.execute(
    'SELECT head_key FROM user_owned_heads WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.head_key);
}

async function userOwnsHead(userId, headKey) {
  if (!headKey) return false;
  const catalog = getCatalogEntry(headKey);
  if (catalog?.isFree) return true;
  const [rows] = await pool.execute(
    'SELECT id FROM user_owned_heads WHERE user_id = ? AND head_key = ? LIMIT 1',
    [userId, headKey]
  );
  return rows.length > 0;
}

async function grantHead(userId, headKey, source = 'unlock') {
  const catalog = getCatalogEntry(headKey);
  if (!catalog) return false;
  await pool.execute(
    `INSERT IGNORE INTO user_owned_heads (user_id, head_key, head_url, head_name, source) VALUES (?, ?, ?, ?, ?)`,
    [userId, headKey, catalog.url, catalog.name, source]
  );
  return true;
}

async function grantCustomHead(userId, headKey, headUrl, headName, source = 'custom') {
  await pool.execute(
    `INSERT INTO user_owned_heads (user_id, head_key, head_url, head_name, source) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE head_url=VALUES(head_url), head_name=VALUES(head_name)`,
    [userId, headKey, headUrl, headName, source]
  );
}

module.exports = {
  PROFILE_HEAD_CATALOG,
  getCatalogEntry,
  seedCatalog,
  grantDefaultHeads,
  getOwnedHeadKeys,
  userOwnsHead,
  grantHead,
  grantCustomHead,
};
