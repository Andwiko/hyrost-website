'use strict';

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/mysql");
const { grantDefaultHeads } = require("../utils/profileHeads");
const { sanitizeRole, generateReferralCode, getJwtSecret, getJwtRefreshSecret } = require('../utils/security');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { sendDiscordEmbed } = require('../utils/discordWebhook');
const { logSecurityEvent } = require('../utils/securityAudit');

// Helper to generate access and refresh token pair
function generateTokenPair(user) {
  const jwtSecret = getJwtSecret();
  const refreshSecret = getJwtRefreshSecret();

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    jwtSecret,
    { expiresIn: "1d" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    refreshSecret,
    { expiresIn: "7d" }
  );

  return { token, refreshToken };
}

// Register new user
exports.register = async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const { username, email, password, referralCode } = req.body;
    const role = 'Member';

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    // Check if user exists (Active or Soft Deleted)
    const [existingUsers] = await pool.execute(
        'SELECT id, username, email, deleted_at FROM users WHERE email = ? OR username = ?',
        [email, username]
    );

    if (existingUsers.length > 0) {
        const user = existingUsers[0];
        
        // Cek apakah akun dihapus (Soft Delete)
        if (user.deleted_at) {
            const deletedTime = new Date(user.deleted_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - deletedTime) / (1000 * 60 * 60);

            if (hoursDiff < 48) {
                logSecurityEvent('REGISTER_BLOCKED_SOFT_DELETE', { username, ip, status: 'WARN' });
                return res.status(403).json({ 
                    message: `Akun ini baru dihapus. Anda harus menunggu ${Math.ceil(48 - hoursDiff)} jam lagi untuk mendaftar ulang dengan email/username ini.` 
                });
            } else {
                // Hapus data lama (Hard Delete) agar bisa register baru clean
                await pool.execute('DELETE FROM users WHERE id = ?', [user.id]);
            }
        } else {
            logSecurityEvent('REGISTER_FAILED_DUPLICATE', { username, ip, status: 'INFO' });
            return res.status(400).json({ message: 'Username atau Email sudah terdaftar' });
        }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert User
    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role]
    );

    const newUserId = result.insertId;

    await grantDefaultHeads(newUserId);
    await pool.execute(
      'UPDATE users SET avatar_url = ?, referral_code = ? WHERE id = ?',
      ['https://cravatar.eu/helmavatar/Steve/128.png', generateReferralCode(username), newUserId]
    );

    if (referralCode) {
      const [referrers] = await pool.execute('SELECT id FROM users WHERE referral_code = ? AND deleted_at IS NULL', [referralCode]);
      if (referrers.length) {
        await pool.execute('INSERT INTO referrals (referrer_id, referred_user_id, referral_code) VALUES (?, ?, ?)', [referrers[0].id, newUserId, referralCode]);
        await pool.execute('UPDATE users SET referred_by = ?, coin_bronze = coin_bronze + 100 WHERE id = ?', [referrers[0].id, newUserId]);
        await pool.execute('UPDATE users SET coin_bronze = coin_bronze + 100 WHERE id = ?', [referrers[0].id]);
      }
    }
    
    try {
      const { grantAchievement } = require('./featuresController');
      await grantAchievement(newUserId, 'first_login');
    } catch (_) {}
    
    await sendDiscordEmbed({
      title: '👤 Member Baru',
      description: `**${username}** bergabung ke Hyrost Realm`,
      color: 0x6366f1,
    }).catch(() => {});
    
    const [newUserRows] = await pool.execute('SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ?', [newUserId]);
    const userObj = newUserRows[0];

    const tokens = generateTokenPair(userObj);

    logSecurityEvent('REGISTER_SUCCESS', { username, userId: newUserId, ip, status: 'INFO' });

    res.status(201).json({
      success: true,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: userObj.id,
        username: userObj.username,
        email: userObj.email,
        role: userObj.role,
        avatarUrl: userObj.avatar_url,
        createdAt: userObj.created_at
      }
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server saat registrasi', error: err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email/Username dan Password wajib diisi" });
    }

    // Find User (Allow login by email or username, excluding deleted users)
    const [users] = await pool.execute(
        'SELECT * FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL LIMIT 1', 
        [email, email]
    );
    const user = users[0];

    if (!user) {
      logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { username: email, ip, status: 'WARN' });
      return res.status(401).json({ message: "Kredensial tidak valid atau akun telah dinonaktifkan" });
    }

    // Validate password (supports bcrypt hash and plain-text auto-upgrade)
    let isMatch = false;
    if (user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = (password === user.password);
        if (isMatch) {
          try {
            const salt = await bcrypt.genSalt(10);
            const upgradedHash = await bcrypt.hash(password, salt);
            await pool.execute('UPDATE users SET password = ? WHERE id = ?', [upgradedHash, user.id]);
          } catch (_) {}
        }
      }
    }

    if (!isMatch) {
      logSecurityEvent('LOGIN_FAILED_WRONG_PASSWORD', { username: user.username, userId: user.id, ip, status: 'WARN' });
      return res.status(401).json({ message: "Password yang Anda masukkan salah" });
    }

    // Check if 2FA is enabled on account
    let requires2FA = false;
    try {
      const [totpRows] = await pool.execute('SELECT enabled FROM admin_totp WHERE user_id = ? AND enabled = 1', [user.id]);
      if (totpRows.length > 0) {
        requires2FA = true;
      }
    } catch (_) {}

    const tokens = generateTokenPair(user);

    logSecurityEvent('LOGIN_SUCCESS', { username: user.username, userId: user.id, ip, status: 'INFO' });

    res.json({
      success: true,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      requires2FA,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Terjadi kesalahan server saat login", error: err.message });
  }
};

