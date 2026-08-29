/**
 * =============================================================================
 * HYROST — Core Express Application & Multi-Layer Security Architecture
 * Clean URL Routing, Anti-Path Traversal Firewall & Security Hardening
 * =============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

// Initialize app
const app = express();

const rootDir = path.resolve(__dirname, '..');

// ─── 1. UNIVERSAL URL & FILE SECURITY FIREWALL (Runs FIRST) ───────────────────
app.use((req, res, next) => {
  // 1.1 Extract and decode raw URL safely
  let rawUrl = req.originalUrl || req.url || '';
  let decodedPath = req.path || '';

  try {
    rawUrl = decodeURIComponent(rawUrl);
    decodedPath = decodeURIComponent(decodedPath);
  } catch (_) {
    return res.status(400).json({ success: false, message: 'Bad Request: Malformed URI encoding detected' });
  }

  // 1.2 Anti-Null Byte Injection Protection
  if (rawUrl.includes('\0') || decodedPath.includes('\0')) {
    return res.status(400).json({ success: false, message: 'Bad Request: Null byte detected in request URI' });
  }

  // 1.3 Anti-Path Traversal & Relative Path Bypass Protection
  const hasTraversal = /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(decodedPath) ||
                       rawUrl.includes('..') ||
                       /%2e%2e/i.test(req.url) ||
                       /%252e/i.test(req.url);

  if (hasTraversal) {
    return res.status(403).json({ success: false, message: 'Forbidden: Path traversal sequence blocked' });
  }

  // 1.4 Block Access to Protected Internal Directories
  const forbiddenDirs = /^\/(backend|data|credentials|database|node_modules|scratch|\.system_generated|\.git|\.github|\.gemini)(\/|$)/i;
  if (forbiddenDirs.test(decodedPath)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Access to server internal directories is restricted' });
  }

  // 1.5 Block Access to Sensitive File Formats & Manifests
  const forbiddenFiles = [
    /^\/\./i,                                                                    // Any dotfile (.env, .git, .htaccess, etc)
    /^\/(package.*\.json|tsconfig\.json|ecosystem\.config\.js|test_.*\.js)$/i, // Configs & server scripts
    /\.(bak|backup|old|save|env.*|sql|db|sqlite|log|ini|sh|ps1|yml|yaml|zip|tar|gz|lock|md|php.*|phtml|exe|bat|cmd|cgi|pl|py)$/i // Sensitive / Executable extensions
  ];

  if (forbiddenFiles.some((pattern) => pattern.test(decodedPath))) {
    return res.status(403).json({ success: false, message: 'Forbidden: Access to restricted file format is blocked' });
  }

  next();
});

// ─── 2. CANONICAL CLEAN URL ENFORCEMENT (Strips .html from browser URL) ───────
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const reqPath = req.path;
  const isExcluded = reqPath.startsWith('/api') || 
                     reqPath.startsWith('/uploads') || 
                     reqPath.startsWith('/assets') ||
                     reqPath.startsWith('/interaction');
  if (isExcluded) return next();

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

  // 2.1 Redirect /index.html -> /
  if (reqPath === '/index.html') {
    return res.redirect(301, '/' + qs);
  }

  // 2.2 Redirect /subfolder/index.html -> /subfolder/
  if (reqPath.endsWith('/index.html')) {
    const clean = reqPath.slice(0, -10) + '/';
    return res.redirect(301, clean + qs);
  }

  // 2.3 Redirect any direct *.html request to clean URL without .html
  if (reqPath.endsWith('.html')) {
    const clean = reqPath.slice(0, -5);
    return res.redirect(301, clean + qs);
  }

  next();
});

// ─── 3. HTTP SECURITY HEADERS (OWASP Best Practices) ─────────────────────────
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

// ─── 4. STRICT CORS WHITELIST ────────────────────────────────────────────────
const explicitAllowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase()) 
  : [];

const TRUSTED_DOMAIN_REGEX = /^https?:\/\/([a-zA-Z0-9-]+\.)*(hyrost\.web\.id|hyrost\.net)(:[0-9]+)?$/i;
const LOCALHOST_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/i;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const lowerOrigin = origin.toLowerCase();

    if (TRUSTED_DOMAIN_REGEX.test(lowerOrigin)) return callback(null, true);
    if (explicitAllowedOrigins.includes(lowerOrigin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && LOCALHOST_REGEX.test(lowerOrigin)) return callback(null, true);

    return callback(new Error(`CORS Blocked: Origin '${origin}' is not authorized`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-admin-2fa', 'x-minecraft-bridge-key', 'x-callback-signature', 'x-callback-event']
}));

// Body Parsers with Safe Limits
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Discord Interaction Endpoints
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

// ─── 5. SECURE STATIC & MEDIA SERVING ─────────────────────────────────────────
const staticOptions = {
  maxAge: '1d',
  etag: true,
  extensions: ['html', 'htm'],
  dotfiles: 'deny' // Strictly deny dotfiles
};

// Secure local media (data/uploads) — filename whitelist only
app.use('/uploads', require('./routes/media'));

// Static assets directory
app.use('/assets', express.static(path.join(rootDir, 'assets'), staticOptions));

// ─── 6. API ROUTES & RATE LIMITING ───────────────────────────────────────────
const rateLimiter = require('./middleware/rateLimiter');
app.use('/api', rateLimiter({ windowMs: 15 * 60 * 1000, max: 500 }), require('./routes/index'));

// Fallback 404 Handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API Endpoint '${req.originalUrl}' tidak ditemukan pada server Node.js.` });
});

// ─── 7. CLEAN URL RESOLVER (Serves .html files behind pretty URLs) ────────────
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/assets')) return next();

  // Normalize path
  let reqPath = req.path;
  if (reqPath === '/') {
    return res.sendFile(path.join(rootDir, 'index.html'));
  }

  const cleanPath = reqPath.replace(/\/+$/, '');
  const candidateHtml = path.resolve(rootDir, '.' + cleanPath + '.html');
  const candidateIndex = path.resolve(rootDir, '.' + cleanPath + '/index.html');

  // Verify candidate is safely inside rootDir
  const rootWithSep = rootDir.endsWith(path.sep) ? rootDir : rootDir + path.sep;

  if (candidateHtml.startsWith(rootWithSep) && fs.existsSync(candidateHtml)) {
    try {
      if (fs.statSync(candidateHtml).isFile()) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        return res.sendFile(candidateHtml);
      }
    } catch (_) {}
  }

  if (candidateIndex.startsWith(rootWithSep) && fs.existsSync(candidateIndex)) {
    try {
      if (fs.statSync(candidateIndex).isFile()) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        return res.sendFile(candidateIndex);
      }
    } catch (_) {}
  }

  next();
});

// Frontend HTML & Static assets fallback
app.use(express.static(rootDir, staticOptions));

// Default Route
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Error Handler
app.use(errorHandler);

module.exports = app;
