const pool = require('../config/mysql');
const { PLUGIN_ID, getCatalogItem } = require('../utils/pluginDelivery');

exports.getPluginInfo = async (req, res) => {
  res.json({
    success: true,
    plugin: {
      id: PLUGIN_ID,
      name: 'HyrostBridge',
      version: '1.0',
      supportedDeliveryTypes: ['item', 'weapon', 'potion', 'key', 'cosmetic', 'rank', 'nametag', 'badge', 'command'],
      endpoints: {
        verifyLink: '/api/minecraft/verify-link',
        pendingDeliveries: '/api/minecraft/pending-deliveries',
        confirmDelivery: '/api/minecraft/confirm-delivery',
      },
    },
  });
};

exports.getCatalog = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT item_code, name, item_type, minecraft_material, delivery_type, plugin_id, description, rarity, icon FROM plugin_item_catalog WHERE is_active = 1 ORDER BY name ASC'
    );
    res.json({ success: true, pluginId: PLUGIN_ID, items: rows });
  } catch (err) {
    console.error('GET PLUGIN CATALOG ERROR:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat katalog plugin' });
  }
};

exports.getCatalogItem = async (req, res) => {
  try {
    const item = await getCatalogItem(req.params.code);
    if (!item) return res.status(404).json({ success: false, message: 'Item katalog tidak ditemukan' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat item katalog' });
  }
};

exports.adminListCatalog = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM plugin_item_catalog ORDER BY id DESC');
    res.json({ success: true, items: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat katalog admin' });
  }
};

exports.adminSaveCatalogItem = async (req, res) => {
  try {
    const {
      id,
      item_code,
      name,
      item_type = 'item',
      minecraft_material,
      delivery_type = 'item',
      plugin_commands,
      plugin_id = PLUGIN_ID,
      description = '',
      rarity = 'common',
      icon = 'fa-cube',
      is_active = true,
    } = req.body;

    if (!item_code || !name) {
      return res.status(400).json({ success: false, message: 'item_code dan name wajib diisi' });
    }

    const code = item_code.toLowerCase().trim();

    if (id) {
      await pool.execute(
        `UPDATE plugin_item_catalog SET item_code=?, name=?, item_type=?, minecraft_material=?, delivery_type=?, plugin_commands=?, plugin_id=?, description=?, rarity=?, icon=?, is_active=? WHERE id=?`,
        [code, name, item_type, minecraft_material || null, delivery_type, plugin_commands || null, plugin_id, description, rarity, icon, is_active ? 1 : 0, id]
      );
    } else {
      await pool.execute(
        `INSERT INTO plugin_item_catalog (item_code, name, item_type, minecraft_material, delivery_type, plugin_commands, plugin_id, description, rarity, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, name, item_type, minecraft_material || null, delivery_type, plugin_commands || null, plugin_id, description, rarity, icon, is_active ? 1 : 0]
      );
    }

    res.json({ success: true, message: 'Item katalog plugin berhasil disimpan' });
  } catch (err) {
    console.error('SAVE CATALOG ERROR:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan item katalog' });
  }
};

exports.adminDeleteCatalogItem = async (req, res) => {
  try {
    await pool.execute('UPDATE plugin_item_catalog SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Item katalog dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus item katalog' });
  }
};
