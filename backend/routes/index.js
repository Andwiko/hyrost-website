const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Import Route Files
const authRoutes = require('./auth');
const adminRoutes = require('./adminRoutes');
const forumRoutes = require('./forum');
const chatRoutes = require('./chat');
const productRoutes = require('./productRoutes');
const minecraftRoutes = require('./minecraft');
const economyRoutes = require('./economyRoutes'); 
const worldRoutes = require('./worldRoutes'); // World/Feature Routes

const adminController = require('../controllers/adminController');

// Mount Routes
router.get('/public-settings', adminController.getSettings); // Public endpoint
router.get('/public-cosmetics', adminController.getAllCosmetics); // Public endpoint for shop
router.use('/auth', authRoutes);
router.use('/users', require('./userRoutes'));
router.use('/admin', verifyToken, verifyAdmin, adminRoutes);
router.use('/economy', economyRoutes);
router.use('/world', worldRoutes); // Tahta & Mystery Box API
router.use('/forum', forumRoutes);
router.use('/chat', chatRoutes);
router.use('/chat', chatRoutes);
router.use('/products', productRoutes);
router.use('/minecraft', minecraftRoutes);

// Sales Route (Direct)
router.post('/store/buy-cosmetic', verifyToken, adminController.buyCosmetic);

module.exports = router;
