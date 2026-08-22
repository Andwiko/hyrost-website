const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsControler');
const { verifyToken } = require('../middleware/auth');

// All friendship endpoints require user to be authenticated
router.use(verifyToken);

router.get('/', friendsController.getFriends);
router.get('/pending', friendsController.getPendingRequests);
router.get('/sent', friendsController.getSentRequests);
router.get('/blocked', friendsController.getBlockedUsers);
router.get('/search', friendsController.searchUsers);
router.get('/status/:userId', friendsController.getFriendshipStatus);

router.post('/request', friendsController.sendRequest);
router.post('/respond/:id', friendsController.respondToRequest);
router.delete('/cancel/:id', friendsController.cancelRequest);
router.delete('/remove/:id', friendsController.removeFriend);
router.post('/block/:id', friendsController.blockUser);
router.post('/unblock/:id', friendsController.unblockUser);

module.exports = router;
