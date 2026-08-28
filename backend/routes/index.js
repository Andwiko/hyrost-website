const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Import Route Files
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const forumRoutes = require('./forum');
const chatRoutes = require('./chat');
const productRoutes = require('./productRoutes');
const minecraftRoutes = require('./minecraft');
const economyRoutes = require('./economyRoutes'); 
const friendsRoutes = require('./friends');
const supportRoutes = require('./support');
const inventoryRoutes = require('./inventory');
const marketplaceRoutes = require('./marketplace');
const pluginRoutes = require('./plugin');

const adminController = require('../controllers/adminController');

const voucherController = require('../controllers/voucherController');
const questController = require('../controllers/questController');
const storeController = require('../controllers/storeController');
const liveHubController = require('../controllers/liveHubController');

// Mount Routes
router.get('/public-settings', adminController.getSettings); // Public endpoint
router.get('/public-cosmetics', adminController.getAllCosmetics); // Public endpoint for shop
router.get('/server-status', adminController.getServerStatus); // Public server status & IP endpoint
router.get('/wiki/articles', adminController.getWikiArticles); // Public wiki articles endpoint
router.get('/live-activity', adminController.getPublicLiveActivity); // Public live activity feed
router.get('/live-hub/snapshot', liveHubController.getSnapshot);
router.post('/live-hub/presence', liveHubController.postPresence);
router.get('/live-hub/stream', liveHubController.streamEvents);
router.get('/health', require('../controllers/featuresController').getHealth);
router.get('/bot/info', require('../controllers/featuresController').getBotInfo); // Public bot info & version sync
router.get('/notifications', verifyToken, adminController.getUserNotifications); // Logged in user notifications

// Web Store & Ranks
router.get('/store/ranks', storeController.getRanksAndPerks);
router.get('/store/payment-methods', adminController.getAllPaymentMethods);
router.post('/store/buy-rank', verifyToken, storeController.buyRankWithCoins);
router.post('/store/buy-rank-idr', verifyToken, storeController.buyRankWithRealMoney);

// Vouchers, Quests & Live Chat
router.post('/vouchers/claim', verifyToken, voucherController.claimVoucher);
router.get('/quests', verifyToken, questController.getUserQuests);
router.post('/quests/claim/:questId', verifyToken, questController.claimQuestReward);
router.get('/live-chat', questController.getLiveChatMessages);
router.post('/live-chat', verifyToken, questController.sendLiveChatMessage);

router.use('/auth', authRoutes);
router.use('/users', require('./userRoutes'));
router.use('/admin', verifyToken, verifyAdmin, adminRoutes);
router.use('/economy', economyRoutes);
router.use('/friends', friendsRoutes);
router.use('/support', supportRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/plugin', pluginRoutes);
router.use('/studio', require('./studio'));

router.use('/forum', forumRoutes);
router.use('/chat', chatRoutes);
router.use('/products', productRoutes);
router.use('/minecraft', minecraftRoutes);
router.use('/features', require('./features'));

// Discord Developer Portal: Interactions & Linked Roles Verification Endpoints
router.use('/interaction', require('./interaction'));
router.use('/interactions', require('./interaction'));
router.use('/verify-user', require('./verifyUser'));

// Sales Route (Direct)
router.post('/store/buy-cosmetic', verifyToken, adminController.buyCosmetic);

module.exports = router;
