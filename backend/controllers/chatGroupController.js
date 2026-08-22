'use strict';

const pool = require('../config/mysql');

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Nama grup wajib' });

    const [result] = await pool.execute(
      'INSERT INTO chat_groups (name, description, created_by) VALUES (?, ?, ?)',
      [name.trim(), description || '', req.user.id]
    );
    await pool.execute('INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)', [result.insertId, req.user.id]);

    res.json({ success: true, groupId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listGroups = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT g.* FROM chat_groups g
       JOIN chat_group_members m ON m.group_id = g.id
       WHERE m.user_id = ? ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, groups: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    await pool.execute('INSERT IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)', [groupId, req.user.id]);
    res.json({ success: true, message: 'Bergabung ke grup' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const [member] = await pool.execute(
      'SELECT 1 FROM chat_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );
    if (!member.length) return res.status(403).json({ success: false, message: 'Bukan anggota grup' });

    const [rows] = await pool.execute(
      `SELECT m.id, m.message, m.created_at, u.username, u.avatar_url
       FROM chat_group_messages m JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ? ORDER BY m.id DESC LIMIT 50`,
      [groupId]
    );
    res.json({ success: true, messages: rows.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendGroupMessage = async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Pesan kosong' });

    const [member] = await pool.execute(
      'SELECT 1 FROM chat_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );
    if (!member.length) return res.status(403).json({ success: false, message: 'Bukan anggota grup' });

    const [result] = await pool.execute(
      'INSERT INTO chat_group_messages (group_id, user_id, message) VALUES (?, ?, ?)',
      [groupId, req.user.id, message.trim()]
    );

    res.json({ success: true, messageId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
