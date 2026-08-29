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

// Map of all possible href values to stealth URLs
const HREF_REPLACEMENTS = [];
for (const [token, file] of Object.entries(STEALTH_REGISTRY)) {
  const fLower = file.toLowerCase();
  const baseName = fLower.split('/').pop();
  const cleanBase = baseName.replace(/\.html$/, '');
  const cleanFile = fLower.replace(/\.html$/, '');

  const targets = [
    file,
    '/' + file,
    '../' + file,
    '../../' + file,
    cleanFile,
    '/' + cleanFile,
    '../' + cleanFile,
    '../../' + cleanFile
  ];

  if (fLower.includes('/')) {
    targets.push(baseName);
    targets.push('../' + baseName);
    targets.push('../../' + baseName);
    targets.push(cleanBase);
    targets.push('../' + cleanBase);
    targets.push('../../' + cleanBase);
  }

  targets.forEach(tgt => {
    HREF_REPLACEMENTS.push({
      target: tgt,
      replacement: `/?=${token}`
    });
  });
}

// Sort replacements by longest target first to avoid substring partial replacement
HREF_REPLACEMENTS.sort((a, b) => b.target.length - a.target.length);

let totalReplacedFiles = 0;

for (const [token, relFile] of Object.entries(STEALTH_REGISTRY)) {
  const full = path.join(root, relFile);
  if (!fs.existsSync(full)) continue;

  let content = fs.readFileSync(full, 'utf8');
  let original = content;

  // Replace href="..."
  content = content.replace(/href=["']([^"']+)["']/gi, (match, hrefVal) => {
    if (hrefVal.startsWith('#') || hrefVal.startsWith('http://') || hrefVal.startsWith('https://') || hrefVal.startsWith('//') || hrefVal.startsWith('mailto:') || hrefVal.startsWith('tel:') || hrefVal.startsWith('javascript:')) {
      return match;
    }
    if (hrefVal.startsWith('/?=')) return match;
    if (hrefVal === 'index.html' || hrefVal === '/' || hrefVal === '../index.html') {
      return 'href="/"';
    }

    const clean = hrefVal.split('?')[0].split('#')[0].toLowerCase();
    const query = hrefVal.includes('?') ? '&' + hrefVal.slice(hrefVal.indexOf('?') + 1) : '';

    for (const item of HREF_REPLACEMENTS) {
      if (clean === item.target.toLowerCase()) {
        return `href="${item.replacement}${query}"`;
      }
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(full, content, 'utf8');
    totalReplacedFiles++;
    console.log(`✅ Updated links in ${relFile}`);
  }
}

console.log(`\n🎉 Total HTML files with updated stealth links: ${totalReplacedFiles}`);
