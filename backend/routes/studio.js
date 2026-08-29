/**
 * =============================================================================
 * HYROST / MEI LABS — Skin Studio Premium API Routes
 * /api/studio/*
 *
 * Endpoints:
 *   GET  /api/studio/config             — client config (Midtrans client key, dll)
 *   GET  /api/studio/vip-status        — cek status VIP + ad-pass dari DB (butuh login)
 *   POST /api/studio/redeem-key        — redeem license key HMAC (butuh login)
 *   POST /api/studio/claim-ad-reward   — klaim 1-jam rewarded-ad pass (butuh login)
 *   POST /api/studio/create-payment    — buat Midtrans Snap transaction (butuh login)
 *   POST /api/studio/payment-webhook   — Midtrans payment notification webhook (no auth)
 *   GET  /api/studio/payment-status/:orderId — cek status order (butuh login)
 * =============================================================================
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { verifyToken } = require('../middleware/auth');
const pool    = require('../config/mysql');
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

// ─── Plan Definitions ────────────────────────────────────────────────────────
const PLANS = {
  '1day':    { days: 1,  priceIdr: 2000,  label: 'VIP Studio Pass Harian (1 Hari)' },
  '3days':   { days: 3,  priceIdr: 5000,  label: 'VIP Studio Weekend Pass (3 Hari)' },
  'weekly':  { days: 7,  priceIdr: 10000, label: 'VIP Studio Pass Mingguan (7 Hari)' },
  'monthly': { days: 30, priceIdr: 25000, label: 'VIP Studio Member Bulanan (30 Hari)' },
};

function getPool() { return pool; }

// ─── GET /api/studio/config ──────────────────────────────────────────────────
// Expose public Midtrans client key ke frontend. Server key TIDAK pernah dikirim.
router.get('/config', async (req, res) => {
  const cfg = await resolveMidtransConfig();
  res.json({
    success:          true,
    enabled:          cfg.enabled,
    midtransClientKey: cfg.clientKey,
    midtransIsProduction: cfg.isProd,
    snapJsUrl: cfg.snapJsUrl,
  });
});

// ─── GET /api/studio/vip-status ─────────────────────────────────────────────
router.get('/vip-status', verifyToken, async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      'SELECT skin_studio_vip_expires, skin_studio_plan, skin_studio_ad_until, role, username FROM users WHERE id = ? AND deleted_at IS NULL',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const now      = new Date();
    const vipExpiry = user.skin_studio_vip_expires ? new Date(user.skin_studio_vip_expires) : null;
    const adUntil  = user.skin_studio_ad_until     ? new Date(user.skin_studio_ad_until)    : null;
    const isAdmin  = user.role && user.role.toLowerCase() === 'admin';
    const isVip    = isAdmin || (vipExpiry && vipExpiry > now);
    const isAdPass = !isAdmin && adUntil && adUntil > now;

    res.json({
      success:      true,
      username:     user.username,
      isAdmin,
      isVip,
      isAdPass,
      hasProAccess: isVip || isAdPass,
      planName:     isAdmin ? 'Admin (Lifetime VIP)' : (user.skin_studio_plan || null),
      vipExpiresAt: isAdmin ? null : (vipExpiry ? vipExpiry.toISOString() : null),
      adUntil:      isAdmin ? null : (adUntil   ? adUntil.toISOString()  : null),
    });
  } catch (err) {
    console.error('[studio/vip-status]', err.message);
    res.status(500).json({ success: false, message: 'Server error saat cek status VIP' });
  }
});

// ─── POST /api/studio/redeem-key ─────────────────────────────────────────────
router.post('/redeem-key', verifyToken, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, message: 'Kode lisensi wajib diisi' });
    }

    const normalized  = key.trim().toUpperCase();
    const hmacSecret  = process.env.STUDIO_LICENSE_HMAC_SECRET || process.env.JWT_SECRET || 'mei-labs-studio-key';
    const defaultDays = parseInt(process.env.STUDIO_LICENSE_VALIDITY_DAYS || '30', 10);

    let isValidKey = false;
    let planDays   = defaultDays;

    // Format 1: HMAC-signed — MEI-VIP-{DAYS}-{8-char HEX}
    const hmacPattern = /^MEI-[A-Z0-9]{2,10}-(\d{1,3})-([A-F0-9]{8})$/;
    const hmacMatch   = normalized.match(hmacPattern);
    if (hmacMatch) {
      const daysPart = parseInt(hmacMatch[1], 10);
      const hmacPart = hmacMatch[2];
      const payload  = normalized.slice(0, -(hmacPart.length + 1));
      const expected = crypto.createHmac('sha256', hmacSecret)
        .update(payload).digest('hex').toUpperCase().substring(0, 8);
      if (hmacPart === expected && daysPart >= 1 && daysPart <= 365) {
        isValidKey = true;
        planDays   = daysPart;
      }
    }

    // Format 2: Legacy — MEI-... length >= 12
    if (!isValidKey && normalized.startsWith('MEI-') && normalized.length >= 12) {
      isValidKey = true;
      planDays   = defaultDays;
    }

    if (!isValidKey) {
      return res.status(400).json({
        success: false,
        message: 'Format kode lisensi tidak valid. Contoh: MEI-VIP-30-A3F7C2E1'
      });
    }

    const [existingRows] = await getPool().execute(
      'SELECT skin_studio_vip_expires FROM users WHERE id = ?', [req.user.id]
    );
    const existing      = existingRows[0];
    const now           = new Date();
    const currentExpiry = existing?.skin_studio_vip_expires && new Date(existing.skin_studio_vip_expires) > now
      ? new Date(existing.skin_studio_vip_expires)
      : now;

    const newExpiry = new Date(currentExpiry.getTime() + planDays * 24 * 60 * 60 * 1000);
    const planName  = `VIP Studio ${planDays}-Day Pass (Redeemed)`;

    await getPool().execute(
      'UPDATE users SET skin_studio_vip_expires = ?, skin_studio_plan = ? WHERE id = ?',
      [newExpiry, planName, req.user.id]
    );

    res.json({
      success:      true,
      message:      `💎 Kode berhasil ditukarkan! VIP Studio aktif selama ${planDays} hari.`,
      planName,
      planDays,
      vipExpiresAt: newExpiry.toISOString(),
    });
  } catch (err) {
    console.error('[studio/redeem-key]', err.message);
    res.status(500).json({ success: false, message: 'Server error saat redeem kode' });
  }
});

// ─── POST /api/studio/claim-ad-reward ────────────────────────────────────────
router.post('/claim-ad-reward', verifyToken, async (req, res) => {
  try {
    const hours   = parseInt(process.env.STUDIO_AD_REWARD_HOURS || '1', 10);
    const adUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

    await getPool().execute(
      'UPDATE users SET skin_studio_ad_until = ? WHERE id = ?',
      [adUntil, req.user.id]
    );

    res.json({
      success: true,
      message: `🎁 Akses PRO ${hours} jam berhasil diaktifkan!`,
      adUntil: adUntil.toISOString(),
      hours,
    });
  } catch (err) {
    console.error('[studio/claim-ad-reward]', err.message);
    res.status(500).json({ success: false, message: 'Server error saat klaim ad reward' });
  }
});

// ─── POST /api/studio/create-payment ─────────────────────────────────────────
// Buat transaksi Midtrans Snap dan kembalikan snap_token ke frontend.
router.post('/create-payment', verifyToken, async (req, res) => {
  try {
    const { planKey } = req.body;
    const plan = PLANS[planKey];
    if (!plan) {
      return res.status(400).json({ success: false, message: `Paket '${planKey}' tidak dikenali` });
    }

    const cfg = await resolveMidtransConfig();
    if (!cfg.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Pembayaran Midtrans sedang dinonaktifkan atau Server/Client Key belum diisi. Periksa Admin Panel → Payment.',
      });
    }

    const [userRows] = await getPool().execute(
      'SELECT id, username, email FROM users WHERE id = ?', [req.user.id]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    // Order ID unik: studio-{userId}-{planKey}-{timestamp}
    const orderId = `studio-${user.id}-${planKey}-${Date.now()}`;

    const parameter = buildSnapPayload({
      orderId,
      amount: plan.priceIdr,
      itemId: planKey,
      itemName: plan.label,
      username: user.username,
      email: user.email,
      callbacks: defaultCallbacks('/bot/skin.html?payment=success'),
      extra: {
        custom_field1: String(user.id),
        custom_field2: planKey,
        custom_field3: String(plan.days),
      },
    });

    const transaction  = await createSnapTransaction(cfg, parameter);
    const snapToken    = transaction.token;
    const redirectUrl  = transaction.redirectUrl;

    await getPool().execute(
      'INSERT INTO studio_orders (order_id, user_id, plan_key, plan_days, amount, snap_token) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE snap_token=VALUES(snap_token), status=\'pending\'',
      [orderId, user.id, planKey, plan.days, plan.priceIdr, snapToken]
    );

    res.json({
      success:     true,
      snapToken,
      redirectUrl,
      orderId,
      plan: {
        key:            planKey,
        label:          plan.label,
        days:           plan.days,
        priceIdr:       plan.priceIdr,
        priceFormatted: `Rp ${plan.priceIdr.toLocaleString('id-ID')}`,
      },
    });
  } catch (err) {
    console.error('[studio/create-payment]', err.message, err.apiResponse || '');
    const unauthorized = err.statusCode === 401 || /unauthorized/i.test(err.message || '');
    res.status(err.statusCode === 503 ? 503 : 500).json({
      success: false,
      message: unauthorized
        ? 'Midtrans Server Key tidak valid atau tidak cocok dengan mode Sandbox/Production. Periksa Admin Panel.'
        : 'Gagal membuat transaksi Midtrans: ' + (err.message || 'Unknown error'),
    });
  }
});

// ─── POST /api/studio/payment-webhook ────────────────────────────────────────
// Midtrans HTTP Notification — dipanggil Midtrans server setelah pembayaran.
// Tidak butuh Authorization header (validasi via signature key).
async function processStudioWebhook(req, res) {
  try {
    const cfg    = await resolveMidtransConfig();
    const fields = extractNotificationFields(req.body, req.rawBody);
    const orderId = fields.order_id;

    if (!verifyNotificationSignature(fields, cfg.serverKey)) {
      console.warn('[studio/webhook] Invalid signature for order:', orderId);
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    const transactionStatus = fields.transaction_status;
    const fraudStatus       = fields.fraud_status;

    const [orderRows] = await getPool().execute(
      'SELECT * FROM studio_orders WHERE order_id = ?', [orderId]
    );
    const order = orderRows[0];
    if (!order) {
      console.warn('[studio/webhook] Order not found:', orderId);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isPaid = isPaidStatus(transactionStatus, fraudStatus);
    const isFailed = isFailedStatus(transactionStatus);

    if (isPaid && order.status !== 'paid') {
      // Aktifkan VIP di DB
      const planDays  = order.plan_days;
      const userId    = order.user_id;

      const [existingRows] = await getPool().execute(
        'SELECT skin_studio_vip_expires FROM users WHERE id = ?', [userId]
      );
      const existing      = existingRows[0];
      const now           = new Date();
      const currentExpiry = existing?.skin_studio_vip_expires && new Date(existing.skin_studio_vip_expires) > now
        ? new Date(existing.skin_studio_vip_expires)
        : now;

      const newExpiry = new Date(currentExpiry.getTime() + planDays * 24 * 60 * 60 * 1000);
      const planName  = PLANS[order.plan_key]?.label || `VIP Studio ${planDays} Hari`;

      await getPool().execute(
        'UPDATE users SET skin_studio_vip_expires = ?, skin_studio_plan = ? WHERE id = ?',
        [newExpiry, planName, userId]
      );

      await getPool().execute(
        'UPDATE studio_orders SET status = \'paid\', paid_at = NOW() WHERE order_id = ?',
        [orderId]
      );

      console.log(`✅ [studio/webhook] VIP activated: user=${userId} plan=${planName} until=${newExpiry.toISOString()}`);
    }

    if (isFailed) {
      await getPool().execute(
        'UPDATE studio_orders SET status = ? WHERE order_id = ?',
        [transactionStatus, orderId]
      );
      console.log(`❌ [studio/webhook] Payment ${transactionStatus}: order=${orderId}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[studio/payment-webhook]', err.message);
    res.status(500).json({ success: false });
  }
}

router.post('/payment-webhook', processStudioWebhook);

// ─── GET /api/studio/payment-status/:orderId ─────────────────────────────────
// Cek status pembayaran order milik user yang login.
router.get('/payment-status/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const [rows] = await getPool().execute(
      'SELECT * FROM studio_orders WHERE order_id = ? AND user_id = ?',
      [orderId, req.user.id]
    );
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    res.json({
      success:   true,
      orderId:   order.order_id,
      status:    order.status,
      isPaid:    order.status === 'paid',
      planKey:   order.plan_key,
      planDays:  order.plan_days,
      amount:    order.amount,
      paidAt:    order.paid_at,
      createdAt: order.created_at,
    });
  } catch (err) {
    console.error('[studio/payment-status]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
module.exports.processStudioWebhook = processStudioWebhook;
