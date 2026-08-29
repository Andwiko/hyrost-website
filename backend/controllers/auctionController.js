'use strict';

const pool = require('../config/mysql');

exports.getAuctions = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT m.*, u.username AS seller_name,
             (SELECT MAX(amount) FROM auction_bids b WHERE b.listing_id = m.id) AS highest_bid,
             (SELECT COUNT(*) FROM auction_bids b WHERE b.listing_id = m.id) AS bid_count
      FROM marketplace_items m
      JOIN users u ON m.seller_id = u.id
      WHERE m.listing_type = 'auction' AND m.is_sold = 0 AND m.is_active = 1
        AND (m.auction_ends_at IS NULL OR m.auction_ends_at > NOW())
      ORDER BY m.auction_ends_at ASC
    `);
    res.json({ success: true, auctions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAuction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemName, description, startBid, minIncrement, durationHours = 24, priceType = 'bronze' } = req.body;
    if (!itemName || !startBid) return res.status(400).json({ success: false, message: 'Data lelang tidak lengkap' });

    const endsAt = new Date(Date.now() + durationHours * 3600000);
    const [result] = await pool.execute(
      `INSERT INTO marketplace_items (seller_id, item_name, description, price_coin, price_type, listing_type, current_bid, min_bid_increment, auction_ends_at, is_active, is_sold)
       VALUES (?, ?, ?, ?, ?, 'auction', ?, ?, ?, 1, 0)`,
      [userId, itemName, description || '', startBid, priceType, startBid, minIncrement || 10, endsAt]
    );
    res.json({ success: true, listingId: result.insertId, message: 'Lelang dibuat' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.placeBid = async (req, res) => {
  try {
    const userId = req.user.id;
    const listingId = parseInt(req.params.id, 10);
    const { amount } = req.body;
    const bidAmount = parseInt(amount, 10);
    if (!bidAmount || bidAmount <= 0) return res.status(400).json({ success: false, message: 'Bid tidak valid' });

    const [listings] = await pool.execute(
      "SELECT * FROM marketplace_items WHERE id = ? AND listing_type = 'auction' AND is_sold = 0",
      [listingId]
    );
    const listing = listings[0];
    if (!listing) return res.status(404).json({ success: false, message: 'Lelang tidak ditemukan' });
    if (listing.seller_id === userId) return res.status(400).json({ success: false, message: 'Tidak bisa bid item sendiri' });
    if (listing.auction_ends_at && new Date(listing.auction_ends_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Lelang sudah berakhir' });
    }

    const minBid = (listing.current_bid || 0) + (listing.min_bid_increment || 10);
    if (bidAmount < minBid) {
      return res.status(400).json({ success: false, message: `Bid minimal ${minBid}` });
    }

    const coinCol = `coin_${listing.price_type || 'bronze'}`;
    const [users] = await pool.execute(`SELECT ${coinCol} AS balance FROM users WHERE id = ?`, [userId]);
    if ((users[0]?.balance || 0) < bidAmount) {
      return res.status(400).json({ success: false, message: 'Saldo koin tidak cukup' });
    }

    await pool.execute('INSERT INTO auction_bids (listing_id, bidder_id, amount) VALUES (?, ?, ?)', [listingId, userId, bidAmount]);
    await pool.execute('UPDATE marketplace_items SET current_bid = ? WHERE id = ?', [bidAmount, listingId]);

    res.json({ success: true, message: `Bid Rp/koin ${bidAmount} berhasil`, currentBid: bidAmount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBids = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      `SELECT b.amount, b.created_at, u.username FROM auction_bids b
       JOIN users u ON u.id = b.bidder_id WHERE b.listing_id = ? ORDER BY b.amount DESC LIMIT 20`,
      [listingId]
    );
    res.json({ success: true, bids: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.finalizeExpiredAuctions = async () => {
  try {
    const [expired] = await pool.execute(`
      SELECT m.id FROM marketplace_items m
      WHERE m.listing_type = 'auction' AND m.is_sold = 0 AND m.auction_ends_at <= NOW()
    `);
    if (Array.isArray(expired)) {
      for (const row of expired) {
        const [topBid] = await pool.execute(
          'SELECT bidder_id, amount FROM auction_bids WHERE listing_id = ? ORDER BY amount DESC LIMIT 1',
          [row.id]
        );
        if (topBid && topBid.length) {
          const bid = topBid[0];
          const [listing] = await pool.execute('SELECT * FROM marketplace_items WHERE id = ?', [row.id]);
          if (listing && listing.length) {
            const item = listing[0];
            const coinCol = `coin_${item.price_type || 'bronze'}`;
            await pool.execute(`UPDATE users SET ${coinCol} = ${coinCol} - ? WHERE id = ?`, [bid.amount, bid.bidder_id]);
            await pool.execute('UPDATE marketplace_items SET is_sold = 1 WHERE id = ?', [row.id]);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Auction finalize error:', err.message);
  }
};
