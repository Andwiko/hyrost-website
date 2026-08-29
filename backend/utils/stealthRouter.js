/**
 * =============================================================================
 * HYROST — Stealth Opaque Route Obfuscator & Universal Clean Route Registry
 * Complete Route & Token Mapping for All HTML Files (No .html Exposed)
 * =============================================================================
 */

// 1. Static Token Registry (Stealth Token -> Physical File)
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

// 2. Comprehensive Clean Route Aliases (Path -> Physical File)
const CLEAN_ROUTES = {
  // Primary Navigation
  'dashboard': 'dashboard.html',
  'home': 'index.html',
  'privacy': 'privacy.html',
  'terms': 'terms.html',
  'verify-user': 'verify-user.html',

  // Bot
  'bot': 'bot/index.html',
  'bot/skin': 'bot/skin.html',
  'bot/skin-studio': 'bot/skin-studio.html',
  'bot/changelog': 'bot/changelog.html',
  'skin': 'bot/skin.html',
  'skin-studio': 'bot/skin-studio.html',
  'changelog': 'bot/changelog.html',

  // Auth
  'login': 'auth/login.html',
  'auth/login': 'auth/login.html',
  'register': 'auth/register.html',
  'auth/register': 'auth/register.html',
  'forgot-password': 'auth/forgot-password.html',
  'auth/forgot-password': 'auth/forgot-password.html',
  'reset-password': 'auth/reset-password.html',
  'auth/reset-password': 'auth/reset-password.html',

  // Account & Inventory
  'account': 'account/index.html',
  'account/index': 'account/index.html',
  'profile': 'account/index.html',
  'inventory': 'inventory/inventory.html',
  'inventory/inventory': 'inventory/inventory.html',

  // Modules & Features
  'store': 'modules/store.html',
  'modules/store': 'modules/store.html',
  'forum': 'modules/forum.html',
  'modules/forum': 'modules/forum.html',
  'forum-thread': 'modules/forum-thread.html',
  'modules/forum-thread': 'modules/forum-thread.html',
  'showcase': 'modules/showcase.html',
  'modules/showcase': 'modules/showcase.html',
  'map': 'modules/map.html',
  'modules/map': 'modules/map.html',
  'leaderboard': 'modules/leaderboard.html',
  'modules/leaderboard': 'modules/leaderboard.html',
  'rewards': 'modules/rewards.html',
  'modules/rewards': 'modules/rewards.html',
  'wiki': 'modules/wiki.html',
  'modules/wiki': 'modules/wiki.html',
  'wiki-article': 'modules/wiki-article.html',
  'modules/wiki-article': 'modules/wiki-article.html',
  'social': 'modules/social.html',
  'modules/social': 'modules/social.html',
  'chat': 'modules/chat.html',
  'modules/chat': 'modules/chat.html',
  'support': 'modules/support.html',
  'modules/support': 'modules/support.html',
  'admin': 'modules/admin.html',
  'modules/admin': 'modules/admin.html',

  // Marketplace
  'marketplace': 'marketplace/shop.html',
  'marketplace/index': 'marketplace/index.html',
  'marketplace/shop': 'marketplace/shop.html',
  'marketplace/auction': 'marketplace/auction.html',
  'marketplace/cart': 'marketplace/cart.html',
  'marketplace/checkout': 'marketplace/checkout.html',
  'marketplace/upload': 'marketplace/upload.html',
  'shop': 'marketplace/shop.html',
  'auction': 'marketplace/auction.html',
  'cart': 'marketplace/cart.html',
  'checkout': 'marketplace/checkout.html'
};

// Inverted lookup map
const FILE_TO_TOKEN = {};
for (const [token, file] of Object.entries(STEALTH_REGISTRY)) {
  const fLower = file.toLowerCase();
  const clean = fLower.replace(/\.html$/i, '');
  
  FILE_TO_TOKEN[fLower] = token;
  FILE_TO_TOKEN[clean] = token;
  FILE_TO_TOKEN['/' + fLower] = token;
  FILE_TO_TOKEN['/' + clean] = token;
}

/**
 * Resolve stealth token to physical HTML file
 */
function resolveTokenToFile(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  return STEALTH_REGISTRY[cleanToken] || null;
}

/**
 * Resolve clean path to physical HTML file
 */
function resolveCleanPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  const clean = rawPath.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  if (CLEAN_ROUTES[clean]) return CLEAN_ROUTES[clean];
  if (CLEAN_ROUTES[clean + '.html']) return CLEAN_ROUTES[clean + '.html'];
  return null;
}

/**
 * Resolve physical file to token
 */
function resolveFileToToken(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  let normalized = filePath.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  if (!normalized) return null;
  return FILE_TO_TOKEN[normalized] || FILE_TO_TOKEN[normalized + '.html'] || null;
}

/**
 * Extract token from request URL / query string
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

    // Check ?pv3Ad
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
  CLEAN_ROUTES,
  FILE_TO_TOKEN,
  resolveTokenToFile,
  resolveCleanPath,
  resolveFileToToken,
  extractTokenFromRequest
};
