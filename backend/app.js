const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Initialize app
const app = express();

// Security Headers & Hardening
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Enforce HSTS on HTTPS / production proxy
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  res.removeHeader('X-Powered-By');
  next();
});

// Strict CORS Whitelist Configuration
const explicitAllowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase()) 
  : [];

const TRUSTED_DOMAIN_REGEX = /^https?:\/\/([a-zA-Z0-9-]+\.)*(hyrost\.web\.id|hyrost\.net)(:[0-9]+)?$/i;
const LOCALHOST_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/i;

app.use(cors({
  origin: function (origin, callback) {
    // Non-browser / server-to-server requests
    if (!origin) return callback(null, true);

    const lowerOrigin = origin.toLowerCase();

    // 1. Primary trusted domains & all subdomains
    if (TRUSTED_DOMAIN_REGEX.test(lowerOrigin)) {
      return callback(null, true);
    }

    // 2. Explicit origins in .env
    if (explicitAllowedOrigins.includes(lowerOrigin)) {
      return callback(null, true);
    }

    // 3. Localhost in development mode only
    if (process.env.NODE_ENV !== 'production' && LOCALHOST_REGEX.test(lowerOrigin)) {
      return callback(null, true);
    }

    // Block unknown / unauthorized origins
    return callback(new Error(`CORS Blocked: Origin '${origin}' is not authorized`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-admin-2fa', 'x-minecraft-bridge-key']
}));

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Discord Developer Portal Endpoint Aliases
app.use('/interaction', (req, res, next) => {
  req.url = '/interaction' + req.url;
  require('./routes/interaction')(req, res, next);
});
app.use('/interactions', (req, res, next) => {
  req.url = '/interaction' + req.url;
  require('./routes/interaction')(req, res, next);
});
app.get('/verify-user', (req, res) => {
  res.sendFile(path.join(rootDir, 'verify-user.html'));
});

// Serve uploads & static asset directories with caching
const rootDir = path.join(__dirname, '..');
const staticOptions = {
  maxAge: '1d',
  etag: true,
  extensions: ['html', 'htm'],
  dotfiles: 'ignore'
};
// Secure local media (data/uploads) — filename whitelist only
app.use('/uploads', require('./routes/media'));

// Static assets only (never expose /data)
app.use('/assets', express.static(path.join(rootDir, 'assets'), staticOptions));

// Block sensitive paths, dotfiles, backup files, and internal directories
app.use((req, res, next) => {
  const forbiddenPatterns = [
    /^\/\./i,                                                // Any dotfile or dotfolder (.env, .git, .npm, etc)
    /^\/(backend|database|credentials|data)(\/|$)/i,        // Internal folders
    /^\/package.*\.json$/i,                                  // Package manifests
    /^\/ecosystem\.config\.js$/i,                            // PM2 configs
    /\.(bak|backup|old|save|env.*|sql|db|sqlite|log|ini|sh|ps1|yml|yaml|zip|tar|gz|lock)$/i // Sensitive file extensions
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(req.path))) {
    return res.status(403).send('Access Denied');
  }
  next();
});

// Rate Limiting & API Security
const rateLimiter = require('./middleware/rateLimiter');
app.use('/api', rateLimiter({ windowMs: 15 * 60 * 1000, max: 500 }), require('./routes/index'));

// Fallback 404 Handler for API routes (Guarantees JSON response instead of HTML static files)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API Endpoint '${req.originalUrl}' tidak ditemukan pada server Node.js.` });
});

// Serve frontend static files with caching
app.use(express.static(rootDir, staticOptions));

// Default Route (Fallback for API testing if static file fails or for explicit checks)
// Note: Since static middleware is above, this will only be hit if no static file matches
app.get('/', (req, res) => {
  res.send('Hyrost API Running');
});

// Error Handler (Should be last)
app.use(errorHandler);

module.exports = app;
