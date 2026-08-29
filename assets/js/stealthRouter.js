/**
 * =============================================================================
 * HYROST — Client-Side Route Resolver & Safe Navigation Helper
 * Direct File Support, Clean URL Resolution & Backward-Compatible Token Mapping
 * =============================================================================
 */

(function (global) {
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

  const FILE_TO_TOKEN = {};
  for (const [token, file] of Object.entries(STEALTH_REGISTRY)) {
    const fLower = file.toLowerCase();
    const clean = fLower.replace(/\.html$/i, '');
    FILE_TO_TOKEN[fLower] = token;
    FILE_TO_TOKEN[clean] = token;
    FILE_TO_TOKEN['/' + fLower] = token;
    FILE_TO_TOKEN['/' + clean] = token;
  }

  function getStealthTokenForPath(path) {
    if (!path) return null;
    const clean = String(path).split('?')[0].split('#')[0].trim().toLowerCase();
    return FILE_TO_TOKEN[clean] || FILE_TO_TOKEN[clean.replace(/^\/+/, '')] || null;
  }

  function getStealthUrl(filePath, extraQuery = '') {
    const token = getStealthTokenForPath(filePath);
    if (token) {
      return `/?=${token}${extraQuery ? '&' + extraQuery.replace(/^\?/, '') : ''}`;
    }
    return filePath;
  }

  // Expose global helpers
  global.HyrostStealth = {
    REGISTRY: STEALTH_REGISTRY,
    getStealthUrl,
    getStealthTokenForPath,
    navigate: function (filePath, extraQuery) {
      if (!filePath) return;
      let target = filePath.startsWith('/') ? filePath : '/' + filePath;
      if (extraQuery) {
        target += (target.includes('?') ? '&' : '?') + extraQuery.replace(/^\?/, '');
      }
      global.location.href = target;
    }
  };

  // Standard global navigation helpers
  global.goToDashboard = function () {
    global.location.href = '/dashboard.html';
  };
  global.showLoginModal = function () {
    global.location.href = '/auth/login.html';
  };
})(typeof window !== 'undefined' ? window : this);
