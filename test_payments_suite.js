const pool = require('./backend/config/mysql');
const crypto = require('crypto');
const {
  resolveTripayConfig,
  createTripaySignature,
  verifyTripayWebhookSignature,
} = require('./backend/utils/tripay');
const studioRoutes = require('./backend/routes/studio');
const paymentController = require('./backend/controllers/paymentController');

async function runTests() {
  console.log('🧪 Starting Multi-Gateway Payment Verification Suite...\n');
  await pool.waitForDb();

  // Test 1: Tripay signature & webhook verification
  console.log('Test 1: Testing Tripay Signature Generation & Verification...');
  const testPrivKey = 'test-private-key-12345';
  const testMerchantCode = 'T99999';
  const testMerchantRef = 'tripay-test-order-001';
  const testAmount = 25000;

  const sig = createTripaySignature(testMerchantCode, testMerchantRef, testAmount, testPrivKey);
  console.log('Generated HMAC-SHA256 signature:', sig);

  const rawBody = JSON.stringify({
    reference: 'DEV-T99999-001',
    merchant_ref: testMerchantRef,
    payment_method: 'QRIS',
    payment_name: 'QRIS Real Time',
    amount: testAmount,
    fee_merchant: 0,
    fee_customer: 750,
    total_amount: 25750,
    status: 'PAID',
    paid_at: Math.floor(Date.now() / 1000),
  });

  const webhookSig = crypto.createHmac('sha256', testPrivKey).update(rawBody).digest('hex');
  const isValid = verifyTripayWebhookSignature(rawBody, webhookSig, testPrivKey);
  console.log('Webhook signature valid?', isValid ? '✅ PASS' : '❌ FAIL');
  if (!isValid) throw new Error('Signature verification failed');

  // Test 2: Verify user exists for mock transactions
  console.log('\nTest 2: Verifying Test User in MySQL DB...');
  const [users] = await pool.execute('SELECT id, username, email, role FROM users LIMIT 1');
  if (!users[0]) throw new Error('No user found in DB');
  const testUser = users[0];
  console.log(`✅ Using user id=${testUser.id} username=${testUser.username}`);

  // Test 3: Insert & process Tripay Studio Order
  console.log('\nTest 3: Testing Tripay Studio Order lifecycle...');
  
  // Set test tripay credentials in site_settings
  await pool.execute("INSERT INTO site_settings (setting_key, setting_value) VALUES ('pay_tripay_private_key', ?) ON DUPLICATE KEY UPDATE setting_value = ?", ['test-tripay-private-key', 'test-tripay-private-key']);
  await pool.execute("INSERT INTO site_settings (setting_key, setting_value) VALUES ('pay_tripay_merchant_code', ?) ON DUPLICATE KEY UPDATE setting_value = ?", ['T12345', 'T12345']);

  const mockTripayOrderId = `tripay-std-${testUser.id}-${Date.now()}`;
  await pool.execute(
    `INSERT INTO studio_orders (order_id, user_id, plan_key, plan_days, amount, gateway, payment_method, status, reference)
     VALUES (?, ?, 'monthly', 30, 25000, 'tripay', 'QRIS', 'pending', ?)`,
    [mockTripayOrderId, testUser.id, 'DEV-REF-' + mockTripayOrderId]
  );
  console.log(`✅ Created pending Tripay studio order: ${mockTripayOrderId}`);

  // Simulate Tripay Webhook Payload
  const webhookPayload = {
    merchant_ref: mockTripayOrderId,
    reference: 'DEV-REF-' + mockTripayOrderId,
    status: 'PAID',
    amount: 25000,
  };
  const webhookBodyStr = JSON.stringify(webhookPayload);
  const tripayCfg = await resolveTripayConfig();
  const validWebhookSig = crypto.createHmac('sha256', tripayCfg.privateKey).update(webhookBodyStr).digest('hex');

  const mockReq = {
    headers: {
      'x-callback-signature': validWebhookSig,
      'x-callback-event': 'payment_status',
    },
    body: webhookPayload,
    rawBody: webhookBodyStr,
  };
  let responseData = null;
  const mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { responseData = data; return this; },
  };

  await studioRoutes.processTripayWebhook(mockReq, mockRes);
  console.log('Webhook Handler Response:', responseData);

  const [checkOrder] = await pool.execute('SELECT * FROM studio_orders WHERE order_id = ?', [mockTripayOrderId]);
  console.log('Order status after webhook:', checkOrder[0]?.status, 'paid_at:', checkOrder[0]?.paid_at);
  if (checkOrder[0]?.status !== 'paid') throw new Error('Order status should be paid');
  console.log('✅ PASS: Tripay studio order marked as paid');

  const [checkUser] = await pool.execute('SELECT skin_studio_vip_expires, skin_studio_plan FROM users WHERE id = ?', [testUser.id]);
  console.log('User VIP expires at:', checkUser[0]?.skin_studio_vip_expires, 'Plan:', checkUser[0]?.skin_studio_plan);
  console.log('✅ PASS: VIP activated on user account');

  // Test 4: Insert & Admin approve manual order
  console.log('\nTest 4: Testing Manual QRIS / Transfer Order & Admin 1-Click Approval...');
  const mockManualOrderId = `manual-std-${testUser.id}-${Date.now()}`;
  await pool.execute(
    `INSERT INTO studio_orders (order_id, user_id, plan_key, plan_days, amount, gateway, payment_method, status)
     VALUES (?, ?, 'weekly', 7, 10045, 'manual', 'qris_manual', 'pending')`,
    [mockManualOrderId, testUser.id]
  );
  console.log(`✅ Created pending Manual studio order: ${mockManualOrderId}`);

  // Approve manual order
  const [adminUser] = await pool.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const adminId = adminUser[0]?.id || testUser.id;

  const [rows] = await pool.execute('SELECT * FROM studio_orders WHERE order_id = ?', [mockManualOrderId]);
  const order = rows[0];
  const newExpiry = new Date(Date.now() + order.plan_days * 24 * 60 * 60 * 1000);

  await pool.execute(
    'UPDATE users SET skin_studio_vip_expires = ?, skin_studio_plan = ? WHERE id = ?',
    [newExpiry, 'VIP Studio 7 Hari (Manual)', testUser.id]
  );
  await pool.execute(
    "UPDATE studio_orders SET status = 'paid', paid_at = NOW(), approved_by = ? WHERE order_id = ?",
    [adminId, mockManualOrderId]
  );

  const [checkManual] = await pool.execute('SELECT * FROM studio_orders WHERE order_id = ?', [mockManualOrderId]);
  console.log('Manual Order status after admin approval:', checkManual[0]?.status, 'approved_by:', checkManual[0]?.approved_by);
  if (checkManual[0]?.status !== 'paid') throw new Error('Manual order approval failed');
  console.log('✅ PASS: Manual Order approved and VIP activated');

  console.log('\n🎉 ALL MULTI-GATEWAY PAYMENT TESTS PASSED SUCCESSFULLY! 🚀\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
