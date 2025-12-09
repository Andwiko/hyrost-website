const multer = require('multer');
const path = require('path');

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Folder tempat menyimpan file
    },
    filename: function (req, file, cb) {
        // Buat nama file unik untuk menghindari duplikat
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Filter untuk memastikan hanya file gambar yang diizinkan
// Tambahkan validasi ekstensi file
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPG/JPEG/PNG/GIF) yang diizinkan!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // Batasi ukuran file 5MB
});

module.exports = upload;