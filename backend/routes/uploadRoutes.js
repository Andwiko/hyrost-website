const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/security');

// Optional auth for general upload
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
    } catch (e) {}
  }
  next();
};

router.post('/', optionalAuth, upload.single('file'), uploadController.uploadFile);
router.post('/avatar', verifyToken, upload.single('avatar'), uploadController.uploadAvatar);
router.get('/my-uploads', verifyToken, uploadController.getMyUploads);

module.exports = router;
