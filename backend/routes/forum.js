const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { verifyToken } = require('../middleware/auth');

console.log('DEBUG: Registering Forum Routes. Controller keys:', Object.keys(forumController || {}));

router.post('/thread', verifyToken, forumController.createThread || ((req, res) => res.status(500).send('Handler Missing: createThread')));
router.get('/thread/:id', forumController.getThreadDetails || ((req, res) => res.status(500).send('Handler Missing: getThreadDetails')));
router.put('/thread/:id', verifyToken, forumController.updateThread || ((req, res) => res.status(500).send('Handler Missing: updateThread')));
router.delete('/thread/:id', verifyToken, forumController.deleteThread || ((req, res) => res.status(500).send('Handler Missing: deleteThread')));
router.post('/thread/:id/reply', verifyToken, forumController.replyThread || ((req, res) => res.status(500).send('Handler Missing: replyThread')));
router.post('/thread/:id/vote', verifyToken, forumController.voteThread || ((req, res) => res.status(500).send('Handler Missing: voteThread')));
router.get('/threads', forumController.listThreads || ((req, res) => res.status(500).send('Handler Missing: listThreads')));
router.get('/categories', forumController.listCategories || ((req, res) => res.status(500).send('Handler Missing: listCategories')));
router.get('/init-db', forumController.initForumDB); // Emergency Init

module.exports = router;
