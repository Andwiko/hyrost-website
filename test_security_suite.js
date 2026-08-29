const http = require('http');
const app = require('./backend/app');

let server;
const PORT = 3099;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runSecurityAndCleanUrlTests() {
  console.log('🛡️  Starting URL Security & Clean URL Verification Suite...\n');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test Server running on port ${PORT}`);
      resolve();
    });
  });

  try {
    // Test 1: Path Traversal to /backend/server.js
    console.log('Test 1: Blocking direct access to /backend/server.js...');
    const r1 = await request('/backend/server.js');
    console.log(`Status: ${r1.statusCode}`);
    if (r1.statusCode !== 403) throw new Error(`Expected 403, got ${r1.statusCode}`);
    console.log('✅ PASS: /backend/server.js is blocked!');

    // Test 2: Path Traversal via URL encoded .. (/%2e%2e/backend)
    console.log('\nTest 2: Blocking URL Encoded Path Traversal (/%2e%2e/backend)...');
    const r2 = await request('/%2e%2e/backend');
    console.log(`Status: ${r2.statusCode}`);
    if (r2.statusCode !== 403 && r2.statusCode !== 400) throw new Error(`Expected 403/400, got ${r2.statusCode}`);
    console.log('✅ PASS: Path traversal sequence blocked!');

    // Test 3: Access to .env
    console.log('\nTest 3: Blocking access to .env file...');
    const r3 = await request('/.env');
    console.log(`Status: ${r3.statusCode}`);
    if (r3.statusCode !== 403) throw new Error(`Expected 403, got ${r3.statusCode}`);
    console.log('✅ PASS: .env access is blocked!');

    // Test 4: Access to /data/ directory
    console.log('\nTest 4: Blocking access to /data/ internal folder...');
    const r4 = await request('/data/store/users.json');
    console.log(`Status: ${r4.statusCode}`);
    if (r4.statusCode !== 403) throw new Error(`Expected 403, got ${r4.statusCode}`);
    console.log('✅ PASS: /data/ access is blocked!');

    // Test 5: Clean URL 301 Redirect for /index.html -> /
    console.log('\nTest 5: Testing Clean URL Redirect for /index.html -> / ...');
    const r5 = await request('/index.html');
    console.log(`Status: ${r5.statusCode}, Location: ${r5.headers.location}`);
    if (r5.statusCode !== 301 || r5.headers.location !== '/') throw new Error(`Expected 301 to /, got ${r5.statusCode} ${r5.headers.location}`);
    console.log('✅ PASS: /index.html cleanly redirects to /');

    // Test 6: Clean URL 301 Redirect for /dashboard.html -> /dashboard
    console.log('\nTest 6: Testing Clean URL Redirect for /dashboard.html -> /dashboard ...');
    const r6 = await request('/dashboard.html');
    console.log(`Status: ${r6.statusCode}, Location: ${r6.headers.location}`);
    if (r6.statusCode !== 301 || r6.headers.location !== '/dashboard') throw new Error(`Expected 301 to /dashboard, got ${r6.statusCode} ${r6.headers.location}`);
    console.log('✅ PASS: /dashboard.html cleanly redirects to /dashboard');

    // Test 7: Serving Clean URL /dashboard (200 OK HTML)
    console.log('\nTest 7: Testing Clean URL serving for /dashboard ...');
    const r7 = await request('/dashboard');
    console.log(`Status: ${r7.statusCode}`);
    if (r7.statusCode !== 200 || !r7.body.includes('<!DOCTYPE html>')) throw new Error(`Expected 200 HTML for /dashboard, got ${r7.statusCode}`);
    console.log('✅ PASS: /dashboard cleanly serves HTML without showing .html in URL!');

    // Test 8: Serving Clean URL /bot/skin (200 OK HTML)
    console.log('\nTest 8: Testing Clean URL serving for /bot/skin ...');
    const r8 = await request('/bot/skin');
    console.log(`Status: ${r8.statusCode}`);
    if (r8.statusCode !== 200 || !r8.body.includes('<!DOCTYPE html>')) throw new Error(`Expected 200 HTML for /bot/skin, got ${r8.statusCode}`);
    console.log('✅ PASS: /bot/skin cleanly serves HTML without showing .html in URL!');

    // Test 9: Check Security Headers
    console.log('\nTest 9: Verifying OWASP Security Headers...');
    const r9 = await request('/');
    if (r9.headers['x-content-type-options'] !== 'nosniff') throw new Error('Missing X-Content-Type-Options: nosniff');
    if (!r9.headers['x-frame-options']) throw new Error('Missing X-Frame-Options');
    console.log('✅ PASS: All OWASP Security Headers verified!');

    console.log('\n🎉 ALL SECURITY & CLEAN URL TESTS PASSED (100% SUCCESSFUL)! 🚀🛡️\n');
  } finally {
    server.close();
  }
}

runSecurityAndCleanUrlTests().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
