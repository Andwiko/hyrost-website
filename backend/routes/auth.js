// Auth routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

console.log('DEBUG: Registering Auth Routes. authController keys:', Object.keys(authController || {}));

if (!authController.register) console.error('CRITICAL: authController.register is undefined!');
if (!authController.login) console.error('CRITICAL: authController.login is undefined!');

router.post('/register', authController.register || ((req, res) => res.status(500).send('Handler Missing')));
router.post('/login', authController.login || ((req, res) => res.status(500).send('Handler Missing')));
router.post('/google', authController.googleLogin || ((req, res) => res.status(500).send('Handler Missing')));
router.post('/forgotpassword', authController.forgotPassword || ((req, res) => res.status(500).send('Handler Missing')));
router.put('/resetpassword/:resettoken', authController.resetPassword || ((req, res) => res.status(500).send('Handler Missing')));

module.exports = router;