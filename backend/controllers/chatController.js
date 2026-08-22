const pool = require('../config/mysql');

exports.sendMessage = async (req, res) => {
  try {
    const { content, receiverId, groupId } = req.body;
    const senderId = req.user.id;

    if (!content || !content.trim()) return res.status(400).json({ message: 'Konten pesan harus diisi' });

    if (receiverId) {
      const targetId = parseInt(receiverId);
      if (isNaN(targetId)) return res.status(400).json({ message: 'ID penerima tidak valid' });

      // 1. Verify if they are friends (status = 1)
      const [friendship] = await pool.execute(
        `SELECT * FROM friends 
         WHERE ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)) 
           AND status = 1`,
        [senderId, targetId, targetId, senderId]
      );
      if (friendship.length === 0) {
        return res.status(403).json({ message: 'Anda hanya dapat mengirim pesan ke pengguna yang sudah menjadi teman.' });
      }

      // 2. Verify if either user blocked the other
      const [blocks] = await pool.execute(
        `SELECT * FROM blocked_users 
         WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
        [senderId, targetId, targetId, senderId]
      );
      if (blocks.length > 0) {
        return res.status(403).json({ message: 'Tidak dapat mengirim pesan ke pengguna ini karena adanya pemblokiran.' });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, receiver_id, group_id, content) VALUES (?, ?, ?, ?)',
      [senderId, receiverId || null, groupId || null, content.trim()]
    );

    const [rows] = await pool.execute(
      `SELECT m.*, u.username as sender_name, u.avatar_url as sender_avatar 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('[ERROR] SEND MESSAGE:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengirim pesan.' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { receiverId, groupId } = req.query;
    const senderId = req.user.id;

    let sql = '';
    let params = [];

    if (groupId) {
      sql = `SELECT m.*, u.username as sender_name, u.avatar_url as sender_avatar 
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             WHERE m.group_id = ? 
             ORDER BY m.created_at ASC LIMIT 100`;
      params = [groupId];
    } else if (receiverId) {
      const targetId = parseInt(receiverId);
      if (isNaN(targetId)) return res.status(400).json({ message: 'ID penerima tidak valid' });

      // Verify that they have not blocked each other
      const [blocks] = await pool.execute(
        `SELECT * FROM blocked_users 
         WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
        [senderId, targetId, targetId, senderId]
      );
      if (blocks.length > 0) {
        return res.status(403).json({ message: 'Akses obrolan dibatasi karena pemblokiran.' });
      }

      sql = `SELECT m.*, u.username as sender_name, u.avatar_url as sender_avatar 
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                OR (m.sender_id = ? AND m.receiver_id = ?) 
             ORDER BY m.created_at ASC LIMIT 100`;
      params = [senderId, targetId, targetId, senderId];
    } else {
      // Instead of global leakage, return a secure summary list of active private conversations
      sql = `SELECT 
                 u.id as friend_id, 
                 u.username, 
                 u.avatar_url, 
                 u.role,
                 m.content as last_message,
                 m.created_at as last_message_time,
                 m.sender_id as last_sender_id
             FROM users u
             JOIN messages m ON m.id = (
                 SELECT id FROM messages 
                 WHERE ((sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?))
                 ORDER BY created_at DESC LIMIT 1
             )
             WHERE u.deleted_at IS NULL
             ORDER BY m.created_at DESC`;
      params = [senderId, senderId];
    }

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('[ERROR] GET MESSAGES:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil pesan.' });
  }
};
