/**
 * =============================================================================
 * HYROST — Client-Side Stealth Route Masker & Navigation Interceptor
 * Complete 37 HTML File Support, Instant Hover Link Masking & Dynamic Loader
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
    FILE_TO_TOKEN['../' + fLower] = token;
    FILE_TO_TOKEN['../' + clean] = token;
    FILE_TO_TOKEN['../../' + fLower] = token;
    FILE_TO_TOKEN['../../' + clean] = token;

    // Basename match for relative links
    const base = fLower.split('/').pop();
    if (!FILE_TO_TOKEN[base]) FILE_TO_TOKEN[base] = token;
    if (!FILE_TO_TOKEN[base.replace(/\.html$/i, '')]) FILE_TO_TOKEN[base.replace(/\.html$/i, '')] = token;
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

  // 1. Rewrite all anchor href attributes so hover previews show /?=pv3Ad
  function rewriteAllLinksToStealth() {
    try {
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return;
        
        // Skip already formatted stealth URLs
        if (href.startsWith('/?=')) return;

        const token = getStealthTokenForPath(href);
        if (token) {
          const params = href.includes('?') ? '&' + href.slice(href.indexOf('?') + 1) : '';
          a.setAttribute('href', `/?=${token}${params}`);
        }
      });
    } catch (_) {}
  }

  // 2. Instant Address Bar Normalization on Page Load
  function applyStealthAddressBar() {
    try {
      if (!global.location || !global.history || !global.history.replaceState) return;

      const p = global.location.pathname;
      const search = global.location.search || '';
      const hash = global.location.hash || '';

      // If already has stealth token in query (e.g. ?=pv3Ad or ?pv3Ad)
      if (search.includes('=')) {
        const rawToken = search.replace(/^\?/, '');
        const match = rawToken.match(/(?:^|=)([a-zA-Z0-9_-]{5})/);
        if (match && STEALTH_REGISTRY[match[1]]) {
          if (p !== '/' && p !== '') {
            global.history.replaceState(null, '', `/?=${match[1]}${hash}`);
          }
          return;
        }
      }

      // If URL has file path (e.g. /dashboard.html or /modules/admin.html or /dashboard)
      const token = getStealthTokenForPath(p);
      if (token) {
        const cleanSearch = search ? search.replace(/^\?/, '&') : '';
        global.history.replaceState(null, '', `/?=${token}${cleanSearch}${hash}`);
      } else if (p === '/index.html' || p === 'index.html') {
        global.history.replaceState(null, '', `/${search}${hash}`);
      }
    } catch (_) {}
  }

  // 3. Fallback Dynamic Page Loader if Server Served Index on Token Request
  function checkAndLoadIntendedPage() {
    try {
      const search = global.location.search || '';
      const match = search.match(/(?:^\?=?|&)([a-zA-Z0-9_-]{5})/);
      if (match && STEALTH_REGISTRY[match[1]]) {
        const token = match[1];
        const targetFile = STEALTH_REGISTRY[token];
        const currentPath = global.location.pathname.replace(/^\/+/, '').toLowerCase();

        // If user requested a token other than index, but server loaded index.html
        if ((currentPath === '' || currentPath === 'index.html') && targetFile !== 'index.html') {
          const isIndexPage = document.querySelector('.hero-title') !== null || document.title.includes('Hyrost Realm - Modern');
          if (isIndexPage) {
            console.log(`[StealthRouter] Loading intended page: ${targetFile}`);
            // Fetch intended HTML and replace document
            fetch('/' + targetFile)
              .then(res => res.text())
              .then(html => {
                document.open();
                document.write(html);
                document.close();
                global.history.replaceState(null, '', `/?=${token}`);
              })
              .catch(() => {
                global.location.href = '/' + targetFile;
              });
          }
        }
      }
    } catch (_) {}
  }

  // 4. Intercept Internal Link Clicks
  function bindLinkInterceptor() {
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a');
      if (!a || !a.href) return;

      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      const token = getStealthTokenForPath(href);
      if (token) {
        e.preventDefault();
        const urlParams = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
        const targetUrl = `/?=${token}${urlParams ? '&' + urlParams : ''}`;
        global.location.href = targetUrl;
      }
    }, true);
  }

  // Run immediately on script evaluation
  applyStealthAddressBar();
  checkAndLoadIntendedPage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyStealthAddressBar();
      rewriteAllLinksToStealth();
      bindLinkInterceptor();
      checkAndLoadIntendedPage();
    });
  } else {
    rewriteAllLinksToStealth();
    bindLinkInterceptor();
  }

  // Observer for dynamically added links
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      rewriteAllLinksToStealth();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Expose global helpers
  global.HyrostStealth = {
    REGISTRY: STEALTH_REGISTRY,
    getStealthUrl,
    getStealthTokenForPath,
    navigate: function (filePath, extraQuery) {
      global.location.href = getStealthUrl(filePath, extraQuery);
    }
  };

  // Override legacy navigation helpers
  global.goToDashboard = function () {
    global.location.href = '/?=pv3Ad';
  };
  global.showLoginModal = function () {
    global.location.href = '/?=Lg8In';
  };
})(typeof window !== 'undefined' ? window : this);
