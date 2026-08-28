'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const twoFactorController = require('../controllers/twoFactorController');
const { verifyToken } = require('../middleware/auth');

// Progressive In-Memory Rate Limiter for Auth Routes
const rateLimitMap = new Map();

function createEndpointLimiter(maxRequests, windowMs, customMsg) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(key, record);

    if (record.count > maxRequests) {
      const waitMinutes = Math.ceil((record.resetTime - now) / 60000);
      return res.status(429).json({ 
        success: false,
        message: customMsg || `Terlalu banyak request. Silakan coba lagi dalam ${waitMinutes} menit.` 
      });
    }

    next();
  };
}

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetTime) rateLimitMap.delete(k);
  }
}, 10 * 60 * 1000);

// Specific Rate Limiters
const loginLimiter = createEndpointLimiter(10, 10 * 60 * 1000, 'Terlalu banyak percobaan login gagal. Silakan coba lagi dalam 10 menit.');
const registerLimiter = createEndpointLimiter(5, 60 * 60 * 1000, 'Batas pendaftaran tercapai. Silakan coba lagi dalam 1 jam.');
const forgotPasswordLimiter = createEndpointLimiter(3, 60 * 60 * 1000, 'Batas permintaan reset password tercapai. Coba lagi dalam 1 jam.');

// Public Auth Endpoints
router.post('/login', loginLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/refresh', authController.refreshToken);
router.post('/forgotpassword', forgotPasswordLimiter, authController.forgotPassword);
router.put('/resetpassword/:resettoken', authController.resetPassword);

// Authenticated Endpoints
router.get('/me', verifyToken, authController.getMe);

// 2FA Endpoints (Authenticated)
router.get('/2fa/setup', verifyToken, twoFactorController.setup2FA);
router.post('/2fa/verify', verifyToken, twoFactorController.verify2FA);

module.exports = router;