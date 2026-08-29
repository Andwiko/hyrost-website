'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/mysql');

function sanitizeKey(raw) {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

function parseBool(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  const s = String(val).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  return fallback;
}

function readEnvFileOverrides() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return {};
  try {
    const dotenv = require('dotenv');
    return dotenv.parse(fs.readFileSync(envPath));
  } catch (_) {
    return {};
  }
}

function siteOrigin() {
  const raw = sanitizeKey(process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL || '');
  if (raw) return raw.replace(/\/+$/, '');
  return 'https://hyrost.web.id';
}

/**
 * Resolve Tripay config from disk .env + MySQL site_settings
 */
async function resolveTripayConfig() {
  const fileEnv = readEnvFileOverrides();

  let apiKey = sanitizeKey(fileEnv.TRIPAY_API_KEY || process.env.TRIPAY_API_KEY);
  let privateKey = sanitizeKey(fileEnv.TRIPAY_PRIVATE_KEY || process.env.TRIPAY_PRIVATE_KEY);
  let merchantCode = sanitizeKey(fileEnv.TRIPAY_MERCHANT_CODE || process.env.TRIPAY_MERCHANT_CODE);
  let isProd = parseBool(fileEnv.TRIPAY_IS_PRODUCTION, parseBool(process.env.TRIPAY_IS_PRODUCTION, false));
  let enabled = parseBool(fileEnv.TRIPAY_ENABLED, parseBool(process.env.TRIPAY_ENABLED, false));

  try {
    const [rows] = await pool.execute(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('pay_tripay_api_key', 'pay_tripay_private_key', 'pay_tripay_merchant_code', 'pay_tripay_is_production', 'pay_tripay_enabled')"
    );
    for (const r of rows) {
      const val = r.setting_value;
      if (r.setting_key === 'pay_tripay_api_key' && sanitizeKey(val)) apiKey = sanitizeKey(val);
      if (r.setting_key === 'pay_tripay_private_key' && sanitizeKey(val)) privateKey = sanitizeKey(val);
      if (r.setting_key === 'pay_tripay_merchant_code' && sanitizeKey(val)) merchantCode = sanitizeKey(val);
      if (r.setting_key === 'pay_tripay_is_production' && val !== null && val !== '') isProd = parseBool(val, isProd);
      if (r.setting_key === 'pay_tripay_enabled' && val !== null && val !== '') enabled = parseBool(val, enabled);
    }
  } catch (dbErr) {
    console.warn('[tripay] site_settings fetch error, using env fallback:', dbErr.message);
  }

  const hasKeys = Boolean(apiKey && privateKey && merchantCode);
  enabled = enabled && hasKeys;

  const baseUrl = isProd
    ? 'https://tripay.co.id/api'
    : 'https://tripay.co.id/api-sandbox';

  return {
    apiKey,
    privateKey,
    merchantCode,
    isProd,
    enabled,
    baseUrl,
  };
}

/**
 * Generate Tripay Closed Transaction Signature:
 * HMAC-SHA256( merchantCode + merchantRef + amount, privateKey )
 */
function createTripaySignature(merchantCode, merchantRef, amount, privateKey) {
  const payload = `${merchantCode}${merchantRef}${Math.round(Number(amount))}`;
  return crypto.createHmac('sha256', privateKey).update(payload).digest('hex');
}

/**
 * Verify Webhook Callback Signature:
 * HMAC-SHA256( rawBody, privateKey ) === X-Callback-Signature header
 */
function verifyTripayWebhookSignature(rawBody, headerSignature, privateKey) {
  if (!rawBody || !headerSignature || !privateKey) return false;
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const expected = crypto.createHmac('sha256', sanitizeKey(privateKey)).update(bodyString).digest('hex');
  const target = String(headerSignature).trim().toLowerCase();
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(target, 'utf8'));
  } catch (_) {
    return expected === target;
  }
}

/**
 * Fetch list of active payment channels from Tripay
 */
