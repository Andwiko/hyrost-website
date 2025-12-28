const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// All routes here should be protected by verifyToken AND verifyAdmin
router.post('/role', verifyToken, verifyAdmin, adminController.createRole);
router.get('/roles', verifyToken, verifyAdmin, adminController.getAllRoles);
router.post('/assign-role', verifyToken, verifyAdmin, adminController.assignRole);
router.get('/users', verifyToken, verifyAdmin, adminController.getAllUsers);
router.post('/update-coins', verifyToken, verifyAdmin, adminController.updateCoins);

// Banned Words
router.get('/banned-words', verifyToken, verifyAdmin, adminController.getBannedWords);
router.post('/banned-word', verifyToken, verifyAdmin, adminController.addBannedWord);
router.delete('/banned-word/:id', verifyToken, verifyAdmin, adminController.deleteBannedWord);

// User Management Actions
router.delete('/user/:id', verifyToken, verifyAdmin, adminController.deleteUserByAdmin);

module.exports = router;
