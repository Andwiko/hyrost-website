// Chat routes
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/send', chatController.sendMessage);
router.get('/messages', chatController.getMessages);
// TODO: router.get('/group/:id', chatController.getGroupMessages);

module.exports = router;