// Refresh Access Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token diperlukan' });
    }

    const refreshSecret = getJwtRefreshSecret();
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Refresh token tidak valid atau telah kedaluwarsa' });
    }

    const [users] = await pool.execute(
      'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [decoded.id]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    const user = users[0];
    const newTokens = generateTokenPair(user);

    res.json({
      success: true,
      token: newTokens.token,
      refreshToken: newTokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    console.error('REFRESH TOKEN ERROR:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui token', error: err.message });
  }
};

// Get current logged-in user profile
exports.getMe = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role, avatar_url, coin_bronze, coin_silver, coin_gold, created_at FROM users WHERE id = ? AND deleted_at IS NULL',
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
        coins: {
          bronze: user.coin_bronze || 0,
          silver: user.coin_silver || 0,
          gold: user.coin_gold || 0
        },
        createdAt: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Harap masukkan email Anda" });

    const [users] = await pool.execute('SELECT id, email, username FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (users.length === 0) {
      // Return 200 to prevent user enumeration attacks
      return res.status(200).json({ success: true, message: "Jika email terdaftar, instruksi reset password telah dikirim." });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.execute(
      "UPDATE users SET reset_password_token = ?, reset_password_expire = ? WHERE id = ?",
      [resetPasswordToken, resetPasswordExpire, user.id]
    );

    const resetUrl = `${req.protocol}://${req.get("host")}/auth/reset-password.html?resettoken=${resetToken}`;

    logSecurityEvent('PASSWORD_RESET_REQUESTED', { username: user.username, userId: user.id, ip, status: 'INFO' });

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
      res.status(200).json({ success: true, message: "Email reset password telah dikirim ke alamat email Anda." });
    } catch (err) {
      await pool.execute("UPDATE users SET reset_password_token = NULL, reset_password_expire = NULL WHERE id = ?", [user.id]);
      return res.status(500).json({ message: "Gagal mengirim email reset password" });
    }
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.resettoken).digest("hex");

    const [users] = await pool.execute(
      "SELECT id, username FROM users WHERE reset_password_token = ? AND reset_password_expire > NOW()",
      [resetPasswordToken]
    );

    if (users.length === 0) {
      logSecurityEvent('PASSWORD_RESET_INVALID_TOKEN', { ip, status: 'WARN' });
      return res.status(400).json({ message: "Token reset password tidak valid atau telah kedaluwarsa" });
    }

    const user = users[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    await pool.execute(
      "UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expire = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    logSecurityEvent('PASSWORD_RESET_SUCCESS', { username: user.username, userId: user.id, ip, status: 'INFO' });

    res.status(200).json({ success: true, message: "Password berhasil diperbarui. Silakan login kembali." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Google OAuth login/register (MySQL)
const { OAuth2Client } = require('google-auth-library');
const googleClientId = process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id')
  ? process.env.GOOGLE_CLIENT_ID
  : null;
const client = googleClientId ? new OAuth2Client(googleClientId) : null;

exports.googleLogin = async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const { token, payload: clientPayload } = req.body;
    let name, email, picture, googleId;

    if (token && client && googleClientId) {
      try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: googleClientId, 
        });
        const p = ticket.getPayload();
        name = p.name;
        email = p.email;
        picture = p.picture;
        googleId = p.sub;
      } catch (verifyErr) {
        if (process.env.NODE_ENV === 'production') {
          return res.status(401).json({ message: 'Verifikasi Google Token gagal. Pastikan Google Client ID valid.' });
        }
        if (clientPayload && clientPayload.email) {
          name = clientPayload.name || clientPayload.email.split('@')[0];
          email = clientPayload.email;
          picture = clientPayload.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
          googleId = clientPayload.sub || `google_${Date.now()}`;
        } else {
          throw verifyErr;
        }
      }
    } else if (clientPayload && clientPayload.email) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'Google login memerlukan konfigurasi Google Client ID yang valid di production.' });
      }
      name = clientPayload.name || clientPayload.email.split('@')[0];
      email = clientPayload.email;
      picture = clientPayload.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
      googleId = clientPayload.sub || `google_${Date.now()}`;
    } else if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
        name = decoded.name || decoded.email.split('@')[0];
        email = decoded.email;
        picture = decoded.picture;
        googleId = decoded.sub;
      } catch (e) {
        return res.status(400).json({ message: "Google Token tidak valid" });
      }
    } else {
      return res.status(400).json({ message: "Google Token tidak ditemukan" });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    let user;

    if (users.length > 0) {
        user = users[0];
        if (user.deleted_at) {
          return res.status(403).json({ message: "Akun ini telah dihapus. Silakan hubungi support." });
        }
        if (!user.google_id) {
            await pool.execute('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?', [googleId, picture, user.id]);
            user.google_id = googleId;
        }
    } else {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);
        const cleanUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '');

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, role, google_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
            [cleanUsername, email, hashedPassword, 'Member', googleId, picture]
        );
        const [newUserRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
        user = newUserRows[0];
    }

    const tokens = generateTokenPair(user);

    logSecurityEvent('GOOGLE_LOGIN_SUCCESS', { username: user.username, userId: user.id, ip, status: 'INFO' });

    res.json({
        success: true,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatar_url || picture,
            googleId: user.google_id
        }
    });

  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    res.status(400).json({ message: "Google Login Gagal", error: err.message });
  }
};

// Create first admin (MySQL)
exports.createFirstAdmin = async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'Admin' LIMIT 1");
    if (admins.length > 0) return res.status(400).json({ message: "Akun admin utama sudah ada" });

    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Semua data admin wajib diisi" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'Admin')",
      [username, email, hashedPassword]
    );

    logSecurityEvent('FIRST_ADMIN_CREATED', { username, userId: result.insertId, ip, status: 'CRITICAL' });

    res.status(201).json({
      success: true,
      message: "Admin utama berhasil dibuat",
      user: {
        id: result.insertId,
        username,
        email,
        role: "Admin",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
