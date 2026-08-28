// Auth routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

console.log('DEBUG: Registering Auth Routes. authController keys:', Object.keys(authController || {}));

if (!authController.register) console.error('CRITICAL: authController.register is undefined!');
if (!authController.login) console.error('CRITICAL: authController.login is undefined!');

// Rate Limiter Middleware for Auth Routes
const rateLimitMap = new Map();
const authRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes window
    const maxRequests = 20; // max 20 requests per 15 mins per IP

    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
    } else {
        record.count += 1;
    }

    rateLimitMap.set(ip, record);

    if (record.count > maxRequests) {
        return res.status(429).json({ 
            message: 'Terlalu banyak percobaan autentikasi. Silakan coba lagi dalam 15 menit.' 
        });
    }

    next();
};

router.use(authRateLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/forgotpassword', authController.forgotPassword);
router.put('/resetpassword/:resettoken', authController.resetPassword);

module.exports = router;