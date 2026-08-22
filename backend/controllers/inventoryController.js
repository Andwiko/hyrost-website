const pool = require('../config/mysql');
const { enqueueDelivery, resolveDeliveryMeta, getLinkedAccount } = require('../utils/pluginDelivery');

const TYPE_ICONS = {
  cosmetic: 'fa-feather-alt',
  nametag: 'fa-tag',
  badge: 'fa-certificate',
  nameplate: 'fa-id-card',
  weapon: 'fa-khanda',
  potion: 'fa-flask',
  key: 'fa-key',
  general: 'fa-box',
  item: 'fa-cube',
  rank: 'fa-crown',
};

function formatItem(row) {
  return {
    id: row.id,
    name: row.item_name,
    desc: row.description || '',
    icon: row.icon || TYPE_ICONS[row.item_type] || 'fa-gem',
    type: row.item_type || 'general',
    rarity: row.rarity || 'common',
    itemCode: row.item_code || '',
    qty: row.quantity || 1,
    value: row.estimated_value || 0,
    equipped: !!row.is_equipped,
    source: row.source || 'unknown',
    sourceId: row.source_id || null,
    createdAt: row.created_at,
    mcClaimStatus: row.mc_claim_status || 'none',
    pendingDeliveryId: row.pending_delivery_id || null,
    minecraftMaterial: row.minecraft_material || null,
    deliveryType: row.delivery_type || 'item',
    pluginId: row.plugin_id || 'hyrost_bridge',
    pluginCommands: row.plugin_commands || null,
    canClaimToMc: !row.mc_claim_status || row.mc_claim_status === 'none',
  };
}

exports.getMyInventory = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM user_inventory WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(formatItem));
  } catch (err) {
    console.error('GET INVENTORY ERROR:', err);
    res.status(500).json({ message: 'Gagal memuat inventaris' });
  }
};

exports.claimItemToMinecraft = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const link = await getLinkedAccount(userId);
    if (!link) {
      return res.status(400).json({
        success: false,
        message: 'Akun Minecraft belum ditautkan! Tautkan akun di halaman Profil terlebih dahulu.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM user_inventory WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Item inventaris tidak ditemukan' });
    }

    const item = rows[0];
    if (item.mc_claim_status === 'queued') {
      return res.status(400).json({
        success: false,
        message: 'Item sudah dalam antrean klaim Minecraft. Ketik /claim di server.',
      });
    }
    if (item.mc_claim_status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Item ini sudah pernah diklaim ke Minecraft.',
      });
    }

    const delivery = await enqueueDelivery({
      userId,
      inventoryId: item.id,
      source: 'inventory',
      itemName: item.item_name,
      itemType: item.item_type,
      itemCode: item.item_code,
      quantity: item.quantity || 1,
      minecraftMaterial: item.minecraft_material,
      deliveryType: item.delivery_type,
      pluginCommands: item.plugin_commands,
      pluginId: item.plugin_id,
      catalogItemCode: item.item_code,
    });

    res.json({
      success: true,
      deliveryId: delivery.deliveryId,
      pluginId: delivery.pluginId,
      message: `Item "${item.item_name}" masuk antrean HyrostBridge! Ketik /claim di server (${link.mc_username}).`,
    });
  } catch (err) {
    console.error('CLAIM INVENTORY TO MC ERROR:', err);
    res.status(500).json({ success: false, message: 'Gagal mengantrekan item ke plugin Minecraft' });
  }
};

exports.toggleEquip = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      'SELECT id, is_equipped FROM user_inventory WHERE id = ? AND user_id = ?',
      [itemId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Item tidak ditemukan' });

    const next = rows[0].is_equipped ? 0 : 1;
    await pool.execute('UPDATE user_inventory SET is_equipped = ? WHERE id = ? AND user_id = ?', [
      next,
      itemId,
      req.user.id,
    ]);
    res.json({ message: next ? 'Item dipasang' : 'Item dilepas', equipped: !!next });
  } catch (err) {
    console.error('TOGGLE EQUIP ERROR:', err);
    res.status(500).json({ message: 'Gagal memperbarui item' });
  }
};

exports.grantItem = async (req, res) => {
  try {
    const {
      userId,
      itemName,
      itemType = 'general',
      itemCode,
      catalogItemCode,
      quantity = 1,
      description = '',
      rarity = 'common',
      icon,
      estimatedValue = 0,
      minecraftMaterial,
      deliveryType,
      pluginCommands,
      pluginId,
    } = req.body;

    if (!userId || !itemName) {
      return res.status(400).json({ message: 'userId dan itemName wajib diisi' });
    }

    const meta = await resolveDeliveryMeta({
      itemName,
      itemType,
      itemCode,
      catalogItemCode,
      quantity,
      description,
      rarity,
      icon,
      minecraftMaterial,
      deliveryType,
      pluginCommands,
      pluginId,
    });

    const [result] = await pool.execute(
      `INSERT INTO user_inventory
        (user_id, item_name, item_type, item_code, quantity, description, rarity, icon, estimated_value, source, source_id,
         minecraft_material, delivery_type, plugin_commands, plugin_id, mc_claim_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_grant', NULL, ?, ?, ?, ?, 'none')`,
      [
        userId,
        meta.itemName,
        meta.itemType,
        meta.itemCode,
        quantity,
        meta.description || description,
        meta.rarity,
        meta.icon || TYPE_ICONS[meta.itemType] || 'fa-gem',
        estimatedValue,
        meta.minecraftMaterial,
        meta.deliveryType,
        meta.pluginCommands,
        meta.pluginId,
      ]
    );

    res.json({ message: 'Item berhasil diberikan', itemId: result.insertId });
  } catch (err) {
    console.error('GRANT ITEM ERROR:', err);
    res.status(500).json({ message: 'Gagal memberikan item' });
  }
};

exports.addToInventory = async (userId, item, source, sourceId) => {
  const meta = await resolveDeliveryMeta({
    itemName: item.name || item.item_name,
    itemType: item.type || item.item_type || 'cosmetic',
    itemCode: item.code || item.item_code || `item_${sourceId}`,
    catalogItemCode: item.catalogItemCode || item.catalog_item_code || item.code || item.item_code,
    quantity: item.quantity || 1,
    description: item.description || '',
    rarity: item.rarity || 'common',
    icon: item.icon,
    minecraftMaterial: item.minecraftMaterial || item.minecraft_material,
    deliveryType: item.deliveryType || item.delivery_type,
    pluginCommands: item.pluginCommands || item.plugin_commands,
    pluginId: item.pluginId || item.plugin_id,
  });

  const [result] = await pool.execute(
    `INSERT INTO user_inventory
      (user_id, item_name, item_type, item_code, quantity, description, rarity, icon, estimated_value, source, source_id,
       minecraft_material, delivery_type, plugin_commands, plugin_id, mc_claim_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none')`,
    [
      userId,
      meta.itemName,
      meta.itemType,
      meta.itemCode,
      item.quantity || 1,
      meta.description || item.description || '',
      meta.rarity,
      meta.icon || TYPE_ICONS[meta.itemType] || 'fa-gem',
      item.estimatedValue || item.price_bronze || 0,
      source,
      sourceId,
      meta.minecraftMaterial,
      meta.deliveryType,
      meta.pluginCommands,
      meta.pluginId,
    ]
  );
  return result.insertId;
};

module.exports = exports;
