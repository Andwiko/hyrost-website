'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_ROLES = ['Member', 'VIP', 'MVP', 'Sultan', 'HYROST ROYAL', 'ROYAL', 'Admin'];
const ALLOWED_COIN_COLS = ['coin_bronze', 'coin_silver', 'coin_gold'];
const ALLOWED_REWARD_TYPES = ['bronze', 'silver', 'gold'];

const DATA_DIR = path.join(__dirname, '../../data');
const JWT_SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');
const JWT_REFRESH_SECRET_FILE = path.join(DATA_DIR, '.jwt_refresh_secret');

/**
 * Get a cryptographically secure, persistent JWT secret.
 * Priority:
 * 1. process.env.JWT_SECRET (if valid and >= 32 chars)
 * 2. Saved key in data/.jwt_secret (persistent across restarts)
 * 3. Auto-generated 512-bit crypto key (saved to data/.jwt_secret)
 */
function getJwtSecret() {
  const envSecret = process.env.JWT_SECRET;
  if (
    envSecret &&
    envSecret.length >= 32 &&
    !envSecret.includes('dev_only') &&
    !envSecret.includes('master_secret_jwt_key')
  ) {
    return envSecret;
  }

  try {
    if (fs.existsSync(JWT_SECRET_FILE)) {
      const stored = fs.readFileSync(JWT_SECRET_FILE, 'utf8').trim();
      if (stored.length >= 32) return stored;
    }
  } catch (e) {}

  // Generate strong 512-bit hex secret and persist it
  const generated = crypto.randomBytes(64).toString('hex');
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(JWT_SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    console.log('🔒 Generated and persisted a new 512-bit JWT Secret in data/.jwt_secret');
  } catch (err) {
    console.warn('⚠️ Could not persist JWT secret file, using in-memory random secret:', err.message);
  }

  return generated;
}

/**
 * Get a cryptographically secure, persistent JWT Refresh Token secret.
 */
function getJwtRefreshSecret() {
  const envSecret = process.env.JWT_REFRESH_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  try {
    if (fs.existsSync(JWT_REFRESH_SECRET_FILE)) {
      const stored = fs.readFileSync(JWT_REFRESH_SECRET_FILE, 'utf8').trim();
      if (stored.length >= 32) return stored;
    }
  } catch (e) {}

  const generated = crypto.randomBytes(64).toString('hex');
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(JWT_REFRESH_SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {}

  return generated;
}

function sanitizeRole(input) {
  if (!input || typeof input !== 'string') return 'Member';
  const match = ALLOWED_ROLES.find((r) => r.toLowerCase() === input.trim().toLowerCase());
  return match || 'Member';
}

function coinColumn(rewardType) {
  const t = String(rewardType || 'bronze').toLowerCase();
  if (!ALLOWED_REWARD_TYPES.includes(t)) return null;
  return `coin_${t}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateReferralCode(username) {
  const base = String(username || 'HYROST').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${base}${rand}`;
}

module.exports = {
  ALLOWED_ROLES,
  ALLOWED_COIN_COLS,
  ALLOWED_REWARD_TYPES,
  getJwtSecret,
  getJwtRefreshSecret,
  sanitizeRole,
  coinColumn,
  escapeHtml,
  generateReferralCode,
};
