/**
 * HYROST — Convert All HTML File Links to Stealth Tokens
 * Replaces href="/path/file.html" and window.location.href="/path/file.html"
 * with stealth token equivalents like href="/?=pv3Ad"
 */

const fs = require('fs');
const path = require('path');

// ── Full Token Registry (mirrors backend/utils/stealthRouter.js) ──────────────
const FILE_TO_TOKEN = {
  'dashboard.html':              'pv3Ad',
  'index.html':                  'hY1Ro',
  'privacy.html':                'pRv1C',
  'terms.html':                  'tRm9S',
  'verify-user.html':            'vRf8U',

  'bot/skin.html':               'sK1nS',
  'bot/skin-studio.html':        'sKStD',
  'bot/index.html':              'b0tM3',
  'bot/changelog.html':          'bChLog',

  'auth/login.html':             'Lg8In',
  'auth/register.html':          'Rg3St',
  'auth/forgot-password.html':   'fOrgP',
  'auth/reset-password.html':    'rSetP',

  'account/index.html':          'aCc9T',
  'inventory/inventory.html':    'iNv4K',

  'modules/admin.html':          'xK9Lm',
  'modules/store.html':          't7Y4b',
  'modules/leaderboard.html':    'lDb8R',
  'modules/rewards.html':        'rW9Dz',
  'modules/forum.html':          'f0rUm',
  'modules/forum-thread.html':   'fThR8',
  'modules/wiki.html':           'wK1iX',
  'modules/wiki-article.html':   'wArT9',
  'modules/social.html':         's0cIa',
  'modules/support.html':        'sUp7P',
  'modules/map.html':            'mAp3D',
  'modules/showcase.html':       'sHw6C',
  'modules/profile.html':        'mProf',
  'modules/skin-studio.html':    'mSkSt',
  'modules/role_shop.html':      'r0lSh',
  'modules/chat.html':           'mChat',

  'marketplace/index.html':      'mK7tP',
  'marketplace/shop.html':       'mSh0p',
  'marketplace/auction.html':    'mAuc7',
  'marketplace/cart.html':       'mCrt2',
  'marketplace/checkout.html':   'mChk8',
  'marketplace/upload.html':     'mUpl5',
};

// Build regex-safe lookup: both with and without leading slash
const REPLACEMENTS = {};
for (const [file, token] of Object.entries(FILE_TO_TOKEN)) {
  REPLACEMENTS['/' + file] = `/?=${token}`;
}

const ROOT = path.resolve(__dirname);
let totalFiles = 0;
let totalReplacements = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let count = 0;

  for (const [htmlPath, stealthUrl] of Object.entries(REPLACEMENTS)) {
    // Skip if already converted (avoid double-replacement)
    if (content.includes(stealthUrl)) {
      // Still might have some raw links alongside stealth ones — check below
    }

    // 1. href="/path/file.html" → href="/?=TOKEN"
    const hrefRegex = new RegExp(`(href=["'])${escapeRegex(htmlPath)}(["'])`, 'g');
    const before1 = content;
    content = content.replace(hrefRegex, `$1${stealthUrl}$2`);
    if (content !== before1) { changed = true; count++; }

    // 2. window.location.href = "/path/file.html" → "/?=TOKEN"
    const jsLocRegex = new RegExp(`(window\\.location\\.href\\s*=\\s*["'])${escapeRegex(htmlPath)}(["'])`, 'g');
    const before2 = content;
    content = content.replace(jsLocRegex, `$1${stealthUrl}$2`);
    if (content !== before2) { changed = true; count++; }

    // 3. window.location = "/path/file.html"
    const jsLocRegex2 = new RegExp(`(window\\.location\\s*=\\s*["'])${escapeRegex(htmlPath)}(["'])`, 'g');
    const before3 = content;
    content = content.replace(jsLocRegex2, `$1${stealthUrl}$2`);
    if (content !== before3) { changed = true; count++; }

    // 4. onclick="window.location.href='/path/file.html'"
    const onclickRegex = new RegExp(`(onclick=["'][^"']*location\\.href\\s*=\\s*['"])${escapeRegex(htmlPath)}(['"][^"']*["'])`, 'g');
    const before4 = content;
    content = content.replace(onclickRegex, `$1${stealthUrl}$2`);
    if (content !== before4) { changed = true; count++; }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalReplacements += count;
    console.log(`  ✅ ${path.relative(ROOT, filePath)} — ${count} replacement(s)`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkHtml(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'data', 'backend', 'assets'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      totalFiles++;
      processFile(full);
    }
  }
}

console.log('🔄 Converting all HTML navigation links to stealth tokens...\n');
walkHtml(ROOT);
console.log(`\n✅ Done! Processed ${totalFiles} HTML files. Total replacements: ${totalReplacements}`);
