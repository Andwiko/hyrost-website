const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const localFileStore = require('../utils/localFileStore');

localFileStore.ensureDirs().catch(() => {});

// Whitelist ekstensi dan MIME type yang diizinkan (Strict Image Only)
const ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon'
];

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico'];

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, localFileStore.getUploadsDir());
  },
  filename(_req, file, cb) {
    // Generate nama file acak aman tanpa mengekspos nama asli
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : '.png';
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const originalName = String(file.originalname || '').toLowerCase();
  const ext = path.extname(originalName).toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  // 1. Blokir jika mengandung null bytes atau path traversal
  if (originalName.includes('\0') || originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
    return cb(new Error('Nama file tidak valid atau mengandung karakter berbahaya!'), false);
  }

  // 2. Blokir jika mengandung ekstensi script berbahaya (anti double-extension bypass)
  const dangerousPatterns = /\.(php|phtml|php[0-9]|exe|sh|bat|cmd|pl|cgi|py|js|jsp|asp|aspx|shtml|vbs|jar|svg|html|htm)($|\.)/i;
  if (dangerousPatterns.test(originalName)) {
    return cb(new Error('Format file ditolak demi keamanan server!'), false);
  }

  // 3. Wajib memenuhi whitelist ekstensi DAN whitelist MIME type
  if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar valid (JPG, JPEG, PNG, WEBP, GIF, ICO) yang diizinkan!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // Maksimal 8MB
    files: 1,                  // Maksimal 1 file per upload
  },
});

module.exports = upload;
