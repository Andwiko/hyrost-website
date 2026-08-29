/**
 * =============================================================================
 * HYROST — Secure Media Serving Route (/uploads/:filename)
 * Hardened Path Traversal, Extension Whitelist & Anti-MIME Sniffing Protection
 * =============================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const localFileStore = require('../utils/localFileStore');

const router = express.Router();

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

router.get('/:filename', (req, res) => {
  try {
    let rawFilename = req.params.filename || '';

    // 1. Decode URI safely & check for null bytes / control characters
    try {
      rawFilename = decodeURIComponent(rawFilename);
    } catch (_) {
      return res.status(400).json({ success: false, message: 'Invalid URL encoding' });
    }

    if (rawFilename.includes('\0') || rawFilename.includes('..') || rawFilename.includes('/') || rawFilename.includes('\\')) {
      return res.status(403).json({ success: false, message: 'Forbidden file path' });
    }

    const filename = path.basename(rawFilename);
    const ext = path.extname(filename).toLowerCase();

    // 2. Strict Whitelist: Only valid image extensions
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico'].includes(ext)) {
      return res.status(403).json({ success: false, message: 'Disallowed file type' });
    }

    // 3. Check filename pattern: alphanumeric / safe chars only
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid filename format' });
    }

    const uploadsDir = path.resolve(localFileStore.getUploadsDir());
    const targetPath = path.resolve(uploadsDir, filename);

    // 4. Verify path stays inside uploads directory
    const uploadsDirWithSep = uploadsDir.endsWith(path.sep) ? uploadsDir : uploadsDir + path.sep;
    if (!targetPath.startsWith(uploadsDirWithSep)) {
      return res.status(403).json({ success: false, message: 'Access denied: Directory traversal blocked' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // 5. Apply Strict Security Headers
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

    // Use read stream to serve safely
    const stream = fs.createReadStream(targetPath);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Error streaming file' });
    });
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to serve media file' });
  }
});

module.exports = router;
