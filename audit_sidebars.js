const fs = require('fs');
const path = require('path');

const root = 'D:/data/website/hyrost/www';

function getHtmlFiles(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'data') {
        res = res.concat(getHtmlFiles(full));
      }
    } else if (f.endsWith('.html')) {
      res.push(full);
    }
  }
  return res;
}

const htmlFiles = getHtmlFiles(root);

console.log(`Found ${htmlFiles.length} HTML files.`);

const report = {};

for (const file of htmlFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  // Find sidebar section
  const sidebarMatch = content.match(/<aside[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/aside>/i) ||
                       content.match(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                       content.match(/<nav[^>]*class="[^"]*sidebar-nav[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);

  if (sidebarMatch) {
    const sidebarHtml = sidebarMatch[0];
    const links = [];
    const linkMatches = sidebarHtml.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi);
    for (const lm of linkMatches) {
      const href = lm[1];
      const text = lm[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
      
      // Check if target file exists on disk
      let exists = false;
      let targetPath = '';
      if (href.startsWith('/')) {
        targetPath = path.join(root, href.split('#')[0].split('?')[0]);
      } else if (href.startsWith('#') || href.startsWith('javascript:')) {
        exists = true; // anchor on same page or js
      } else {
        targetPath = path.join(path.dirname(file), href.split('#')[0].split('?')[0]);
      }

      if (targetPath) {
        if (targetPath.endsWith(path.sep) || targetPath === root) {
          exists = fs.existsSync(path.join(targetPath, 'index.html')) || fs.existsSync(targetPath);
        } else {
          exists = fs.existsSync(targetPath) || fs.existsSync(targetPath + '.html');
        }
      }

      links.push({ text, href, exists });
    }
    report[rel] = links;
  }
}

console.log(JSON.stringify(report, null, 2));
