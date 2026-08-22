// Lightweight In-Memory Rate Limiter Middleware for Hyrost Backend
'use strict';

const rateLimitMap = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    const maxRequests = options.max || 200; // 200 requests max per 15 minutes
    const message = options.message || { success: false, message: 'Batas request terlampaui. Silakan tunggu beberapa menit.' };

    return (req, res, next) => {
        // Skip rate limiting for static assets
        if (req.path.startsWith('/uploads') || req.path.startsWith('/assets') || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.jpg')) {
            return next();
        }

        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const now = Date.now();

        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const record = rateLimitMap.get(ip);
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }

        record.count += 1;

        if (record.count > maxRequests) {
            res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
            return res.status(429).json(message);
        }

        next();
    };
};

module.exports = rateLimiter;
