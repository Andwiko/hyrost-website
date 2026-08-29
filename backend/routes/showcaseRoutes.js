const express = require('express');
const router = express.Router();
const showcaseController = require('../controllers/showcaseController');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/security');

// Optional auth middleware for reading
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

router.get('/', optionalAuth, showcaseController.getShowcases);
router.post('/', verifyToken, showcaseController.createShowcase);
router.post('/:id/like', verifyToken, showcaseController.toggleLike);
router.delete('/:id', verifyToken, showcaseController.deleteShowcase);

module.exports = router;
