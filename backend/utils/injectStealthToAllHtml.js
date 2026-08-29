const fs = require('fs');
const path = require('path');

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

const root = path.resolve(__dirname, '../..');

let countInjected = 0;
for (const [token, relFile] of Object.entries(STEALTH_REGISTRY)) {
  const full = path.join(root, relFile);
  if (fs.existsSync(full)) {
    let content = fs.readFileSync(full, 'utf8');
    if (!content.includes('stealthRouter.js')) {
      const scriptTag = '<script src="/assets/js/stealthRouter.js"></script>';
      if (content.includes('<head>')) {
        content = content.replace('<head>', '<head>\n  ' + scriptTag);
      } else if (content.includes('<head ')) {
        content = content.replace(/(<head[^>]*>)/i, '$1\n  ' + scriptTag);
      } else {
        content = scriptTag + '\n' + content;
      }
      fs.writeFileSync(full, content, 'utf8');
      countInjected++;
      console.log('✅ Injected stealthRouter into:', relFile);
    }
  } else {
    console.warn('⚠️ File not found:', relFile);
  }
}

console.log(`\n🎉 Total HTML files updated: ${countInjected} files.`);
