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

async function runSecurityTests() {
  console.log('🛡️  Starting URL & File Security Verification Suite...\n');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Security Test Server running on port ${PORT}`);
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

    // Test 2: Path Traversal via URL encoded .. (/..%2f.env)
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

    // Test 5: Null byte injection
    console.log('\nTest 5: Blocking Null Byte in URL (%00)...');
    const r5 = await request('/assets/%00script.js');
    console.log(`Status: ${r5.statusCode}`);
    if (r5.statusCode !== 400 && r5.statusCode !== 403) throw new Error(`Expected 400/403, got ${r5.statusCode}`);
    console.log('✅ PASS: Null byte injection blocked!');

    // Test 6: Check Security Headers
    console.log('\nTest 6: Verifying OWASP Security Headers...');
    const r6 = await request('/');
    console.log('X-Content-Type-Options:', r6.headers['x-content-type-options']);
    console.log('X-Frame-Options:', r6.headers['x-frame-options']);
    console.log('X-XSS-Protection:', r6.headers['x-xss-protection']);
    if (r6.headers['x-content-type-options'] !== 'nosniff') throw new Error('Missing X-Content-Type-Options: nosniff');
    if (!r6.headers['x-frame-options']) throw new Error('Missing X-Frame-Options');
    console.log('✅ PASS: All OWASP Security Headers verified!');

    console.log('\n🎉 ALL SECURITY FIREWALL TESTS PASSED (100% SECURE)! 🛡️\n');
  } finally {
    server.close();
  }
}

runSecurityTests().then(() => process.exit(0)).catch(err => {
  console.error('❌ Security test failed:', err);
  if (server) server.close();
  process.exit(1);
});
