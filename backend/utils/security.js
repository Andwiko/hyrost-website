'use strict';

const ALLOWED_ROLES = ['Member', 'VIP', 'MVP', 'Sultan', 'HYROST ROYAL', 'ROYAL', 'Admin'];
const ALLOWED_COIN_COLS = ['coin_bronze', 'coin_silver', 'coin_gold'];
const ALLOWED_REWARD_TYPES = ['bronze', 'silver', 'gold'];

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
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

module.exports = {
  ALLOWED_ROLES,
  ALLOWED_COIN_COLS,
  ALLOWED_REWARD_TYPES,
  sanitizeRole,
  coinColumn,
  escapeHtml,
  generateReferralCode,
};
