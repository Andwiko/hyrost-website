// routes/minecraft.js
const express = require('express');
const router = express.Router();
const minecraftController = require('../controllers/minecraftController');

// Define routes
router.post('/status', minecraftController.updateStatus);
router.get('/status', minecraftController.getStatus);
router.post('/redeem', minecraftController.redeemCode);

module.exports = router;
