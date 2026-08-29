/**
 * =============================================================================
 * HYROST / MEI LABS — Skin Studio Premium API Routes
 * /api/studio/*
 *
 * Endpoints:
 *   GET  /api/studio/config              — client config (Tripay, Midtrans, Manual QRIS)
 *   GET  /api/studio/vip-status         — cek status VIP + ad-pass dari DB (butuh login)
 *   POST /api/studio/redeem-key         — redeem license key HMAC (butuh login)
 *   POST /api/studio/claim-ad-reward    — klaim 1-jam rewarded-ad pass (butuh login)
 *   POST /api/studio/create-payment     — buat Midtrans Snap transaction (butuh login)
 *   POST /api/studio/payment-webhook    — Midtrans payment webhook (no auth)
 *   POST /api/studio/create-tripay-payment — buat Tripay transaction (butuh login)
 *   POST /api/studio/tripay-webhook     — Tripay payment webhook callback (no auth)
 *   POST /api/studio/create-manual-payment — buat Manual QRIS/Bank order (butuh login)
 *   POST /api/studio/upload-payment-proof  — upload bukti transfer manual (butuh login)
 *   GET  /api/studio/payment-status/:orderId — cek status order (butuh login)
 *   GET  /api/studio/admin/orders       — daftar order studio untuk admin (admin only)
 *   POST /api/studio/admin/approve-order/:orderId — approve manual order (admin only)
 *   POST /api/studio/admin/reject-order/:orderId  — reject manual order (admin only)
 * =============================================================================
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
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
const {
  resolveTripayConfig,
  createTripayTransaction,
  verifyTripayWebhookSignature,
  getTripayPaymentChannels,
} = require('../utils/tripay');

// ─── Plan Definitions ────────────────────────────────────────────────────────
const PLANS = {
  '1day':    { days: 1,  priceIdr: 2000,  label: 'VIP Studio Pass Harian (1 Hari)' },
  '3days':   { days: 3,  priceIdr: 5000,  label: 'VIP Studio Weekend Pass (3 Hari)' },
  'weekly':  { days: 7,  priceIdr: 10000, label: 'VIP Studio Pass Mingguan (7 Hari)' },
  'monthly': { days: 30, priceIdr: 25000, label: 'VIP Studio Member Bulanan (30 Hari)' },
};

function getPool() { return pool; }

// Helper untuk membaca pengaturan manual transfer
async function resolveManualPaymentConfig() {
  let qrisImage = process.env.MANUAL_QRIS_IMAGE || '';
  let bankName = process.env.MANUAL_BANK_NAME || 'BCA / DANA / GoPay';
  let accountNumber = process.env.MANUAL_ACCOUNT_NUMBER || '08123456789';
  let accountName = process.env.MANUAL_ACCOUNT_NAME || 'Hyrost Admin';
  let whatsappNumber = process.env.MANUAL_WHATSAPP || '628123456789';
  let instructions = process.env.MANUAL_PAYMENT_INSTRUCTIONS || 'Transfer sesuai nominal unik, lalu kirim bukti pembayaran via WhatsApp.';
  let enabled = true;

  try {
    const [rows] = await getPool().execute(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('pay_manual_enabled', 'pay_manual_qris_image', 'pay_manual_bank_name', 'pay_manual_account_number', 'pay_manual_account_name', 'pay_manual_whatsapp', 'pay_manual_instructions')"
    );
    for (const r of rows) {
      const val = r.setting_value;
      if (r.setting_key === 'pay_manual_enabled' && val !== null && val !== '') enabled = String(val).toLowerCase() === 'true' || val === '1';
      if (r.setting_key === 'pay_manual_qris_image' && val) qrisImage = String(val).trim();
      if (r.setting_key === 'pay_manual_bank_name' && val) bankName = String(val).trim();
      if (r.setting_key === 'pay_manual_account_number' && val) accountNumber = String(val).trim();
      if (r.setting_key === 'pay_manual_account_name' && val) accountName = String(val).trim();
      if (r.setting_key === 'pay_manual_whatsapp' && val) whatsappNumber = String(val).trim();
      if (r.setting_key === 'pay_manual_instructions' && val) instructions = String(val).trim();
    }
  } catch (_) {}

  return {
    enabled,
    qrisImage,
    bankName,
    accountNumber,
    accountName,
    whatsappNumber,
    instructions,
  };
}

// ─── GET /api/studio/config ──────────────────────────────────────────────────
// Expose public config ke frontend: Midtrans, Tripay, dan Manual QRIS
router.get('/config', async (req, res) => {
  try {
    const midtransCfg = await resolveMidtransConfig();
    const tripayCfg   = await resolveTripayConfig();
    const manualCfg   = await resolveManualPaymentConfig();

    let tripayChannels = [];
    if (tripayCfg.enabled) {
      try {
        tripayChannels = await getTripayPaymentChannels(tripayCfg);
      } catch (_) {}
    }

    res.json({
      success: true,
      // Midtrans
      midtrans: {
        enabled: midtransCfg.enabled,
        clientKey: midtransCfg.clientKey,
        isProduction: midtransCfg.isProd,
        snapJsUrl: midtransCfg.snapJsUrl,
      },
      // Tripay
      tripay: {
        enabled: tripayCfg.enabled,
        isProduction: tripayCfg.isProd,
        merchantCode: tripayCfg.merchantCode,
        channels: tripayChannels,
      },
      // Manual Transfer / Direct QRIS
      manual: manualCfg,
      // Backward compatibility fields
      enabled: midtransCfg.enabled || tripayCfg.enabled || manualCfg.enabled,
      midtransClientKey: midtransCfg.clientKey,
      midtransIsProduction: midtransCfg.isProd,
      snapJsUrl: midtransCfg.snapJsUrl,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat konfigurasi pembayaran' });
  }
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

    const now       = new Date();
    const vipExpiry = user.skin_studio_vip_expires ? new Date(user.skin_studio_vip_expires) : null;
    const adUntil   = user.skin_studio_ad_until     ? new Date(user.skin_studio_ad_until)    : null;
    const isAdmin   = user.role && user.role.toLowerCase() === 'admin';
    const isVip     = isAdmin || (vipExpiry && vipExpiry > now);
    const isAdPass  = !isAdmin && adUntil && adUntil > now;

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

    // Promo Codes List
    const PROMO_CODES = {
      'MEILABS2026': 30,
      'HYROSTVIP': 30,
      'VIPSTUDIO30': 30,
      'MEIVIP30': 30,
      'MEIVIP7': 7,
      'MEIPRO': 30,
      'STUDIOPRO': 30,
      'FREEVIP': 7
    };

    if (PROMO_CODES[normalized]) {
      isValidKey = true;
      planDays = PROMO_CODES[normalized];
    }

    // Format 1: HMAC-signed with salt — MEI-VIP-{DAYS}-{SALT}-{HMAC} (e.g. MEI-VIP-30-7B2F1A-A3F7C2E1)
    if (!isValidKey) {
      const hmacSaltPattern = /^MEI-[A-Z0-9]{2,10}-(\d{1,3})-([A-F0-9]{4,10})-([A-F0-9]{8})$/;
      const matchWithSalt = normalized.match(hmacSaltPattern);
      if (matchWithSalt) {
        const daysPart = parseInt(matchWithSalt[1], 10);
        const hmacPart = matchWithSalt[3];
        const payload = normalized.slice(0, -(hmacPart.length + 1));
        const expected = crypto.createHmac('sha256', hmacSecret)
          .update(payload).digest('hex').toUpperCase().substring(0, 8);
        if (hmacPart === expected && daysPart >= 1 && daysPart <= 365) {
          isValidKey = true;
          planDays = daysPart;
        }
      }
    }

    // Format 2: HMAC-signed simple — MEI-VIP-{DAYS}-{HMAC} (e.g. MEI-VIP-30-A3F7C2E1)
    if (!isValidKey) {
      const hmacPattern = /^MEI-[A-Z0-9]{2,10}-(\d{1,3})-([A-F0-9]{8})$/;
      const hmacMatch = normalized.match(hmacPattern);
      if (hmacMatch) {
        const daysPart = parseInt(hmacMatch[1], 10);
        const hmacPart = hmacMatch[2];
        const payload = normalized.slice(0, -(hmacPart.length + 1));
        const expected = crypto.createHmac('sha256', hmacSecret)
          .update(payload).digest('hex').toUpperCase().substring(0, 8);
        if (hmacPart === expected && daysPart >= 1 && daysPart <= 365) {
          isValidKey = true;
          planDays = daysPart;
        }
      }
    }

    // Format 3: Legacy Prefix — MEI-... length >= 10
    if (!isValidKey && normalized.startsWith('MEI-') && normalized.length >= 10) {
      isValidKey = true;
      planDays = defaultDays;
    }

    if (!isValidKey) {
      return res.status(400).json({
        success: false,
        message: 'Format kode lisensi tidak valid. Contoh: MEI-VIP-30-7B2F1A-A3F7C2E1 atau MEILABS2026'
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

// ─── POST /api/studio/create-payment (Midtrans Snap) ─────────────────────────
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
        message: 'Pembayaran Midtrans sedang dinonaktifkan. Periksa Admin Panel → Payment Settings.',
      });
    }

    const [userRows] = await getPool().execute(
      'SELECT id, username, email FROM users WHERE id = ?', [req.user.id]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

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

    const transaction = await createSnapTransaction(cfg, parameter);
    const snapToken   = transaction.token;
    const redirectUrl = transaction.redirectUrl;

    await getPool().execute(
      `INSERT INTO studio_orders (order_id, user_id, plan_key, plan_days, amount, gateway, payment_method, snap_token, checkout_url, status)
       VALUES (?, ?, ?, ?, ?, 'midtrans', 'snap', ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE snap_token=VALUES(snap_token), checkout_url=VALUES(checkout_url), status='pending'`,
      [orderId, user.id, planKey, plan.days, plan.priceIdr, snapToken, redirectUrl]
    );

    res.json({
      success:     true,
      gateway:     'midtrans',
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

// ─── POST /api/studio/create-tripay-payment (Tripay Gateway) ─────────────────
router.post('/create-tripay-payment', verifyToken, async (req, res) => {
  try {
    const { planKey, method = 'QRIS' } = req.body;
    const plan = PLANS[planKey];
    if (!plan) {
      return res.status(400).json({ success: false, message: `Paket '${planKey}' tidak dikenali` });
    }

    const tripayCfg = await resolveTripayConfig();
    if (!tripayCfg.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Pembayaran Tripay belum diaktifkan atau API Key belum diisi di Admin Panel.',
      });
    }

    const [userRows] = await getPool().execute(
      'SELECT id, username, email FROM users WHERE id = ?', [req.user.id]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const orderId = `tripay-std-${user.id}-${Date.now()}`;

    const tx = await createTripayTransaction(tripayCfg, {
      orderId,
      amount: plan.priceIdr,
      method: method || 'QRIS',
      customerName: user.username || 'Member',
      customerEmail: user.email || 'member@hyrost.net',
      itemName: plan.label,
      itemId: planKey,
      returnUrl: `${req.protocol}://${req.get('host')}/bot/skin.html?payment=success&orderId=${orderId}`,
    });

    await getPool().execute(
      `INSERT INTO studio_orders (order_id, user_id, plan_key, plan_days, amount, gateway, payment_method, reference, pay_code, qr_url, checkout_url, status)
       VALUES (?, ?, ?, ?, ?, 'tripay', ?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE reference=VALUES(reference), pay_code=VALUES(pay_code), qr_url=VALUES(qr_url), checkout_url=VALUES(checkout_url), status='pending'`,
      [orderId, user.id, planKey, plan.days, plan.priceIdr, method, tx.reference, tx.payCode, tx.qrUrl, tx.checkoutUrl]
    );

    res.json({
      success: true,
      gateway: 'tripay',
      orderId,
      reference: tx.reference,
      paymentMethod: tx.paymentMethod,
      paymentName: tx.paymentName,
      amount: tx.amount,
      totalAmount: tx.totalAmount,
      payCode: tx.payCode,
      payUrl: tx.payUrl,
      checkoutUrl: tx.checkoutUrl,
      qrUrl: tx.qrUrl,
      qrString: tx.qrString,
      expiredTime: tx.expiredTime,
      instructions: tx.instructions,
      plan: {
        key: planKey,
        label: plan.label,
        days: plan.days,
        priceIdr: plan.priceIdr,
        priceFormatted: `Rp ${plan.priceIdr.toLocaleString('id-ID')}`,
      },
    });
  } catch (err) {
    console.error('[studio/create-tripay-payment]', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      message: 'Gagal membuat transaksi Tripay: ' + (err.message || 'Unknown error'),
    });
  }
});

// ─── POST /api/studio/create-manual-payment (QRIS Statis & Transfer Manual) ───
router.post('/create-manual-payment', verifyToken, async (req, res) => {
  try {
    const { planKey } = req.body;
    const plan = PLANS[planKey];
    if (!plan) {
      return res.status(400).json({ success: false, message: `Paket '${planKey}' tidak dikenali` });
    }

    const manualCfg = await resolveManualPaymentConfig();
    if (!manualCfg.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Pembayaran transfer manual sedang dinonaktifkan.',
      });
    }

    const [userRows] = await getPool().execute(
      'SELECT id, username, email FROM users WHERE id = ?', [req.user.id]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    // Kode unik acak 2-digit (10 s/d 99) agar mudah diverifikasi admin
    const uniqueCode = Math.floor(Math.random() * 89) + 10;
    const totalAmount = plan.priceIdr + uniqueCode;
    const orderId = `manual-std-${user.id}-${Date.now()}`;

    await getPool().execute(
      `INSERT INTO studio_orders (order_id, user_id, plan_key, plan_days, amount, gateway, payment_method, status)
       VALUES (?, ?, ?, ?, ?, 'manual', 'qris_manual', 'pending')`,
      [orderId, user.id, planKey, plan.days, totalAmount]
    );

    // Format pesan WhatsApp konfirmasi
    const waText = encodeURIComponent(
      `Halo Admin Hyrost / Mei Labs,\nSaya ingin konfirmasi pembayaran VIP 3D Skin Studio:\n\n` +
      `• Order ID: ${orderId}\n` +
      `• Username: ${user.username}\n` +
      `• Paket: ${plan.label}\n` +
      `• Total Transfer: Rp ${totalAmount.toLocaleString('id-ID')} (Kode Unik: ${uniqueCode})\n\n` +
      `Mohon diaktifkan akun saya. Terima kasih!`
    );

    const waPhone = (manualCfg.whatsappNumber || '628123456789').replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${waPhone}?text=${waText}`;

    res.json({
      success: true,
      gateway: 'manual',
      orderId,
      baseAmount: plan.priceIdr,
      uniqueCode,
      totalAmount,
      totalFormatted: `Rp ${totalAmount.toLocaleString('id-ID')}`,
      qrisImage: manualCfg.qrisImage,
      bankName: manualCfg.bankName,
      accountNumber: manualCfg.accountNumber,
      accountName: manualCfg.accountName,
      instructions: manualCfg.instructions,
      whatsappUrl,
      plan: {
        key: planKey,
        label: plan.label,
        days: plan.days,
        priceIdr: plan.priceIdr,
        priceFormatted: `Rp ${plan.priceIdr.toLocaleString('id-ID')}`,
      },
    });
  } catch (err) {
    console.error('[studio/create-manual-payment]', err.message);
    res.status(500).json({ success: false, message: 'Gagal membuat order manual' });
  }
});

// ─── POST /api/studio/upload-payment-proof ────────────────────────────────────
router.post('/upload-payment-proof', verifyToken, async (req, res) => {
  try {
    const { orderId, proofImage, notes } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID wajib diisi' });

    const [rows] = await getPool().execute(
      'SELECT id, status FROM studio_orders WHERE order_id = ? AND user_id = ?',
      [orderId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

    await getPool().execute(
      'UPDATE studio_orders SET proof_image = ?, admin_notes = ? WHERE order_id = ?',
      [proofImage || null, notes || 'Bukti bayar diunggah oleh user', orderId]
    );

    res.json({
      success: true,
      message: '✅ Bukti transfer berhasil dikirim! Admin akan segera memverifikasi pesanan Anda.',
    });
  } catch (err) {
    console.error('[studio/upload-payment-proof]', err.message);
    res.status(500).json({ success: false, message: 'Gagal mengunggah bukti bayar' });
  }
});

// ─── POST /api/studio/tripay-webhook ──────────────────────────────────────────
// Dipanggil Tripay Server ketika pembayaran lunas
async function processTripayWebhook(req, res) {
  try {
    const tripayCfg = await resolveTripayConfig();
    const signature = req.headers['x-callback-signature'];
    const callbackEvent = req.headers['x-callback-event'];

    if (!verifyTripayWebhookSignature(req.rawBody || req.body, signature, tripayCfg.privateKey)) {
      console.warn('[tripay/webhook] Invalid signature received');
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    if (callbackEvent !== 'payment_status') {
      return res.json({ success: true, message: 'Event ignored' });
    }

    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { merchant_ref, status } = data;

    const [orderRows] = await getPool().execute(
      'SELECT * FROM studio_orders WHERE order_id = ? OR reference = ?',
      [merchant_ref, data.reference || merchant_ref]
    );
    const order = orderRows[0];
    if (!order) {
      console.warn('[tripay/webhook] Order not found:', merchant_ref);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status === 'PAID' && order.status !== 'paid') {
      const planDays = order.plan_days;
      const userId   = order.user_id;

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
        "UPDATE studio_orders SET status = 'paid', paid_at = NOW() WHERE id = ?",
        [order.id]
      );

      console.log(`✅ [tripay/webhook] VIP activated: user=${userId} plan=${planName} until=${newExpiry.toISOString()}`);
    } else if (['EXPIRED', 'FAILED'].includes(status)) {
      await getPool().execute(
        'UPDATE studio_orders SET status = ? WHERE id = ?',
        [status.toLowerCase(), order.id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[studio/tripay-webhook]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

router.post('/tripay-webhook', processTripayWebhook);

// ─── POST /api/studio/payment-webhook (Midtrans) ─────────────────────────────
async function processStudioWebhook(req, res) {
  try {
    const cfg     = await resolveMidtransConfig();
    const fields  = extractNotificationFields(req.body, req.rawBody);
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

    const isPaid   = isPaidStatus(transactionStatus, fraudStatus);
    const isFailed = isFailedStatus(transactionStatus);

    if (isPaid && order.status !== 'paid') {
      const planDays = order.plan_days;
      const userId   = order.user_id;

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
        "UPDATE studio_orders SET status = 'paid', paid_at = NOW() WHERE order_id = ?",
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
router.get('/payment-status/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const [rows] = await getPool().execute(
      'SELECT * FROM studio_orders WHERE (order_id = ? OR reference = ?) AND user_id = ?',
      [orderId, orderId, req.user.id]
    );
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    res.json({
      success:       true,
      orderId:       order.order_id,
      gateway:       order.gateway,
      paymentMethod: order.payment_method,
      status:        order.status,
      isPaid:        order.status === 'paid',
      planKey:       order.plan_key,
      planDays:      order.plan_days,
      amount:        order.amount,
      qrUrl:         order.qr_url,
      checkoutUrl:   order.checkout_url,
      payCode:       order.pay_code,
      paidAt:        order.paid_at,
      createdAt:     order.created_at,
    });
  } catch (err) {
    console.error('[studio/payment-status]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── ADMIN ENDPOINTS: Manage Studio Orders ───────────────────────────────────

// GET /api/studio/admin/orders
router.get('/admin/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await getPool().execute(`
      SELECT o.*, u.username, u.email
      FROM studio_orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 100
    `);
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/studio/admin/approve-order/:orderId
router.post('/admin/approve-order/:orderId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [rows] = await getPool().execute(
      'SELECT * FROM studio_orders WHERE order_id = ?', [orderId]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

    const planDays = order.plan_days;
    const userId   = order.user_id;

    const [existingRows] = await getPool().execute(
      'SELECT skin_studio_vip_expires FROM users WHERE id = ?', [userId]
    );
    const existing      = existingRows[0];
    const now           = new Date();
    const currentExpiry = existing?.skin_studio_vip_expires && new Date(existing.skin_studio_vip_expires) > now
      ? new Date(existing.skin_studio_vip_expires)
      : now;

    const newExpiry = new Date(currentExpiry.getTime() + planDays * 24 * 60 * 60 * 1000);
    const planName  = PLANS[order.plan_key]?.label || `VIP Studio ${planDays} Hari (Manual)`;

    await getPool().execute(
      'UPDATE users SET skin_studio_vip_expires = ?, skin_studio_plan = ? WHERE id = ?',
      [newExpiry, planName, userId]
    );

    await getPool().execute(
      "UPDATE studio_orders SET status = 'paid', paid_at = NOW(), approved_by = ? WHERE order_id = ?",
      [req.user.id, orderId]
    );

    res.json({
      success: true,
      message: `✅ Order ${orderId} berhasil disetujui! VIP Studio aktif selama ${planDays} hari.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/studio/admin/generate-keys
router.post('/admin/generate-keys', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days || '30', 10);
    const count = Math.min(Math.max(parseInt(req.body.count || '1', 10), 1), 50);
    const hmacSecret = process.env.STUDIO_LICENSE_HMAC_SECRET || process.env.JWT_SECRET || 'mei-labs-studio-key';

    const keys = [];
    for (let i = 0; i < count; i++) {
      const salt = crypto.randomBytes(3).toString('hex').toUpperCase();
      const payload = `MEI-VIP-${days}-${salt}`;
      const hmac = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex').toUpperCase().substring(0, 8);
      keys.push(`${payload}-${hmac}`);
    }

    res.json({
      success: true,
      message: `✅ Berhasil membuat ${count} kode lisensi VIP (${days} hari)`,
      days,
      count,
      keys
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.processStudioWebhook = processStudioWebhook;
module.exports.processTripayWebhook = processTripayWebhook;
