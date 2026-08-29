'use strict';

const crypto = require('crypto');
const pool = require('../config/mysql');
const { readPaymentMethods } = require('./adminController');
const { sendDiscordEmbed } = require('../utils/discordWebhook');
const {
  resolveMidtransConfig,
  buildSnapPayload,
  defaultCallbacks,
  createSnapTransaction,
  extractNotificationFields,
  verifyNotificationSignature,
  isPaidStatus,
  isFailedStatus,
} = require('../utils/midtrans');

const RANK_PRICES_IDR = {
  VIP: 15000,
  MVP: 35000,
  SULTAN: 75000,
  'HYROST ROYAL': 150000,
  ROYAL: 150000,
};

function generateOrderCode() {
  return `HYR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function resolvePaymentMidtransConfig() {
  return resolveMidtransConfig();
}

async function createRankOrder(userId, { rankName, paymentMethod, promoCode }) {
  const methods = await readPaymentMethods();
  const active = methods.filter((m) => m.is_active !== false);
  const selected = active.find((m) => m.key === paymentMethod) || active[0];
  if (!selected) throw new Error('Metode pembayaran tidak tersedia');

  let amount = RANK_PRICES_IDR[rankName.toUpperCase()] || 15000;
  if (promoCode && promoCode.toUpperCase() === 'HYROST2026') {
    amount = Math.round(amount * 0.8);
  }

  const orderCode = generateOrderCode();
  const midtransCfg = await resolveMidtransConfig();
  const useMidtrans = midtransCfg.enabled;

  let midtransToken = null;
  let redirectUrl = null;
  let midtransOrderId = orderCode;

  if (useMidtrans) {
    const [users] = await pool.execute('SELECT username, email FROM users WHERE id = ?', [userId]);
    const user = users[0] || {};
    const payload = buildSnapPayload({
      orderId: orderCode,
      amount,
      itemId: rankName,
      itemName: `Rank ${rankName}`,
      username: user.username,
      email: user.email,
      callbacks: defaultCallbacks('/modules/store.html?payment=success'),
    });
    const snap = await createSnapTransaction(midtransCfg, payload);
    midtransToken = snap.token;
    redirectUrl = snap.redirectUrl;
  }

  await pool.execute(
    `INSERT INTO payment_orders (user_id, order_code, order_type, item_name, amount_idr, payment_method, status, midtrans_order_id, midtrans_token, promo_code)
     VALUES (?, ?, 'rank', ?, ?, ?, 'pending', ?, ?, ?)`,
    [userId, orderCode, rankName, amount, selected.key, midtransOrderId, midtransToken, promoCode || null]
  );

  return {
    orderCode,
    amountIDR: amount,
    paymentMethod: selected.key,
    paymentAccount: selected.account,
    paymentInstructions: selected.instructions,
    midtransToken,
    redirectUrl,
    requiresApproval: !useMidtrans,
  };
}

async function fulfillRankOrder(order) {
  const userId = order.user_id;
  const rankName = order.item_name;

  await pool.execute('UPDATE users SET role = ? WHERE id = ?', [rankName, userId]);

  const [links] = await pool.execute(
    'SELECT mc_uuid, mc_username FROM account_links WHERE user_id = ? AND is_verified = 1',
    [userId]
  );
  const mcUuid = links[0]?.mc_uuid || null;
  const mcUsername = links[0]?.mc_username || null;

  await pool.execute(
    `INSERT INTO pending_deliveries (user_id, mc_uuid, item_type, item_name, item_code, quantity, commands, status, plugin_id, source)
     VALUES (?, ?, 'RANK', ?, ?, 1, ?, 'pending', 'hyrost_bridge', 'store')`,
    [userId, mcUuid, rankName, rankName.toLowerCase().replace(/\s+/g, '_'), `lp user ${mcUsername || 'player'} parent set ${rankName.toLowerCase()}`]
  );

  await pool.execute(
    'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
    [userId, 'BUY_RANK_PAID', `Rank "${rankName}" activated via order ${order.order_code}`]
  );

  await sendDiscordEmbed({
    title: '💰 Pembayaran Rank Berhasil',
    description: `Order **${order.order_code}** — ${rankName}`,
    color: 0x10b981,
    fields: [{ name: 'User ID', value: String(userId), inline: true }, { name: 'Amount', value: `Rp ${order.amount_idr}`, inline: true }],
  });
}

exports.createRankPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rankName, paymentMethod, promoCode } = req.body;
    if (!rankName) return res.status(400).json({ success: false, message: 'Nama pangkat wajib' });

    const result = await createRankOrder(userId, { rankName, paymentMethod, promoCode });

    res.json({
      success: true,
      ...result,
      transactionId: result.orderCode,
      securityHash: `SHA256-${crypto.createHash('sha256').update(result.orderCode + String(userId)).digest('hex').slice(0, 12).toUpperCase()}`,
      instructions: 'Ketik /claim di server Minecraft (In-Game) untuk menyinkronkan pangkat Anda.',
      message: result.midtransToken
        ? 'Lanjutkan pembayaran via Midtrans Snap.'
        : `Pembayaran Rp ${result.amountIDR.toLocaleString('id-ID')} via ${result.paymentMethod?.toUpperCase() || 'transfer'} berhasil dicatat. Pangkat ${req.body.rankName} akan diaktifkan setelah konfirmasi.`,
    });
  } catch (err) {
    console.error('CREATE PAYMENT ERROR:', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal membuat order' });
  }
};

exports.midtransWebhook = async (req, res) => {
  try {
    const fields = extractNotificationFields(req.body, req.rawBody);
    const order_id = fields.order_id;
    if (!order_id) return res.status(400).json({ message: 'Invalid' });

    if (String(order_id).startsWith('studio-')) {
      const studioRoutes = require('../routes/studio');
      if (typeof studioRoutes.processStudioWebhook === 'function') {
        return studioRoutes.processStudioWebhook(req, res);
      }
    }

    const cfg = await resolveMidtransConfig();
    if (!verifyNotificationSignature(fields, cfg.serverKey)) {
      console.warn('[payments/webhook] Invalid signature for order:', order_id);
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    const [orders] = await pool.execute('SELECT * FROM payment_orders WHERE order_code = ? OR midtrans_order_id = ?', [order_id, order_id]);
    const order = orders[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const paid = isPaidStatus(fields.transaction_status, fields.fraud_status);

    if (paid && order.status === 'pending') {
      await pool.execute("UPDATE payment_orders SET status = 'paid', paid_at = NOW() WHERE id = ?", [order.id]);
      await fulfillRankOrder(order);
    } else if (isFailedStatus(fields.transaction_status)) {
      await pool.execute("UPDATE payment_orders SET status = 'failed' WHERE id = ?", [order.id]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listPendingOrders = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT o.*, u.username FROM payment_orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status = 'pending'
      ORDER BY o.created_at DESC LIMIT 100
    `);
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [orders] = await pool.execute('SELECT * FROM payment_orders WHERE id = ? AND status = ?', [orderId, 'pending']);
    const order = orders[0];
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

    await pool.execute("UPDATE payment_orders SET status = 'paid', paid_at = NOW(), approved_by = ? WHERE id = ?", [req.user.id, order.id]);
    await fulfillRankOrder(order);

    res.json({ success: true, message: 'Order disetujui, rank diaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    await pool.execute("UPDATE payment_orders SET status = 'rejected', approved_by = ? WHERE id = ? AND status = 'pending'", [req.user.id, orderId]);
    res.json({ success: true, message: 'Order ditolak' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.fulfillRankOrder = fulfillRankOrder;
