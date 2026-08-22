const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');

router.get('/', verifyToken, inventoryController.getMyInventory);
router.post('/:id/claim-mc', verifyToken, inventoryController.claimItemToMinecraft);
router.patch('/:id/equip', verifyToken, inventoryController.toggleEquip);
router.post('/grant', verifyToken, verifyAdmin, inventoryController.grantItem);

module.exports = router;
