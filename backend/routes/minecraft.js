// routes/minecraft.js
const express = require('express');
const router  = express.Router();
const minecraftController = require('../controllers/minecraftController');
const { verifyToken } = require('../middleware/auth');

const { requireBridgeKey } = require('../middleware/bridgeAuth');

// ─── PUBLIC / SERVER PLUGIN ROUTES ───────────────────────────────────────────
router.get('/status',               minecraftController.getStatus);
router.get('/news',                 minecraftController.getMojangNews);
router.post('/status',              requireBridgeKey, minecraftController.updateStatus);
router.post('/redeem',              requireBridgeKey, minecraftController.redeemCode);
router.get('/init-db',              requireBridgeKey, minecraftController.initDB);

// Plugin Bridge Endpoints
router.post('/verify-link',         requireBridgeKey, minecraftController.verifyAccountLink);
router.get('/pending-deliveries',   requireBridgeKey, minecraftController.getPendingDeliveries);
router.post('/confirm-delivery',    requireBridgeKey, minecraftController.confirmDelivery);

// ─── USER WEB ROUTES (Token Auth Required) ───────────────────────────────────
router.post('/link-request',        verifyToken, minecraftController.requestAccountLink);
router.get('/link-status',          verifyToken, minecraftController.getAccountLinkStatus);
router.delete('/unlink',            verifyToken, minecraftController.unlinkAccount);
router.post('/link-mojang',         verifyToken, minecraftController.linkMojangDirect);
router.delete('/unlink-mojang',      verifyToken, minecraftController.unlinkMinecraftAccount);
router.post('/claim-web-item',      verifyToken, minecraftController.claimWebItem);

module.exports = router;
