const pool = require('../config/mysql');
const { uploadMediaToDrive, isDriveEnabled } = require('../utils/googleDriveUploader');

const uploadController = {
  // POST /api/upload
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
      }

      const userId = req.user ? req.user.id : null;
      const file = req.file;

      let storageDriver = 'local';
      let directUrl = `/uploads/${file.filename}`;
      let gdriveFileId = null;
      let gdriveViewLink = null;

      // Try uploading to Google Drive if configured
      if (isDriveEnabled()) {
        try {
          const driveResult = await uploadMediaToDrive(file.path, file.originalname, file.mimetype);
          if (driveResult && driveResult.directUrl) {
            storageDriver = 'gdrive';
            directUrl = driveResult.directUrl;
            gdriveFileId = driveResult.fileId;
            gdriveViewLink = driveResult.webViewLink;
          }
        } catch (driveErr) {
          console.warn('⚠️ Google Drive upload error, using local fallback:', driveErr.message);
        }
      }

      // Store upload record in MySQL database
      try {
        await pool.execute(
          `INSERT INTO uploads (user_id, original_name, stored_filename, mime_type, file_size, storage_driver, gdrive_file_id, gdrive_view_link, direct_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            file.originalname,
            file.filename,
            file.mimetype,
            file.size,
            storageDriver,
            gdriveFileId,
            gdriveViewLink,
            directUrl
          ]
        );
      } catch (dbErr) {
        console.warn('⚠️ MySQL uploads record notice:', dbErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'File berhasil diunggah ke hosting realm!',
        url: directUrl,
        filename: file.filename,
        storage: storageDriver,
        size: file.size,
        mimetype: file.mimetype
      });
    } catch (err) {
      console.error('❌ Upload controller error:', err);
      return res.status(500).json({ success: false, message: 'Gagal memproses upload file' });
    }
  },

  // POST /api/upload/avatar
  uploadAvatar: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'File avatar tidak ditemukan' });
      }

      const userId = req.user.id;
      const file = req.file;

      let storageDriver = 'local';
      let directUrl = `/uploads/${file.filename}`;
      let gdriveFileId = null;
      let gdriveViewLink = null;

      if (isDriveEnabled()) {
        try {
          const driveResult = await uploadMediaToDrive(file.path, file.originalname, file.mimetype);
          if (driveResult && driveResult.directUrl) {
            storageDriver = 'gdrive';
            directUrl = driveResult.directUrl;
            gdriveFileId = driveResult.fileId;
            gdriveViewLink = driveResult.webViewLink;
          }
        } catch (driveErr) {
          console.warn('⚠️ Google Drive avatar upload error, using local fallback:', driveErr.message);
        }
      }

      // Update user avatar in MySQL
      await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [directUrl, userId]);

      // Record in uploads table
      try {
        await pool.execute(
          `INSERT INTO uploads (user_id, original_name, stored_filename, mime_type, file_size, storage_driver, gdrive_file_id, gdrive_view_link, direct_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, file.originalname, file.filename, file.mimetype, file.size, storageDriver, gdriveFileId, gdriveViewLink, directUrl]
        );
      } catch (_) {}

      return res.json({
        success: true,
        message: 'Foto profil avatar berhasil diperbarui!',
        avatarUrl: directUrl,
        storage: storageDriver
      });
    } catch (err) {
      console.error('❌ Avatar upload error:', err);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui avatar' });
    }
  },

  // GET /api/upload/my-uploads
  getMyUploads: async (req, res) => {
    try {
      const userId = req.user.id;
      const [rows] = await pool.execute(
        'SELECT * FROM uploads WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ success: true, uploads: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat upload' });
    }
  }
};

module.exports = uploadController;
