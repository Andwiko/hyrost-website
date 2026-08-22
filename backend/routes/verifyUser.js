const express = require('express');
const router = express.Router();
const verifyUserController = require('../controllers/verifyUserController');
const { verifyTokenOptional } = require('../middleware/auth');

const optionalAuth = (req, res, next) => {
  if (typeof verifyTokenOptional === 'function') {
    return verifyTokenOptional(req, res, next);
  }
  next();
};

// POST /api/verify-user
router.post('/', optionalAuth, verifyUserController.verifyUser);

// Discord OAuth2 flow for Linked Roles
router.get('/discord-oauth', verifyUserController.getDiscordOAuthUrl);
router.get('/callback', optionalAuth, verifyUserController.handleDiscordOAuthCallback);

// Temporary verification code
router.post('/generate-code', optionalAuth, verifyUserController.generateVerificationCode);

// Verification status
router.get('/status/:id', verifyUserController.getVerificationStatus);

module.exports = router;
