const jwt = require('jsonwebtoken');
const pool = require('../config/mysql');

// Middleware untuk verifikasi JWT
exports.verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware untuk verifikasi admin (dengan DB role lookup real-time)
exports.verifyAdmin = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const [users] = await pool.execute('SELECT username, email, role FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    const role = user ? user.role : req.user.role;

    const isAdmin = role && role.toLowerCase() === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user.role = 'Admin';
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Admin access required' });
  }
};