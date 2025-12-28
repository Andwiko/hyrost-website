const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// NOTE: verifyToken and verifyAdmin are already applied in routes/index.js 
// to the entire /admin path.

// Role Management
router.get('/roles', adminController.getAllRoles);
router.post('/role', adminController.createRole);
router.put('/role/:id', adminController.updateRoleCustomization);
router.delete('/role/:id', adminController.deleteRole);
router.post('/assign-role', adminController.assignRole);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/update-coins', adminController.updateCoins);
router.delete('/user/:id', adminController.deleteUserByAdmin);

// Banned Words Management
router.get('/banned-words', adminController.getBannedWords);
router.post('/banned-word', adminController.addBannedWord);
router.delete('/banned-word/:id', adminController.deleteBannedWord);

// Forum Moderation
router.get('/forum/threads', adminController.getRecentThreads);
router.delete('/forum/thread/:id', adminController.deleteThread);
router.post('/forum/thread/:id/pin', adminController.togglePinThread);

// Role Purchase (Publicly accessible but requires token)
router.post('/purchase-role', adminController.purchaseRole);

// Global Settings
router.get('/settings', adminController.getSettings);
router.post('/setting', adminController.updateSetting);

// Activity Logs
router.get('/logs', adminController.getActivityLogs);

// Cosmetic Management
router.get('/cosmetics', adminController.getAllCosmetics);
router.post('/cosmetic', adminController.createCosmetic);
router.delete('/cosmetic/:id', adminController.deleteCosmetic);

module.exports = router;
