const pool = require('../config/mysql');

const PLUGIN_ID = process.env.MINECRAFT_PLUGIN_ID || 'hyrost_bridge';

const COMMAND_TEMPLATES = {
  item: 'give {player} {material} {quantity}',
  weapon: 'give {player} {material} {quantity}',
  potion: 'give {player} {material} {quantity}',
  key: 'crate give {player} {item_code} {quantity}',
  cosmetic: 'hyrost cosmetic give {player} {item_code}',
  rank: 'lp user {player} parent add {item_code}',
  nametag: 'hyrost nametag give {player} {item_code}',
  badge: 'hyrost badge give {player} {item_code}',
  command: null,
};

function applyCommandTemplate(template, vars) {
  return template
    .replace(/\{player\}/g, vars.player || '{player}')
    .replace(/\{material\}/g, vars.material || 'DIAMOND')
    .replace(/\{quantity\}/g, String(vars.quantity || 1))
    .replace(/\{item_code\}/g, vars.itemCode || '');
}

function buildCommands(meta) {
  if (meta.pluginCommands) {
    const lines = String(meta.pluginCommands)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        applyCommandTemplate(line, {
          player: '{player}',
          material: meta.minecraftMaterial || meta.itemCode || 'DIAMOND',
          quantity: meta.quantity || 1,
          itemCode: meta.itemCode || '',
        })
      );
    return lines.join('\n');
  }

  const deliveryType = (meta.deliveryType || meta.itemType || 'item').toLowerCase();
  const template = COMMAND_TEMPLATES[deliveryType] || COMMAND_TEMPLATES.item;
  if (!template) return '';

  return applyCommandTemplate(template, {
    player: '{player}',
    material: meta.minecraftMaterial || meta.itemCode || 'DIAMOND',
    quantity: meta.quantity || 1,
    itemCode: meta.itemCode || '',
  });
}

async function getCatalogItem(itemCode) {
  if (!itemCode) return null;
  const [rows] = await pool.execute(
    'SELECT * FROM plugin_item_catalog WHERE item_code = ? AND is_active = 1 LIMIT 1',
    [itemCode]
  );
  return rows[0] || null;
}

async function resolveDeliveryMeta(input = {}) {
  const catalog = await getCatalogItem(input.catalogItemCode || input.itemCode);

  return {
    itemCode: catalog?.item_code || input.itemCode || 'unknown_item',
    itemName: catalog?.name || input.itemName || 'Item',
    itemType: catalog?.item_type || input.itemType || 'item',
    quantity: input.quantity || 1,
    minecraftMaterial: catalog?.minecraft_material || input.minecraftMaterial || null,
    deliveryType: catalog?.delivery_type || input.deliveryType || input.itemType || 'item',
    pluginCommands: catalog?.plugin_commands || input.pluginCommands || null,
    pluginId: catalog?.plugin_id || input.pluginId || PLUGIN_ID,
    description: catalog?.description || input.description || '',
    rarity: catalog?.rarity || input.rarity || 'common',
    icon: catalog?.icon || input.icon || null,
  };
}

async function getLinkedAccount(userId) {
  const [links] = await pool.execute(
    "SELECT mc_uuid, mc_username FROM account_links WHERE user_id = ? AND is_verified = 1 LIMIT 1",
    [userId]
  );
  return links[0] || null;
}

async function enqueueDelivery({ userId, inventoryId, source, ...meta }) {
  const resolved = await resolveDeliveryMeta(meta);
  const commands = buildCommands(resolved);
  const link = await getLinkedAccount(userId);

  const [result] = await pool.execute(
    `INSERT INTO pending_deliveries
      (user_id, mc_uuid, inventory_id, item_type, item_name, item_code, quantity, commands, plugin_id, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      userId,
      link?.mc_uuid || null,
      inventoryId || null,
      resolved.itemType,
      resolved.itemName,
      resolved.itemCode,
      resolved.quantity,
      commands,
      resolved.pluginId,
      source || 'web',
    ]
  );

  if (inventoryId) {
    await pool.execute(
      "UPDATE user_inventory SET mc_claim_status = 'queued', pending_delivery_id = ? WHERE id = ? AND user_id = ?",
      [result.insertId, inventoryId, userId]
    );
  }

  return {
    deliveryId: result.insertId,
    commands,
    pluginId: resolved.pluginId,
    mcUsername: link?.mc_username || null,
    mcUuid: link?.mc_uuid || null,
    resolved,
  };
}

async function finalizeDelivery(deliveryId, status = 'delivered') {
  const deliveryStatus = status === 'failed' ? 'failed' : 'delivered';

  const [rows] = await pool.execute('SELECT inventory_id FROM pending_deliveries WHERE id = ?', [deliveryId]);
  await pool.execute(
    "UPDATE pending_deliveries SET status = ?, delivered_at = NOW() WHERE id = ?",
    [deliveryStatus, deliveryId]
  );

  if (rows.length && rows[0].inventory_id) {
    const invStatus = deliveryStatus === 'delivered' ? 'delivered' : 'none';
    await pool.execute('UPDATE user_inventory SET mc_claim_status = ? WHERE id = ?', [
      invStatus,
      rows[0].inventory_id,
    ]);
  }

  return deliveryStatus;
}

function parseCommandsForPlugin(commands) {
  if (!commands) return [];
  return String(commands)
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean);
}

module.exports = {
  PLUGIN_ID,
  buildCommands,
  getCatalogItem,
  resolveDeliveryMeta,
  enqueueDelivery,
  finalizeDelivery,
  parseCommandsForPlugin,
};
