const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { verifyToken } = require('../middleware/auth');

router.get('/stats', verifyToken, referralController.getStats);
router.post('/claim-milestone', verifyToken, referralController.claimMilestone);

module.exports = router;
