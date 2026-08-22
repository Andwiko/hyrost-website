const pool = require('../config/mysql');

exports.getListings = async (req, res) => {
  try {
    const type = req.query.type || 'sale';
    const typeFilter = type === 'auction'
      ? "m.listing_type = 'auction'"
      : "(m.listing_type IS NULL OR m.listing_type = 'sale')";

    const [rows] = await pool.execute(`
      SELECT m.*, u.username AS seller_name,
             c.name AS catalog_name, c.minecraft_material AS catalog_material, c.delivery_type AS catalog_delivery_type
      FROM marketplace_items m
      JOIN users u ON m.seller_id = u.id
      LEFT JOIN plugin_item_catalog c ON c.item_code = m.catalog_item_code
      WHERE m.is_sold = 0 AND m.is_active = 1 AND ${typeFilter}
      ORDER BY m.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET LISTINGS ERROR:', err);
    res.status(500).json({ message: 'Gagal memuat marketplace' });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM marketplace_items WHERE seller_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal memuat listing Anda' });
  }
};

exports.createListing = async (req, res) => {
  try {
    const {
      itemName,
      itemType = 'general',
      itemCode,
      catalogItemCode,
      description = '',
      priceCoin,
      priceType = 'bronze',
      minecraftMaterial,
      deliveryType,
      pluginCommands,
      pluginId,
    } = req.body;

    if (!itemName || !priceCoin || priceCoin <= 0) {
      return res.status(400).json({ message: 'Nama item dan harga wajib diisi' });
    }

    const allowedTypes = ['bronze', 'silver', 'gold'];
    if (!allowedTypes.includes(priceType)) {
      return res.status(400).json({ message: 'Tipe koin tidak valid' });
    }

    let resolvedCode = itemCode || itemName.trim().toLowerCase().replace(/\s+/g, '_');
    let resolvedMaterial = minecraftMaterial || null;
    let resolvedDelivery = deliveryType || itemType || 'item';
    let resolvedCommands = pluginCommands || null;
    let resolvedPluginId = pluginId || 'hyrost_bridge';
    let resolvedCatalog = catalogItemCode || null;

    if (catalogItemCode) {
      const [catalogRows] = await pool.execute(
        'SELECT * FROM plugin_item_catalog WHERE item_code = ? AND is_active = 1',
        [catalogItemCode]
      );
      if (catalogRows.length) {
        const cat = catalogRows[0];
        resolvedCode = cat.item_code;
        resolvedMaterial = cat.minecraft_material;
        resolvedDelivery = cat.delivery_type;
        resolvedCommands = cat.plugin_commands;
        resolvedPluginId = cat.plugin_id;
        resolvedCatalog = cat.item_code;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO marketplace_items
        (seller_id, item_name, item_type, item_code, catalog_item_code, description, price_coin, price_type,
         minecraft_material, delivery_type, plugin_commands, plugin_id, is_sold, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        req.user.id,
        itemName.trim(),
        itemType,
        resolvedCode,
        resolvedCatalog,
        description.trim(),
        parseInt(priceCoin, 10),
        priceType,
        resolvedMaterial,
        resolvedDelivery,
        resolvedCommands,
        resolvedPluginId,
      ]
    );

    res.status(201).json({
      message: 'Listing berhasil dipublikasikan',
      listingId: result.insertId,
      pluginLinked: !!resolvedCatalog,
    });
  } catch (err) {
    console.error('CREATE LISTING ERROR:', err);
    res.status(500).json({ message: 'Gagal membuat listing' });
  }
};

exports.buyListing = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const listingId = parseInt(req.params.id, 10);
    const buyerId = req.user.id;

    await conn.beginTransaction();

    const [listings] = await conn.execute(
      `SELECT * FROM marketplace_items WHERE id = ? AND is_sold = 0 AND is_active = 1 FOR UPDATE`,
      [listingId]
    );
    if (!listings.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Listing tidak tersedia' });
    }

    const listing = listings[0];
    if (listing.seller_id === buyerId) {
      await conn.rollback();
      return res.status(400).json({ message: 'Tidak bisa membeli listing sendiri' });
    }

    const coinCol = { bronze: 'coin_bronze', silver: 'coin_silver', gold: 'coin_gold' }[listing.price_type];
    if (!coinCol) {
      await conn.rollback();
      return res.status(400).json({ message: 'Tipe harga tidak valid' });
    }

    const [buyers] = await conn.execute(`SELECT ${coinCol} FROM users WHERE id = ? FOR UPDATE`, [buyerId]);
    if (buyers[0][coinCol] < listing.price_coin) {
      await conn.rollback();
      return res.status(400).json({ message: 'Saldo tidak cukup' });
    }

    await conn.execute(`UPDATE users SET ${coinCol} = ${coinCol} - ? WHERE id = ?`, [listing.price_coin, buyerId]);
    await conn.execute(`UPDATE users SET ${coinCol} = ${coinCol} + ? WHERE id = ?`, [listing.price_coin, listing.seller_id]);
    await conn.execute('UPDATE marketplace_items SET is_sold = 1 WHERE id = ?', [listingId]);

    const [invResult] = await conn.execute(
      `INSERT INTO user_inventory
        (user_id, item_name, item_type, item_code, quantity, description, rarity, icon, estimated_value, source, source_id,
         minecraft_material, delivery_type, plugin_commands, plugin_id, mc_claim_status)
       VALUES (?, ?, ?, ?, 1, ?, 'rare', 'fa-store', ?, 'marketplace', ?, ?, ?, ?, ?, 'none')`,
      [
        buyerId,
        listing.item_name,
        listing.item_type,
        listing.item_code,
        listing.description || '',
        listing.price_coin,
        listingId,
        listing.minecraft_material,
        listing.delivery_type || listing.item_type,
        listing.plugin_commands,
        listing.plugin_id || 'hyrost_bridge',
      ]
    );

    await conn.execute(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [buyerId, 'BUY_MARKETPLACE', `Bought ${listing.item_name} from listing #${listingId}`]
    );

    await conn.commit();

    res.json({
      message: 'Pembelian berhasil! Item masuk inventaris. Klaim ke Minecraft via Inventaris → Claim MC.',
      inventoryId: invResult.insertId,
      pluginId: listing.plugin_id || 'hyrost_bridge',
      itemCode: listing.item_code,
    });
  } catch (err) {
    await conn.rollback();
    console.error('BUY LISTING ERROR:', err);
    res.status(500).json({ message: 'Gagal memproses pembelian' });
  } finally {
    conn.release();
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      'SELECT seller_id, is_sold FROM marketplace_items WHERE id = ?',
      [listingId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Listing tidak ditemukan' });

    const listing = rows[0];
    const isOwner = listing.seller_id === req.user.id;
    const isAdmin = req.user.role && req.user.role.toLowerCase() === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Akses ditolak' });
    if (listing.is_sold) return res.status(400).json({ message: 'Listing sudah terjual' });

    await pool.execute('UPDATE marketplace_items SET is_active = 0 WHERE id = ?', [listingId]);
    res.json({ message: 'Listing dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus listing' });
  }
};

module.exports = exports;
