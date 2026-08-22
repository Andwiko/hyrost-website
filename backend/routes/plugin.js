const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/pluginController');

router.get('/info', pluginController.getPluginInfo);
router.get('/catalog', pluginController.getCatalog);
router.get('/catalog/:code', pluginController.getCatalogItem);

module.exports = router;
