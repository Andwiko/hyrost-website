const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth'); 

router.get('/me', verifyToken, userController.getMe);
router.get('/activities', verifyToken, userController.getActivities);
router.put('/update', verifyToken, userController.updateProfile);
router.delete('/delete', verifyToken, userController.deleteUser);

module.exports = router;
