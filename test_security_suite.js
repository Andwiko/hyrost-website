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

async function runStealthAndSecurityTests() {
  console.log('🛡️  Starting Stealth Route Masking (?=pv3Ad) & Security Verification Suite...\n');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test Server running on port ${PORT}`);
      resolve();
    });
  });

  try {
    // Test 1: Stealth Token /dashboard -> Serves dashboard.html with 200 OK
    console.log('Test 1: Testing Stealth Token /dashboard (serving Dashboard)...');
    const r1 = await request('/dashboard');
    console.log(`Status: ${r1.statusCode}`);
    if (r1.statusCode !== 200 || !r1.body.includes('<!DOCTYPE html>')) {
      throw new Error(`Expected 200 HTML for /dashboard, got ${r1.statusCode}`);
    }
    console.log('✅ PASS: /dashboard successfully serves Dashboard HTML!');

    // Test 2: Stealth Token /skin -> Serves bot/skin with 200 OK
    console.log('\nTest 2: Testing Stealth Token /skin (serving Skin Studio)...');
    const r2 = await request('/skin');
    console.log(`Status: ${r2.statusCode}`);
    if (r2.statusCode !== 200 || !r2.body.includes('<!DOCTYPE html>')) {
      throw new Error(`Expected 200 HTML for /skin, got ${r2.statusCode}`);
    }
    console.log('✅ PASS: /skin successfully serves Skin Studio HTML!');

    // Test 3: Stealth Token /admin -> Serves modules/admin with 200 OK
    console.log('\nTest 3: Testing Stealth Token /admin (serving Admin Panel)...');
    const r3 = await request('/admin');
    console.log(`Status: ${r3.statusCode}`);
    if (r3.statusCode !== 200 || !r3.body.includes('<!DOCTYPE html>')) {
      throw new Error(`Expected 200 HTML for /admin, got ${r3.statusCode}`);
    }
    console.log('✅ PASS: /admin successfully serves Admin Panel HTML!');

    // Test 4: Direct Request /dashboard -> Auto Redirects to /dashboard
    console.log('\nTest 4: Testing Direct Access /dashboard (Auto Redirect to Stealth Token)...');
    const r4 = await request('/dashboard');
    console.log(`Status: ${r4.statusCode}, Location: ${r4.headers.location}`);
    if ((r4.statusCode !== 302 && r4.statusCode !== 301) || r4.headers.location !== '/dashboard') {
      throw new Error(`Expected redirect to /dashboard, got ${r4.statusCode} ${r4.headers.location}`);
    }
    console.log('✅ PASS: /dashboard is disguised and redirected to /dashboard!');

    // Test 5: Direct Request /skin -> Auto Redirects to /skin
    console.log('\nTest 5: Testing Direct Access /skin (Auto Redirect to Stealth Token)...');
    const r5 = await request('/skin');
    console.log(`Status: ${r5.statusCode}, Location: ${r5.headers.location}`);
    if ((r5.statusCode !== 302 && r5.statusCode !== 301) || r5.headers.location !== '/skin') {
      throw new Error(`Expected redirect to /skin, got ${r5.statusCode} ${r5.headers.location}`);
    }
    console.log('✅ PASS: /skin is disguised and redirected to /skin!');

    // Test 6: Path Traversal Blocking
    console.log('\nTest 6: Blocking direct access to /backend/server.js...');
    const r6 = await request('/backend/server.js');
    console.log(`Status: ${r6.statusCode}`);
    if (r6.statusCode !== 403) throw new Error(`Expected 403, got ${r6.statusCode}`);
    console.log('✅ PASS: /backend/server.js is blocked!');

    // Test 7: Access to .env
    console.log('\nTest 7: Blocking access to .env file...');
    const r7 = await request('/.env');
    console.log(`Status: ${r7.statusCode}`);
    if (r7.statusCode !== 403) throw new Error(`Expected 403, got ${r7.statusCode}`);
    console.log('✅ PASS: .env access is blocked!');

    // Test 8: Check Security Headers
    console.log('\nTest 8: Verifying OWASP Security Headers...');
    const r8 = await request('/');
    if (r8.headers['x-content-type-options'] !== 'nosniff') throw new Error('Missing X-Content-Type-Options: nosniff');
    if (!r8.headers['x-frame-options']) throw new Error('Missing X-Frame-Options');
    console.log('✅ PASS: All OWASP Security Headers verified!');

    console.log('\n🎉 ALL STEALTH MASKING (?=pv3Ad) & SECURITY TESTS PASSED (100% SUCCESSFUL)! 🚀🛡️\n');
  } finally {
    server.close();
  }
}

runStealthAndSecurityTests().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
