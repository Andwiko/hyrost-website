/**
 * Secure media serving — only whitelisted filenames from data/uploads/
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const localFileStore = require('../utils/localFileStore');

const router = express.Router();

router.get('/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename || '');
    if (!localFileStore.isSafeMediaFilename(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const filePath = path.join(localFileStore.getUploadsDir(), filename);
    if (!filePath.startsWith(localFileStore.getUploadsDir() + path.sep)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to serve media' });
  }
});

module.exports = router;
