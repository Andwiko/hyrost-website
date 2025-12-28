const express = require('express');
const router = express.Router();
const economyController = require('../controllers/economyController');
const { verifyToken } = require('../middleware/auth');

// POST /api/economy/exchange
router.post('/exchange', verifyToken, economyController.exchangeCurrency);

module.exports = router;
