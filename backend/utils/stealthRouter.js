/**
 * =============================================================================
 * HYROST — Stealth Opaque Route Obfuscator & Token Resolver
 * Complete 37 HTML File Registry for Undetectable URL Masking
 * =============================================================================
 */

const crypto = require('crypto');

// 1. Complete Static Token Registry (All 37 HTML Files)
const STEALTH_REGISTRY = {
  // Root & Core
  'pv3Ad': 'dashboard.html',
  'hY1Ro': 'index.html',
  'pRv1C': 'privacy.html',
  'tRm9S': 'terms.html',
  'vRf8U': 'verify-user.html',

  // Bot & Studio
  'sK1nS': 'bot/skin.html',
  'sKStD': 'bot/skin-studio.html',
  'b0tM3': 'bot/index.html',
  'bChLog': 'bot/changelog.html',

  // Auth
  'Lg8In': 'auth/login.html',
  'Rg3St': 'auth/register.html',
  'fOrgP': 'auth/forgot-password.html',
  'rSetP': 'auth/reset-password.html',

  // Account & Inventory
  'aCc9T': 'account/index.html',
  'iNv4K': 'inventory/inventory.html',

  // Modules
  'xK9Lm': 'modules/admin.html',
  't7Y4b': 'modules/store.html',
  'lDb8R': 'modules/leaderboard.html',
  'rW9Dz': 'modules/rewards.html',
  'f0rUm': 'modules/forum.html',
  'fThR8': 'modules/forum-thread.html',
  'wK1iX': 'modules/wiki.html',
  'wArT9': 'modules/wiki-article.html',
  's0cIa': 'modules/social.html',
  'sUp7P': 'modules/support.html',
  'mAp3D': 'modules/map.html',
  'sHw6C': 'modules/showcase.html',
  'mProf': 'modules/profile.html',
  'mSkSt': 'modules/skin-studio.html',
  'r0lSh': 'modules/role_shop.html',
  'mChat': 'modules/chat.html',

  // Marketplace
  'mK7tP': 'marketplace/index.html',
  'mSh0p': 'marketplace/shop.html',
  'mAuc7': 'marketplace/auction.html',
  'mCrt2': 'marketplace/cart.html',
  'mChk8': 'marketplace/checkout.html',
  'mUpl5': 'marketplace/upload.html'
};

// Inverted map for instant lookup (file path -> token)
const FILE_TO_TOKEN = {};
for (const [token, file] of Object.entries(STEALTH_REGISTRY)) {
  const fLower = file.toLowerCase();
  const clean = fLower.replace(/\.html$/i, '');
  
  FILE_TO_TOKEN[fLower] = token;
  FILE_TO_TOKEN[clean] = token;
  FILE_TO_TOKEN['/' + fLower] = token;
  FILE_TO_TOKEN['/' + clean] = token;
  FILE_TO_TOKEN['../' + fLower] = token;
  FILE_TO_TOKEN['../' + clean] = token;
}

/**
 * Resolve stealth token to actual HTML file relative to web root
 * @param {string} token - e.g. "pv3Ad"
 * @returns {string|null} - e.g. "dashboard.html"
 */
function resolveTokenToFile(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  return STEALTH_REGISTRY[cleanToken] || null;
}

/**
 * Get stealth token for a file or path
 * @param {string} filePath - e.g. "/dashboard.html" or "modules/admin"
 * @returns {string|null} - e.g. "pv3Ad"
 */
function resolveFileToToken(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  let normalized = filePath.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  if (!normalized) return null;
  return FILE_TO_TOKEN[normalized] || FILE_TO_TOKEN[normalized + '.html'] || null;
}

/**
 * Parse incoming request URL/query to extract stealth token
 */
function extractTokenFromRequest(req) {
  const url = req.url || '';
  const parsedPath = req.path || '';

  // 1. Path format: /r/pv3Ad or /s/pv3Ad
  const pathMatch = parsedPath.match(/^\/(?:r|s)\/([a-zA-Z0-9_-]+)/);
  if (pathMatch && STEALTH_REGISTRY[pathMatch[1]]) {
    return pathMatch[1];
  }

  // 2. Query format: ?=pv3Ad or ?pv3Ad
  if (url.includes('?')) {
    const rawQuery = url.split('?')[1] || '';

    // Check ?=pv3Ad
    const eqMatch = rawQuery.match(/^=([a-zA-Z0-9_-]+)/);
    if (eqMatch && STEALTH_REGISTRY[eqMatch[1]]) {
      return eqMatch[1];
    }

    // Check ?pv3Ad (first key without value or bare token)
    const firstParam = rawQuery.split('&')[0].split('=')[0];
    if (firstParam && STEALTH_REGISTRY[firstParam]) {
      return firstParam;
    }

    // Check ?p=pv3Ad or ?v=pv3Ad
    if (req.query) {
      if (req.query.p && STEALTH_REGISTRY[req.query.p]) return req.query.p;
      if (req.query.v && STEALTH_REGISTRY[req.query.v]) return req.query.v;
      if (req.query[''] && STEALTH_REGISTRY[req.query['']]) return req.query[''];
    }
  }

  return null;
}

module.exports = {
  STEALTH_REGISTRY,
  FILE_TO_TOKEN,
  resolveTokenToFile,
  resolveFileToToken,
  extractTokenFromRequest
};
