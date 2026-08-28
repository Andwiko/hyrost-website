const pool = require('../config/mysql');

const showcaseController = {
  // GET /api/showcases
  getShowcases: async (req, res) => {
    try {
      const { category, sort = 'popular', search } = req.query;
      let query = `
        SELECT s.*, u.username, u.avatar_url, u.role as user_role
        FROM build_showcases s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (category && category.toLowerCase() !== 'all') {
        query += ` AND LOWER(s.category) = LOWER(?)`;
        params.push(category);
      }

      if (search && search.trim() !== '') {
        query += ` AND (s.title LIKE ? OR s.description LIKE ? OR u.username LIKE ?)`;
        const wildcard = `%${search.trim()}%`;
        params.push(wildcard, wildcard, wildcard);
      }

      if (sort === 'newest') {
        query += ` ORDER BY s.created_at DESC`;
      } else {
        query += ` ORDER BY s.likes_count DESC, s.created_at DESC`;
      }

      const [rows] = await pool.execute(query, params);
      
      // If user is authenticated, check which showcases they have liked
      let userLikedIds = new Set();
      if (req.user && req.user.id) {
        const [likes] = await pool.execute(
          'SELECT showcase_id FROM showcase_likes WHERE user_id = ?',
          [req.user.id]
        );
        userLikedIds = new Set(likes.map(l => l.showcase_id));
      }

      const showcases = rows.map(r => ({
        ...r,
        is_liked: userLikedIds.has(r.id),
        author: {
          username: r.username || 'Hyrost Builder',
          avatar_url: r.avatar_url || `https://cravatar.eu/avatar/${r.username || 'Steve'}/64.png`,
          role: r.user_role || 'Member'
        }
      }));

      return res.json({ success: true, data: showcases });
    } catch (err) {
      console.error('Error fetching showcases:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data showcase build' });
    }
  },

  // POST /api/showcases
  createShowcase: async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, description, image_url, category = 'Survival Base', coordinates = '' } = req.body;

      if (!title || !image_url) {
        return res.status(400).json({ success: false, message: 'Judul dan gambar wajib diisi' });
      }

      const [result] = await pool.execute(
        `INSERT INTO build_showcases (user_id, title, description, image_url, category, coordinates, likes_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [userId, title.trim(), (description || '').trim(), image_url.trim(), category.trim(), (coordinates || '').trim()]
      );

      return res.status(201).json({
        success: true,
        message: 'Karya build berhasil diunggah ke Wall of Fame!',
        id: result.insertId
      });
    } catch (err) {
      console.error('Error creating showcase:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengunggah karya build' });
    }
  },

  // POST /api/showcases/:id/like
  toggleLike: async (req, res) => {
    try {
      const userId = req.user.id;
      const showcaseId = parseInt(req.params.id, 10);

      if (!showcaseId) {
        return res.status(400).json({ success: false, message: 'ID showcase tidak valid' });
      }

      const [existing] = await pool.execute(
        'SELECT id FROM showcase_likes WHERE showcase_id = ? AND user_id = ?',
        [showcaseId, userId]
      );

      let liked = false;
      if (existing.length > 0) {
        // Unlike
        await pool.execute('DELETE FROM showcase_likes WHERE id = ?', [existing[0].id]);
        await pool.execute(
          'UPDATE build_showcases SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
          [showcaseId]
        );
        liked = false;
      } else {
        // Like
        await pool.execute(
          'INSERT INTO showcase_likes (showcase_id, user_id) VALUES (?, ?)',
          [showcaseId, userId]
        );
        await pool.execute(
          'UPDATE build_showcases SET likes_count = likes_count + 1 WHERE id = ?',
          [showcaseId]
        );
        liked = true;
      }

      const [updated] = await pool.execute('SELECT likes_count FROM build_showcases WHERE id = ?', [showcaseId]);
      const newCount = updated.length > 0 ? updated[0].likes_count : 0;

      return res.json({
        success: true,
        liked,
        likes_count: newCount,
        message: liked ? 'Berhasil memberikan like!' : 'Like dibatalkan'
      });
    } catch (err) {
      console.error('Error toggling like:', err);
      return res.status(500).json({ success: false, message: 'Gagal memproses like' });
    }
  },

  // DELETE /api/showcases/:id
  deleteShowcase: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role || 'Member';
      const showcaseId = parseInt(req.params.id, 10);

      const [rows] = await pool.execute('SELECT * FROM build_showcases WHERE id = ?', [showcaseId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Karya tidak ditemukan' });
      }

      const item = rows[0];
      if (item.user_id !== userId && userRole.toLowerCase() !== 'admin') {
        return res.status(403).json({ success: false, message: 'Tidak memiliki izin menghapus karya ini' });
      }

      await pool.execute('DELETE FROM build_showcases WHERE id = ?', [showcaseId]);
      return res.json({ success: true, message: 'Karya berhasil dihapus' });
    } catch (err) {
      console.error('Error deleting showcase:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus karya' });
    }
  }
};

module.exports = showcaseController;
