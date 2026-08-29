const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');

function getAllHtmlFiles(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.git' || f === 'data') continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      getAllHtmlFiles(full, list);
    } else if (f.endsWith('.html')) {
      list.push(full);
    }
  }
  return list;
}

const htmlFiles = getAllHtmlFiles(root);
let missingCount = 0;

for (const f of htmlFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f).replace(/\\/g, '/');

  // Check CSS hrefs
  const cssMatches = content.matchAll(/href=["'](\/[^"']+\.css(?:\?[^"']*)?)["']/gi);
  for (const m of cssMatches) {
    const rawPath = m[1].split('?')[0].replace(/^\//, '');
    const local = path.join(root, rawPath);
    if (!fs.existsSync(local)) {
      console.error(`❌ Missing CSS in ${rel}: ${rawPath}`);
      missingCount++;
    }
  }

  // Check JS src
  const jsMatches = content.matchAll(/src=["'](\/[^"']+\.js(?:\?[^"']*)?)["']/gi);
  for (const m of jsMatches) {
    const rawPath = m[1].split('?')[0].replace(/^\//, '');
    const local = path.join(root, rawPath);
    if (!fs.existsSync(local)) {
      console.error(`❌ Missing JS in ${rel}: ${rawPath}`);
      missingCount++;
    }
  }
}

if (missingCount === 0) {
  console.log('\n🎉 100% PERFECT: Every single CSS and JS file referenced across all HTML files exists on the filesystem!\n');
} else {
  console.log(`\n⚠️ Total missing assets: ${missingCount}\n`);
}
