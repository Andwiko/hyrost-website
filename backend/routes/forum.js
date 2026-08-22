const express = require('express');
const router  = express.Router();
const forumController = require('../controllers/forumController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
router.get('/threads',          forumController.listThreads);
router.get('/categories',       forumController.listCategories);
router.get('/thread/:id',       forumController.getThreadDetails);

// ─── AUTH REQUIRED ROUTES ─────────────────────────────────────────────────────
router.get('/permissions',        verifyToken, forumController.getPermissions);
router.post('/thread',            verifyToken, forumController.createThread);
router.put('/thread/:id',         verifyToken, forumController.updateThread);
router.delete('/thread/:id',      verifyToken, forumController.deleteThread);
router.post('/thread/:id/reply',  verifyToken, forumController.replyThread);
router.post('/thread/:id/vote',   verifyToken, forumController.voteThread);
router.delete('/reply/:replyId',  verifyToken, forumController.deleteReply);
router.post('/reply/:replyId/like', verifyToken, forumController.likeReply);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
router.post('/thread/:id/pin',  verifyToken, verifyAdmin, forumController.pinThread);
router.get('/init-db', verifyToken, verifyAdmin, forumController.initForumDB);

module.exports = router;
