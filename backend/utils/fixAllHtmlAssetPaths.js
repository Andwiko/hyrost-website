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
console.log(`Found ${htmlFiles.length} HTML files to inspect and fix.`);

let updatedCount = 0;

for (const filePath of htmlFiles) {
  const relPath = path.relative(root, filePath).replace(/\\/g, '/');
  const fileDir = path.dirname(relPath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add <base href="/"> to <head>
  if (!content.includes('<base href="/"')) {
    if (content.includes('<head>')) {
      content = content.replace('<head>', '<head>\n    <base href="/">');
    } else if (content.includes('<head ')) {
      content = content.replace(/(<head[^>]*>)/i, '$1\n    <base href="/">');
    }
  }

  // Convert all relative src and href attributes to root-absolute
  content = content.replace(/(src|href)=["'](\.\.\/[^"']+)["']/gi, (match, attr, val) => {
    const resolved = '/' + path.posix.normalize(fileDir + '/' + val);
    return `${attr}="${resolved}"`;
  });

  content = content.replace(/(src|href)=["']([a-zA-Z0-9_-]+\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico)(?:\?[^"']*)?)["']/gi, (match, attr, val) => {
    let resolved;
    if (fileDir === '.') {
      resolved = '/' + val;
    } else {
      resolved = '/' + path.posix.normalize(fileDir + '/' + val);
    }
    return `${attr}="${resolved}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`✅ Fully normalized all asset URLs in: ${relPath}`);
  }
}

console.log(`\n🎉 Total HTML files updated: ${updatedCount}`);
