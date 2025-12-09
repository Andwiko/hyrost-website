// Admin routes
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.dashboard);
// TODO: router.get('/users', adminController.listUsers);
// TODO: router.post('/ban', adminController.banUser);

module.exports = router;
