'use strict';

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const pool = require('../config/mysql');

exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const secret = speakeasy.generateSecret({ name: `Hyrost Admin (${req.user.username})`, length: 20 });

    await pool.execute(
      'INSERT INTO admin_totp (user_id, secret, enabled) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE secret = ?, enabled = 0',
      [userId, secret.base32, secret.base32]
    );

    const qr = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, secret: secret.base32, qrCode: qr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    const [rows] = await pool.execute('SELECT secret FROM admin_totp WHERE user_id = ?', [userId]);
    if (!rows.length) return res.status(400).json({ success: false, message: '2FA belum di-setup' });

    const valid = speakeasy.totp.verify({ secret: rows[0].secret, encoding: 'base32', token, window: 1 });
    if (!valid) return res.status(401).json({ success: false, message: 'Kode 2FA salah' });

    await pool.execute('UPDATE admin_totp SET enabled = 1 WHERE user_id = ?', [userId]);
    req.session = req.session || {};
    req.session.admin2faVerified = true;

    res.json({ success: true, message: '2FA aktif' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.validate2FAToken = async (userId, token) => {
  const [rows] = await pool.execute('SELECT secret, enabled FROM admin_totp WHERE user_id = ?', [userId]);
  if (!rows.length || !rows[0].enabled) return true;
  return speakeasy.totp.verify({ secret: rows[0].secret, encoding: 'base32', token: String(token || ''), window: 1 });
};

exports.check2FARequired = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT enabled FROM admin_totp WHERE user_id = ?', [req.user.id]);
    if (!rows.length || !rows[0].enabled) return next();

    const token = req.headers['x-admin-2fa'] || req.body?.totpToken;
    const valid = await exports.validate2FAToken(req.user.id, token);
    if (!valid) {
      return res.status(403).json({ success: false, message: '2FA required', requires2FA: true });
    }
    next();
  } catch (err) {
    next(err);
  }
};
