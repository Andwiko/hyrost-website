const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Initialize app
const app = express();

// Security Headers & CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3044', 'http://127.0.0.1:3044'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Origin header required'), false);
      }
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const rootDir = path.join(__dirname, '..');
const staticOptions = {
  maxAge: '1d',
  etag: true,
  extensions: ['html', 'htm'],
  dotfiles: 'ignore'
};

// Discord Developer Portal Endpoint Aliases
const interactionRoutes = require('./routes/interaction');
const verifyUserRoutes = require('./routes/verifyUser');

app.use('/interaction', interactionRoutes);
app.use('/interactions', interactionRoutes);
app.use('/verify-user', verifyUserRoutes);
app.get('/verify-user', (req, res) => {
  res.sendFile(path.join(rootDir, 'verify-user.html'));
});
app.get('/verify-user.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'verify-user.html'));
});
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
