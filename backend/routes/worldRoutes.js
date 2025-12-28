const express = require('express');
const router = express.Router();
const worldController = require('../controllers/worldController');
const { verifyToken } = require('../middleware/auth');

// GET /api/world/leaderboard - Dapatkan data Tahta
router.get('/leaderboard', worldController.getLeaderboard);

// POST /api/world/mystery-box/open - Buka Kotak Misteri
router.post('/mystery-box/open', verifyToken, worldController.openMysteryBox);

module.exports = router;
