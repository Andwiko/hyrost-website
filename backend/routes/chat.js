// Chat routes
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatGroupController = require('../controllers/chatGroupController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/send', chatController.sendMessage);
router.get('/messages', chatController.getMessages);
router.get('/group/:id/messages', chatGroupController.getGroupMessages);
router.post('/group/:id/send', chatGroupController.sendGroupMessage);
router.get('/groups', chatGroupController.listGroups);
router.post('/groups', chatGroupController.createGroup);

module.exports = router;
