const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    // Tambahkan validasi
    price: {
        type: Number,
        required: true,
        min: 0 // Harga tidak boleh negatif
    },
    category: {
        type: String,
        required: true
    },
    imagePath: { // Path atau lokasi file gambar di server
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);