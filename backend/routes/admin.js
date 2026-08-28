const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const pluginController = require('../controllers/pluginController');

// Auth (verifyToken + verifyAdmin) is applied on /api/admin in routes/index.js

// Roles
router.get('/roles', adminController.getAllRoles);
router.post('/role', adminController.createRole);
router.put('/role/:id', adminController.updateRoleCustomization);
router.delete('/role/:id', adminController.deleteRole);
router.post('/assign-role', adminController.assignRole);

// Users & economy
router.get('/users', adminController.getAllUsers);
router.post('/update-coins', adminController.updateCoins);
router.delete('/user/:id', adminController.deleteUserByAdmin);

// Settings & banned words
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSetting);
router.post('/setting', adminController.updateSetting);
router.get('/banned-words', adminController.getBannedWords);
router.post('/banned-word', adminController.addBannedWord);
router.delete('/banned-word/:id', adminController.deleteBannedWord);

// Forum moderation
router.get('/threads', adminController.getRecentThreads);
router.get('/forum/threads', adminController.getRecentThreads);
router.delete('/thread/:id', adminController.deleteThread);
router.delete('/forum/thread/:id', adminController.deleteThread);
router.post('/thread/:id/pin', adminController.togglePinThread);
router.post('/forum/thread/:id/pin', adminController.togglePinThread);

// Logs & Security Audit
router.get('/activity-logs', adminController.getActivityLogs);
router.get('/logs', adminController.getActivityLogs);
router.get('/audit-logs', adminController.getAuditLogs);

// Cosmetics
router.get('/cosmetics', adminController.getAllCosmetics);
router.post('/cosmetics', adminController.createCosmetic);
router.post('/cosmetic', adminController.createCosmetic);
router.delete('/cosmetics/:id', adminController.deleteCosmetic);
router.delete('/cosmetic/:id', adminController.deleteCosmetic);

// Tickets (legacy admin endpoint)
router.get('/tickets', adminController.getAllTickets);
router.put('/ticket/:id/status', adminController.updateTicketStatus);

// Rewards, server, payments, vouchers
router.get('/rewards-config', adminController.getRewardsConfig);
router.post('/rewards-config', adminController.updateRewardsConfig);
router.get('/server-config', adminController.getServerStatus);
router.post('/server-config', adminController.saveServerConfig);
router.get('/payment-settings', adminController.getPaymentSettings);
router.post('/payment-settings', adminController.updatePaymentSettings);
router.post('/payment-settings/test-midtrans', adminController.testMidtransConnection);
router.get('/payment-methods', adminController.getAllPaymentMethods);
router.post('/payment-method', adminController.savePaymentMethod);
router.delete('/payment-method/:key', adminController.deletePaymentMethod);

// Plugin item catalog (HyrostBridge integration)
router.get('/plugin-catalog', pluginController.adminListCatalog);
router.post('/plugin-catalog', pluginController.adminSaveCatalogItem);
router.delete('/plugin-catalog/:id', pluginController.adminDeleteCatalogItem);

router.get('/vouchers', adminController.getPromoVouchers);
router.post('/voucher', adminController.createPromoVoucher);
router.delete('/voucher/:id', adminController.deletePromoVoucher);

// Backup, broadcast, wiki, IP blacklist
router.get('/backup', adminController.exportBackup);
router.post('/restore', adminController.restoreBackup);
router.post('/broadcast', adminController.sendMassBroadcast);
router.get('/wiki', adminController.getWikiArticles);
router.post('/wiki', adminController.createWikiArticle);
router.delete('/wiki/:id', adminController.deleteWikiArticle);
router.get('/ip-blacklist', adminController.getIPBlacklist);
router.post('/ip-blacklist', adminController.blockIP);
router.delete('/ip-blacklist/:ip', adminController.unblockIP);

module.exports = router;
