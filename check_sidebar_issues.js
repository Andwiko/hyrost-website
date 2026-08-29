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
const issues = [];

const STANDARD_SIDEBAR_LINKS = [
  { text: 'Dashboard', href: '/dashboard.html' },
  { text: 'Profil Saya', href: '/account/index.html' },
  { text: 'Toko Pangkat', href: '/modules/store.html' },
  { text: 'Forum', href: '/modules/forum.html' },
  { text: 'Galeri Build', href: '/modules/showcase.html' },
  { text: '3D Skin Studio', href: '/bot/skin.html' },
  { text: 'Live Map', href: '/modules/map.html' },
  { text: 'Leaderboard', href: '/modules/leaderboard.html' },
  { text: 'Inventaris', href: '/inventory/inventory.html' },
  { text: 'Marketplace', href: '/marketplace/shop.html' },
  { text: 'Daily Rewards', href: '/modules/rewards.html' },
  { text: 'Wiki & Guide', href: '/modules/wiki.html' },
  { text: 'Pertemanan', href: '/modules/social.html' },
  { text: 'Pusat Bantuan', href: '/modules/support.html' },
  { text: 'Verifikasi Discord', href: '/verify-user.html' },
  { text: 'Admin Panel', href: '/modules/admin.html' }
];

for (const file of htmlFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  // Find sidebar section
  const sidebarMatch = content.match(/<aside[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/aside>/i) ||
                       content.match(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  if (sidebarMatch) {
    const sidebarHtml = sidebarMatch[0];
    
    // Check for broken links like href="#" or missing links
    const emptyLinks = [...sidebarHtml.matchAll(/<a[^>]*href=["'](#[^"']*|javascript:[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    for (const el of emptyLinks) {
      const text = el[2].replace(/<[^>]*>/g, '').trim();
      issues.push({ file: rel, type: 'EMPTY_OR_HASH_LINK', text, href: el[1] });
    }

    // Check for relative paths in subfolders
    const relativeLinks = [...sidebarHtml.matchAll(/<a[^>]*href=["'](?!\/|#|http|mailto|javascript)([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    for (const rl of relativeLinks) {
      const text = rl[2].replace(/<[^>]*>/g, '').trim();
      issues.push({ file: rel, type: 'RELATIVE_LINK', text, href: rl[1] });
    }

    // Check if standard sidebar links are present
    const linkHrefs = [...sidebarHtml.matchAll(/<a[^>]*href=["']([^"']*)["']/gi)].map(m => m[1]);
    
    if (rel !== 'modules/admin.html' && rel !== 'terms.html' && rel !== 'privacy.html') {
      for (const std of STANDARD_SIDEBAR_LINKS) {
        if (!linkHrefs.includes(std.href)) {
          // If it's marketplace/index.html instead of marketplace/shop.html, note it
          issues.push({ file: rel, type: 'MISSING_OR_DIFF_LINK', expected: std.href, name: std.text });
        }
      }
    }
  }
}

console.log('Sidebar Issues Found:\n', JSON.stringify(issues, null, 2));
