// Membership routes
const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');

router.post('/subscribe', membershipController.subscribe);
router.get('/status', membershipController.status);

module.exports = router;
