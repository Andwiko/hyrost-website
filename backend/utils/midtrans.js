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

function inferIsProduction(serverKey, clientKey, explicit) {
  const sk = sanitizeKey(serverKey);
  const ck = sanitizeKey(clientKey);
  if (sk.startsWith('SB-') || ck.startsWith('SB-')) return false;
  if (sk.startsWith('Mid-server-') || ck.startsWith('Mid-client-')) return true;
  return Boolean(explicit);
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

function isPlaceholderKey(key) {
  const k = sanitizeKey(key);
  if (!k) return true;
  return /ganti_dengan|your[_-]?|xxx|placeholder|changeme/i.test(k);
}

function siteOrigin() {
  const raw = sanitizeKey(process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL || '');
  if (raw) return raw.replace(/\/+$/, '');
  return 'https://hyrost.net';
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function safeCustomerEmail(email, username) {
  const candidate = String(email || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return candidate;
  const uname = String(username || 'user').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32) || 'user';
  return `${uname}@hyrost.net`;
}

function safePersonName(name) {
  const cleaned = String(name || 'Member').replace(/[^\w\s.-]/g, '').trim();
  return (cleaned || 'Member').slice(0, 50);
}

async function resolveMidtransConfig() {
  const fileEnv = readEnvFileOverrides();

  let isProd = parseBool(fileEnv.MIDTRANS_IS_PRODUCTION, parseBool(process.env.MIDTRANS_IS_PRODUCTION, false));
  let serverKey = sanitizeKey(fileEnv.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY);
  let clientKey = sanitizeKey(fileEnv.MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY);
  let enabled = parseBool(fileEnv.MIDTRANS_ENABLED, parseBool(process.env.MIDTRANS_ENABLED, true));

  try {
    const [rows] = await pool.execute(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('pay_midtrans_is_production', 'pay_midtrans_server_key', 'pay_midtrans_client_key', 'pay_midtrans_enabled')"
    );
    for (const r of rows) {
      const val = r.setting_value;
      if (r.setting_key === 'pay_midtrans_is_production' && val !== null && val !== '') {
        isProd = parseBool(val, isProd);
      }
      if (r.setting_key === 'pay_midtrans_server_key' && sanitizeKey(val)) {
        serverKey = sanitizeKey(val);
      }
      if (r.setting_key === 'pay_midtrans_client_key' && sanitizeKey(val)) {
        clientKey = sanitizeKey(val);
      }
      if (r.setting_key === 'pay_midtrans_enabled' && val !== null && val !== '') {
        enabled = parseBool(val, enabled);
      }
    }
  } catch (dbErr) {
    console.warn('[midtrans] site_settings fetch error, using env fallback:', dbErr.message);
  }

  isProd = inferIsProduction(serverKey, clientKey, isProd);
  const hasKeys = !isPlaceholderKey(serverKey);
  enabled = enabled && hasKeys;

  return {
    isProd,
    serverKey,
    clientKey,
    enabled,
    snapJsUrl: isProd
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
    snapApiUrl: isProd
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    coreApiUrl: isProd
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com',
  };
}

function buildSnapPayload({ orderId, amount, itemId, itemName, username, email, callbacks, extra = {} }) {
  const payload = {
    transaction_details: {
      order_id: String(orderId).slice(0, 50),
      gross_amount: Math.round(Number(amount)),
    },
    item_details: [{
      id: String(itemId || 'item').slice(0, 50),
      price: Math.round(Number(amount)),
      quantity: 1,
      name: String(itemName || 'Pembayaran').slice(0, 50),
    }],
    customer_details: {
      first_name: safePersonName(username),
      email: safeCustomerEmail(email, username),
    },
    ...extra,
  };

  const cb = {};
  if (callbacks) {
    if (isValidHttpUrl(callbacks.finish)) cb.finish = callbacks.finish;
    if (isValidHttpUrl(callbacks.error)) cb.error = callbacks.error;
    if (isValidHttpUrl(callbacks.pending)) cb.pending = callbacks.pending;
  }
  if (Object.keys(cb).length) payload.callbacks = cb;

  return payload;
}

function defaultCallbacks(pathWithQuery) {
  const origin = siteOrigin();
  const finish = sanitizeKey(process.env.MIDTRANS_FINISH_URL) || `${origin}${pathWithQuery}`;
  const error = sanitizeKey(process.env.MIDTRANS_ERROR_URL) || `${origin}${pathWithQuery.replace('success', 'error')}`;
  const pending = sanitizeKey(process.env.MIDTRANS_PENDING_URL) || `${origin}${pathWithQuery.replace('success', 'pending')}`;
  return { finish, error, pending };
}

async function createSnapTransaction(config, payload) {
  const serverKey = sanitizeKey(config.serverKey);
  if (!serverKey) {
    const err = new Error('Midtrans Server Key belum dikonfigurasi');
    err.statusCode = 503;
    throw err;
  }

  const res = await fetch(config.snapApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    const detail = Array.isArray(body.error_messages)
      ? body.error_messages.join('; ')
      : (body.error_message || body.status_message || body.message || `HTTP ${res.status}`);
    const err = new Error(detail);
    err.statusCode = res.status === 401 ? 401 : 502;
    err.apiResponse = body;
    throw err;
  }

  return { token: body.token, redirectUrl: body.redirect_url };
}

function extractNotificationFields(notification, rawBody) {
  let parsed = notification || {};
  if (rawBody) {
    try {
      const fromRaw = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
      if (fromRaw && typeof fromRaw === 'object') parsed = fromRaw;
    } catch (_) {}
  }
  return {
    order_id: parsed.order_id,
    status_code: parsed.status_code,
    gross_amount: parsed.gross_amount,
    signature_key: parsed.signature_key,
    transaction_status: parsed.transaction_status,
    fraud_status: parsed.fraud_status,
    payment_type: parsed.payment_type,
  };
}

function verifyNotificationSignature(fields, serverKey) {
  const { order_id, status_code, gross_amount, signature_key } = fields;
  if (!order_id || !status_code || gross_amount === undefined || gross_amount === null || !signature_key) {
    return false;
  }
  const sk = sanitizeKey(serverKey);
  const targetSig = String(signature_key).trim().toLowerCase();

  const candidates = [String(gross_amount)];
  const num = Number(gross_amount);
  if (!isNaN(num)) {
    candidates.push(num.toFixed(2));
    candidates.push(String(Math.round(num)));
  }

  for (const amt of new Set(candidates)) {
    const hash = crypto
      .createHash('sha512')
      .update(String(order_id) + String(status_code) + amt + sk)
      .digest('hex')
      .toLowerCase();

    if (hash === targetSig) return true;
  }

  return false;
}

function isPaidStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === 'settlement') return fraudStatus !== 'deny';
  if (transactionStatus === 'capture') return fraudStatus === 'accept' || !fraudStatus;
  return false;
}

function isFailedStatus(transactionStatus) {
  return ['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus);
}

async function testServerKey(serverKey, isProductionHint) {
  const key = sanitizeKey(serverKey);
  const isProd = inferIsProduction(key, '', Boolean(isProductionHint));
  const endpoint = (isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com') + '/v2/nonexistent-hyrost-ping/status';

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'),
    },
  });

  return { status: res.status, isProd };
}

module.exports = {
  sanitizeKey,
  resolveMidtransConfig,
  buildSnapPayload,
  defaultCallbacks,
  createSnapTransaction,
  extractNotificationFields,
  verifyNotificationSignature,
  isPaidStatus,
  isFailedStatus,
  testServerKey,
  isPlaceholderKey,
  siteOrigin,
};
