const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload'); // Import middleware upload

// Route untuk membuat produk baru
// POST /api/products
// Gunakan middleware `upload.single('image')` untuk menangani upload file gambar
// 'image' adalah nama field di form frontend
router.post('/', upload.single('image'), productController.createProduct);

module.exports = router;