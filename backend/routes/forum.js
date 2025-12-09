// Forum routes
const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

router.post('/thread', forumController.createThread);
router.post('/reply', forumController.replyThread);
router.get('/threads', forumController.listThreads);
router.get('/categories', forumController.listCategories);

module.exports = router;