async function getTripayPaymentChannels(customConfig) {
  const cfg = customConfig || await resolveTripayConfig();
  if (!cfg.apiKey) return [];

  const res = await fetch(`${cfg.baseUrl}/merchant/payment-channel`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Accept': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));
  if (res.ok && body.success && Array.isArray(body.data)) {
    return body.data.filter((c) => c.active !== false);
  }
  return [];
}

/**
 * Create a new Closed Transaction in Tripay
 */
async function createTripayTransaction(config, {
  orderId,
  amount,
  method = 'QRIS',
  customerName = 'Member',
  customerEmail = 'member@hyrost.net',
  customerPhone = '08123456789',
  itemName = 'Pembayaran',
  itemId = 'item',
  callbackUrl,
  returnUrl,
  expiredMinutes = 1440, // 24 jam
}) {
  const cfg = config || await resolveTripayConfig();
  if (!cfg.enabled || !cfg.apiKey || !cfg.privateKey || !cfg.merchantCode) {
    const err = new Error('Tripay belum dikonfigurasi atau dinonaktifkan di Admin Panel');
    err.statusCode = 503;
    throw err;
  }

  const amt = Math.round(Number(amount));
  const signature = createTripaySignature(cfg.merchantCode, orderId, amt, cfg.privateKey);
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiredMinutes * 60);

  const payload = {
    method: method || 'QRIS',
    merchant_ref: orderId,
    amount: amt,
    customer_name: customerName || 'Member',
    customer_email: customerEmail || 'member@hyrost.net',
    customer_phone: customerPhone || '08123456789',
    order_items: [
      {
        sku: String(itemId).slice(0, 50),
        name: String(itemName).slice(0, 100),
        price: amt,
        quantity: 1,
      },
    ],
    callback_url: callbackUrl || `${siteOrigin()}/api/studio/tripay-webhook`,
    return_url: returnUrl || `${siteOrigin()}/bot/skin.html?payment=success`,
    expired_time: expiryTimestamp,
    signature,
  };

  const res = await fetch(`${cfg.baseUrl}/transaction/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success || !body.data) {
    const msg = body.message || (Array.isArray(body.error) ? body.error.join(', ') : `Tripay error ${res.status}`);
    const err = new Error(msg);
    err.statusCode = res.status;
    err.apiResponse = body;
    throw err;
  }

  const d = body.data;
  return {
    reference: d.reference,
    merchantRef: d.merchant_ref,
    paymentMethod: d.payment_method,
    paymentName: d.payment_name,
    amount: d.amount,
    feeMerchant: d.fee_merchant,
    feeCustomer: d.fee_customer,
    totalAmount: d.amount_received || d.amount,
    payCode: d.pay_code || null,
    payUrl: d.pay_url || null,
    checkoutUrl: d.checkout_url || null,
    qrUrl: d.qr_url || null,
    qrString: d.qr_string || null,
    status: d.status || 'UNPAID',
    expiredTime: d.expired_time,
    instructions: Array.isArray(d.instructions) ? d.instructions : [],
  };
}

/**
 * Test Tripay API Connection
 */
async function testTripayConnection(apiKey, privateKey, merchantCode, isProduction) {
  const baseUrl = isProduction
    ? 'https://tripay.co.id/api'
    : 'https://tripay.co.id/api-sandbox';

  const res = await fetch(`${baseUrl}/merchant/payment-channel`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sanitizeKey(apiKey)}`,
      'Accept': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));
  if (res.ok && body.success) {
    return {
      success: true,
      channelsCount: Array.isArray(body.data) ? body.data.length : 0,
      channels: Array.isArray(body.data) ? body.data.map(c => ({ code: c.code, name: c.name, type: c.type })) : [],
      isProduction: Boolean(isProduction),
    };
  }

  const msg = body.message || `HTTP ${res.status} Unauthorized / Invalid Tripay Credentials`;
  return {
    success: false,
    message: msg,
  };
}

module.exports = {
  resolveTripayConfig,
  createTripaySignature,
  verifyTripayWebhookSignature,
  getTripayPaymentChannels,
  createTripayTransaction,
  testTripayConnection,
};
