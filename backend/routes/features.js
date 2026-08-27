const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { requireBridgeKey } = require('../middleware/bridgeAuth');
const rateLimiter = require('../middleware/rateLimiter');

const paymentController = require('../controllers/paymentController');
const featuresController = require('../controllers/featuresController');
const auctionController = require('../controllers/auctionController');
const twoFactorController = require('../controllers/twoFactorController');
const chatGroupController = require('../controllers/chatGroupController');

const authStrict = rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

// Health (public)
router.get('/health', featuresController.getHealth);

// Public profile
router.get('/profile/:username', featuresController.getPublicProfile);

// Vote sites (public list)
router.get('/vote/sites', featuresController.getVoteSites);

// Payments
router.post('/payments/rank', verifyToken, authStrict, paymentController.createRankPayment);
router.post('/payments/midtrans-webhook', paymentController.midtransWebhook);
router.get('/payments/my-orders', verifyToken, paymentController.getMyOrders);

// User features
router.get('/activity-feed', verifyToken, featuresController.getActivityFeed);
router.get('/achievements', verifyToken, featuresController.getAchievements);
router.get('/referral', verifyToken, featuresController.getReferralInfo);
router.post('/vote/claim', verifyToken, rateLimiter({ max: 10 }), featuresController.claimVoteReward);
router.post('/notifications/read', verifyToken, featuresController.markNotificationsRead);

// Leaderboard sync
router.get('/leaderboard/sync', featuresController.syncMcLeaderboard);

// Auction
router.get('/auctions', auctionController.getAuctions);
router.post('/auctions', verifyToken, auctionController.createAuction);
router.post('/auctions/:id/bid', verifyToken, auctionController.placeBid);
router.get('/auctions/:id/bids', auctionController.getBids);

// Chat groups
router.get('/chat-groups', verifyToken, chatGroupController.listGroups);
router.post('/chat-groups', verifyToken, chatGroupController.createGroup);
router.post('/chat-groups/:id/join', verifyToken, chatGroupController.joinGroup);
router.get('/chat-groups/:id/messages', verifyToken, chatGroupController.getGroupMessages);
router.post('/chat-groups/:id/messages', verifyToken, chatGroupController.sendGroupMessage);

// Admin-only
router.get('/admin/health', verifyToken, verifyAdmin, featuresController.getHealth);
router.get('/admin/payment-orders', verifyToken, verifyAdmin, twoFactorController.check2FARequired, paymentController.listPendingOrders);
router.post('/admin/payment-orders/:orderId/approve', verifyToken, verifyAdmin, twoFactorController.check2FARequired, paymentController.approveOrder);
router.post('/admin/payment-orders/:orderId/reject', verifyToken, verifyAdmin, twoFactorController.check2FARequired, paymentController.rejectOrder);
router.post('/admin/restore-backup', verifyToken, verifyAdmin, twoFactorController.check2FARequired, featuresController.restoreLocalBackup);
router.get('/admin/scheduled-commands', verifyToken, verifyAdmin, featuresController.listScheduledCommands);
router.post('/admin/scheduled-commands', verifyToken, verifyAdmin, featuresController.createScheduledCommand);
router.post('/admin/2fa/setup', verifyToken, verifyAdmin, twoFactorController.setup2FA);
router.post('/admin/2fa/verify', verifyToken, verifyAdmin, twoFactorController.verify2FA);

// Plugin bridge
router.post('/plugin/infraction', requireBridgeKey, featuresController.reportInfraction);
router.get('/plugin/scheduled-commands', requireBridgeKey, featuresController.getPendingScheduledForPlugin);
router.post('/plugin/scheduled-commands/:id/done', requireBridgeKey, featuresController.markScheduledExecuted);
router.post('/plugin/player-sessions', requireBridgeKey, featuresController.updateMcSessions);

// Bot Version & Changelog Sync
router.get('/bot/version', (req, res) => {
    res.json({
        success: true,
        name: 'Mei Labs Bot',
        version: '2.54.24.1.1',
        tag: 'v2.54.24.1.1',
        status: 'online',
        uptime: process.uptime(),
        pillars: [
            'Micro-Kernel Hot-Swap Plugin Engine',
            'Autonomous Self-Healing AI Diagnostic Daemon',
            'Async Worker Thread Pool',
            'Real-Time Conversational Voice AI Companion',
            'Zero-Downtime State Persistence Mesh'
        ]
    });
});

module.exports = router;
