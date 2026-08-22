const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

router.get('/me', verifyToken, userController.getMe);
router.get('/leaderboard', userController.getLeaderboard); // Public endpoint
router.get('/activities', verifyToken, userController.getActivities);
router.put('/update', verifyToken, userController.updateProfile);
router.put('/profile', verifyToken, userController.updateProfile);
router.get('/profile-heads', verifyToken, userController.getProfileHeads);
router.post('/select-head', verifyToken, userController.selectProfileHead);
router.post('/unlock-head', verifyToken, userController.unlockProfileHead);
router.delete('/delete', verifyToken, userController.deleteUser);
// Alias: dashboard.js uses /claim-daily-reward, rewards.js uses /daily-claim
router.post('/daily-claim', verifyToken, userController.claimDailyReward);
router.post('/claim-daily-reward', verifyToken, userController.claimDailyReward);

// Integrated Security Endpoints
router.post('/change-password', verifyToken, userController.changePassword);
router.get('/security-status', verifyToken, userController.getSecurityStatus);
router.get('/sessions', verifyToken, userController.getActiveSessions);
router.post('/revoke-sessions', verifyToken, userController.revokeAllSessions);

// Discord Connectivity Endpoints
router.post('/link-discord', verifyToken, userController.linkDiscord);
router.delete('/unlink-discord', verifyToken, userController.unlinkDiscord);
router.get('/discord-status', verifyToken, userController.getDiscordStatus);

module.exports = router;
