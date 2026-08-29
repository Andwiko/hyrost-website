const fs = require('fs');
const path = require('path');

const STEALTH_REGISTRY = {
  'dashboard.html': '/?=pv3Ad',
  'dashboard': '/?=pv3Ad',
  'bot/skin.html': '/?=sK1nS',
  'bot/skin': '/?=sK1nS',
  'skin.html': '/?=sK1nS',
  'bot/index.html': '/?=b0tM3',
  'bot/index': '/?=b0tM3',
  'modules/admin.html': '/?=xK9Lm',
  'modules/admin': '/?=xK9Lm',
  'admin.html': '/?=xK9Lm',
  'modules/store.html': '/?=t7Y4b',
  'modules/store': '/?=t7Y4b',
  'store.html': '/?=t7Y4b',
  'modules/leaderboard.html': '/?=lDb8R',
  'modules/leaderboard': '/?=lDb8R',
  'leaderboard.html': '/?=lDb8R',
  'modules/rewards.html': '/?=rW9Dz',
  'modules/rewards': '/?=rW9Dz',
  'rewards.html': '/?=rW9Dz',
  'modules/forum.html': '/?=f0rUm',
  'modules/forum': '/?=f0rUm',
  'forum.html': '/?=f0rUm',
  'modules/wiki.html': '/?=wK1iX',
  'modules/wiki': '/?=wK1iX',
  'wiki.html': '/?=wK1iX',
  'account/index.html': '/?=aCc9T',
  'account': '/?=aCc9T',
  'inventory/inventory.html': '/?=iNv4K',
  'inventory': '/?=iNv4K',
  'marketplace/index.html': '/?=mK7tP',
  'marketplace': '/?=mK7tP',
  'auth/login.html': '/?=Lg8In',
  'login.html': '/?=Lg8In',
  'auth/register.html': '/?=Rg3St',
  'register.html': '/?=Rg3St'
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
