const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const marketplaceController = require('../controllers/marketplaceController');

router.get('/listings', marketplaceController.getListings);
router.get('/my-listings', verifyToken, marketplaceController.getMyListings);
router.post('/listings', verifyToken, marketplaceController.createListing);
router.post('/listings/:id/buy', verifyToken, marketplaceController.buyListing);
router.delete('/listings/:id', verifyToken, marketplaceController.deleteListing);

module.exports = router;
