/**
 * HYROST — Convert window.location.href in JS files to stealth tokens
 */
const fs = require('fs');
const path = require('path');

const TOKEN_MAP = {
  '/dashboard.html':             '/?=pv3Ad',
  '/index.html':                 '/?=hY1Ro',
  '/privacy.html':               '/?=pRv1C',
  '/terms.html':                 '/?=tRm9S',
  '/verify-user.html':           '/?=vRf8U',
  '/bot/skin.html':              '/?=sK1nS',
  '/bot/skin-studio.html':       '/?=sKStD',
  '/bot/index.html':             '/?=b0tM3',
  '/bot/changelog.html':         '/?=bChLog',
  '/auth/login.html':            '/?=Lg8In',
  '/auth/register.html':         '/?=Rg3St',
  '/auth/forgot-password.html':  '/?=fOrgP',
  '/auth/reset-password.html':   '/?=rSetP',
  '/account/index.html':         '/?=aCc9T',
  '/inventory/inventory.html':   '/?=iNv4K',
  '/modules/admin.html':         '/?=xK9Lm',
  '/modules/store.html':         '/?=t7Y4b',
  '/modules/leaderboard.html':   '/?=lDb8R',
  '/modules/rewards.html':       '/?=rW9Dz',
  '/modules/forum.html':         '/?=f0rUm',
  '/modules/forum-thread.html':  '/?=fThR8',
  '/modules/wiki.html':          '/?=wK1iX',
  '/modules/wiki-article.html':  '/?=wArT9',
  '/modules/social.html':        '/?=s0cIa',
  '/modules/support.html':       '/?=sUp7P',
  '/modules/map.html':           '/?=mAp3D',
  '/modules/showcase.html':      '/?=sHw6C',
  '/modules/profile.html':       '/?=mProf',
  '/modules/skin-studio.html':   '/?=mSkSt',
  '/modules/role_shop.html':     '/?=r0lSh',
  '/modules/chat.html':          '/?=mChat',
  '/marketplace/index.html':     '/?=mK7tP',
  '/marketplace/shop.html':      '/?=mSh0p',
  '/marketplace/auction.html':   '/?=mAuc7',
  '/marketplace/cart.html':      '/?=mCrt2',
  '/marketplace/checkout.html':  '/?=mChk8',
  '/marketplace/upload.html':    '/?=mUpl5',
};

// Target JS files to update (not HTML files - those were already done)
const JS_FILES = [
  'index.js',
  'account/account.js',
  'auth/login.js',
  'auth/register.js',
  'auth/reset-password.js',
  'bot/skin.js',
  'inventory/inventory.js',
  'marketplace/js/script.js',
  'modules/admin.js',
  'modules/forum-thread.js',
  'modules/showcase.js',
  'dashboard.js',
  'assets/js/notifications.js',
  'assets/js/server_status.js',
];

const ROOT = path.resolve(__dirname);
let totalFiles = 0, totalChanges = 0;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const relFile of JS_FILES) {
  const filePath = path.join(ROOT, relFile);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Skipped (not found): ${relFile}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let count = 0;

  for (const [htmlPath, stealthUrl] of Object.entries(TOKEN_MAP)) {
    // Match single or double quoted strings containing the html path
    const patterns = [
      // window.location.href = '/path/file.html'  or  = "/path/file.html"
      new RegExp(`(window\\.location(?:\\.href)?\\s*=\\s*)(['"])${escapeRegex(htmlPath)}\\2`, 'g'),
      // window.location.replace('/path/file.html')
      new RegExp(`(window\\.location\\.replace\\s*\\(\\s*)(['"])${escapeRegex(htmlPath)}\\2`, 'g'),
      // location.href = '/path/file.html'
      new RegExp(`(location\\.href\\s*=\\s*)(['"])${escapeRegex(htmlPath)}\\2`, 'g'),
    ];

    for (const regex of patterns) {
      const before = content;
      content = content.replace(regex, `$1$2${stealthUrl}$2`);
      if (content !== before) { changed = true; count++; }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFiles++;
    totalChanges += count;
    console.log(`  ✅ ${relFile} — ${count} replacement(s)`);
  } else {
    console.log(`  ✔  ${relFile} — no changes needed`);
  }
}

console.log(`\n✅ Done! Updated ${totalFiles} JS files, ${totalChanges} total replacements.`);
