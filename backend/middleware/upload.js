const multer = require('multer');
const path = require('path');
const localFileStore = require('../utils/localFileStore');

localFileStore.ensureDirs().catch(() => {});

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, localFileStore.getUploadsDir());
  },
  filename(_req, file, cb) {
    cb(null, localFileStore.safeFilename(file.originalname));
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype.startsWith('image/') || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPG/JPEG/PNG/GIF/WEBP/SVG) yang diizinkan!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB max limit
});

module.exports = upload;
