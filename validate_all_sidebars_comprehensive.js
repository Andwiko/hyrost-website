const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('./backend/app');

const root = 'D:/data/website/hyrost/www';
const PORT = 3095;

let server;

function request(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

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

async function runAudit() {
  console.log('🔍 Starting 100% Comprehensive Sidebar Connection Audit...\n');

  await new Promise(r => {
    server = app.listen(PORT, () => {
      console.log(`Validator server listening on port ${PORT}`);
      r();
    });
  });

  const files = getHtmlFiles(root);
  let totalLinksChecked = 0;
  let brokenHrefs = 0;
  const uniqueUrlsToTest = new Set();

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');

    const sidebarMatch = content.match(/<aside[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/aside>/i) ||
                         content.match(/<aside[^>]*class="[^"]*admin-sidebar[^"]*"[^>]*>([\s\S]*?)<\/aside>/i) ||
                         content.match(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    if (sidebarMatch) {
      const sidebarHtml = sidebarMatch[0];
      const linkMatches = [...sidebarHtml.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];

      for (const lm of linkMatches) {
        totalLinksChecked++;
        const href = lm[1];
        const text = lm[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');

        // Skip internal in-page hash anchors (e.g. #section-1 on legal pages)
        if (href.startsWith('#')) {
          if (href === '#' || href === '#!') {
            console.error(`❌ BROKEN LINK in [${rel}]: Link '${text}' has dummy href='${href}'!`);
            brokenHrefs++;
          }
          continue;
        }

        if (href.startsWith('/')) {
          uniqueUrlsToTest.add(href);
        } else {
          console.error(`❌ NON-ABSOLUTE LINK in [${rel}]: Link '${text}' has relative href='${href}'!`);
          brokenHrefs++;
        }
      }
    }
  }

  console.log(`\n📋 Found ${totalLinksChecked} total sidebar links across all pages.`);
  console.log(`🌐 Testing ${uniqueUrlsToTest.size} unique destination URLs via HTTP server...\n`);

  let httpPassed = 0;
  let httpFailed = 0;

  for (const urlPath of uniqueUrlsToTest) {
    try {
      const res = await request(urlPath);
      if (res.statusCode !== 200) {
        console.error(`❌ HTTP FAIL [${urlPath}]: Status ${res.statusCode}`);
        httpFailed++;
      } else {
        console.log(`✅ HTTP 200 OK [${urlPath}]`);
        httpPassed++;
      }
    } catch (e) {
      console.error(`❌ HTTP ERROR [${urlPath}]:`, e.message);
      httpFailed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`📊 TOTAL SIDEBAR LINKS AUDITED: ${totalLinksChecked}`);
  console.log(`❌ BROKEN HREF ATTRIBUTES: ${brokenHrefs}`);
  console.log(`🌐 UNIQUE DESTINATIONS TESTED: ${uniqueUrlsToTest.size}`);
  console.log(`✅ HTTP 200 OK: ${httpPassed}`);
  console.log(`❌ HTTP FAILURES: ${httpFailed}`);
  console.log(`========================================\n`);

  server.close();

  if (brokenHrefs > 0 || httpFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 100% OF ALL SIDEBARS ARE FULLY CONNECTED & FUNCTIONAL! 🚀\n');
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error(err);
  if (server) server.close();
  process.exit(1);
});
