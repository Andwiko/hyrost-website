const fs = require('fs');
const path = require('path');

const STEALTH_REGISTRY = {
  'dashboard.html': '/dashboard.html',
  'dashboard': '/dashboard.html',
  'bot/skin.html': '/bot/skin.html',
  'bot/skin': '/bot/skin.html',
  'skin.html': '/bot/skin.html',
  'bot/index.html': '/bot/index.html',
  'bot/index': '/bot/index.html',
  'modules/admin.html': '/modules/admin.html',
  'modules/admin': '/modules/admin.html',
  'admin.html': '/modules/admin.html',
  'modules/store.html': '/modules/store.html',
  'modules/store': '/modules/store.html',
  'store.html': '/modules/store.html',
  'modules/leaderboard.html': '/modules/leaderboard.html',
  'modules/leaderboard': '/modules/leaderboard.html',
  'leaderboard.html': '/modules/leaderboard.html',
  'modules/rewards.html': '/modules/rewards.html',
  'modules/rewards': '/modules/rewards.html',
  'rewards.html': '/modules/rewards.html',
  'modules/forum.html': '/modules/forum.html',
  'modules/forum': '/modules/forum.html',
  'forum.html': '/modules/forum.html',
  'modules/wiki.html': '/modules/wiki.html',
  'modules/wiki': '/modules/wiki.html',
  'wiki.html': '/modules/wiki.html',
  'account/index.html': '/account/index.html',
  'account': '/account/index.html',
  'inventory/inventory.html': '/inventory/inventory.html',
  'inventory': '/inventory/inventory.html',
  'marketplace/index.html': '/marketplace/index.html',
  'marketplace': '/marketplace/index.html',
  'auth/login.html': '/auth/login.html',
  'login.html': '/auth/login.html',
  'auth/register.html': '/auth/register.html',
  'register.html': '/auth/register.html'
};

const root = path.resolve(__dirname, '../..');

function scanJsFiles(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.git' || f === 'data') continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scanJsFiles(full);
    } else if (f.endsWith('.js') && f !== 'stealthRouter.js' && !f.startsWith('test_') && !f.startsWith('updateAll')) {
      let content = fs.readFileSync(full, 'utf8');
      let orig = content;
      for (const [key, val] of Object.entries(STEALTH_REGISTRY)) {
        // Replace .href = '...' or window.location = '...'
        const escaped = key.replace(/\./g, '\\.');
        const re = new RegExp("(\\.href\\s*=\\s*['\"])(?:\\/|\\.\\.\\/|\\.\\.\\/\\.\\.\\/)?" + escaped + "(['\"])", 'gi');
        content = content.replace(re, '$1' + val + '$2');

        const reLoc = new RegExp("(location\\s*=\\s*['\"])(?:\\/|\\.\\.\\/|\\.\\.\\/\\.\\.\\/)?" + escaped + "(['\"])", 'gi');
        content = content.replace(reLoc, '$1' + val + '$2');

        const reReplace = new RegExp("(\\.replace\\(\\s*['\"])(?:\\/|\\.\\.\\/|\\.\\.\\/\\.\\.\\/)?" + escaped + "(['\"])", 'gi');
        content = content.replace(reReplace, '$1' + val + '$2');
      }
      if (content !== orig) {
        fs.writeFileSync(full, content, 'utf8');
        console.log('✅ Replaced navigation targets in:', path.relative(root, full));
      }
    }
  }
}

scanJsFiles(root);
console.log('\n🎉 Finished updating JS navigation targets.');
