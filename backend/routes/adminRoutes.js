const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// NOTE: verifyToken and verifyAdmin are already applied in routes/index.js 
// to the entire /admin path.

// Role Management
router.get('/roles', adminController.getAllRoles);
router.post('/role', adminController.createRole);
router.put('/role/:id', adminController.updateRoleCustomization);
router.delete('/role/:id', adminController.deleteRole);
router.post('/assign-role', adminController.assignRole);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/update-coins', adminController.updateCoins);
router.delete('/user/:id', adminController.deleteUserByAdmin);

// Banned Words Management
router.get('/banned-words', adminController.getBannedWords);
router.post('/banned-word', adminController.addBannedWord);
router.delete('/banned-word/:id', adminController.deleteBannedWord);

// Forum Moderation
router.get('/forum/threads', adminController.getRecentThreads);
router.delete('/forum/thread/:id', adminController.deleteThread);
router.post('/forum/thread/:id/pin', adminController.togglePinThread);

// Role Purchase (Publicly accessible but requires token)
router.post('/purchase-role', adminController.purchaseRole);

// Global Settings
router.get('/settings', adminController.getSettings);
router.post('/setting', adminController.updateSetting);

// Activity Logs
router.get('/logs', adminController.getActivityLogs);

// Cosmetic Management
router.get('/cosmetics', adminController.getAllCosmetics);
router.post('/cosmetic', adminController.createCosmetic);
router.delete('/cosmetic/:id', adminController.deleteCosmetic);

// Backup & Restore
router.get('/backup', adminController.exportBackup);
router.post('/restore', adminController.restoreBackup);

// Mass Broadcast
router.post('/broadcast', adminController.sendMassBroadcast);

// Wiki CMS Manager
router.get('/wiki', adminController.getWikiArticles);
router.post('/wiki', adminController.createWikiArticle);
router.delete('/wiki/:id', adminController.deleteWikiArticle);

const voucherController = require('../controllers/voucherController');

// IP Blacklist Manager
router.get('/ip-blacklist', adminController.getIPBlacklist);
router.post('/ip-blacklist', adminController.blockIP);
router.delete('/ip-blacklist/:ip', adminController.unblockIP);

// Payment Gateways Config & Methods (Admin)
router.get('/payment-settings', adminController.getPaymentSettings);
router.post('/payment-settings', adminController.updatePaymentSettings);
router.post('/payment-settings/test-midtrans', adminController.testMidtransConnection);
router.get('/payment-methods', adminController.getAllPaymentMethods);
router.post('/payment-method', adminController.savePaymentMethod);
router.delete('/payment-method/:key', adminController.deletePaymentMethod);

// Voucher & Promo Code Manager (Admin)
router.get('/vouchers', adminController.getPromoVouchers);
router.post('/voucher', adminController.createPromoVoucher);
router.delete('/voucher/:id', adminController.deletePromoVoucher);

module.exports = router;
