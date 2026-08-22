const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

// Main Discord HTTP Interactions Endpoint
router.post('/', interactionController.handleInteraction);

// Status / Health Check
router.get('/', interactionController.getInteractionStatus);
router.get('/status', interactionController.getInteractionStatus);

module.exports = router;
