const Product = require('../models/Product');

// Fungsi untuk membuat produk baru
exports.createProduct = async (req, res) => {
    try {
        // req.body berisi data teks (nama, harga, kategori)
        // req.file berisi data file gambar (dari middleware multer)
        const { name, price, category } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Gambar produk harus diunggah.' });
        }

        // Buat produk baru menggunakan data dari request
        const newProduct = new Product({
            name,
            price,
            category,
            imagePath: req.file.path // Simpan path file gambar
        });

        // Simpan produk ke database
        const savedProduct = await newProduct.save();

        // Kirim respons sukses
        res.status(201).json(savedProduct);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};