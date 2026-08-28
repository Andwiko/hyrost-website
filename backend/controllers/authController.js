const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/mysql");
const { grantDefaultHeads } = require("../utils/profileHeads");

const { sanitizeRole, generateReferralCode } = require('../utils/security');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { sendDiscordEmbed } = require('../utils/discordWebhook');

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    const role = 'Member';

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
                return res.status(403).json({ 
                    message: `Akun ini baru dihapus. Anda harus menunggu ${Math.ceil(48 - hoursDiff)} jam lagi untuk mendaftar ulang dengan email/username ini.` 
                });
            } else {
                // Hapus data lama (Hard Delete) agar bisa register baru clean
                await pool.execute('DELETE FROM users WHERE id = ?', [user.id]);
            }
        } else {
            return res.status(400).json({ message: 'Username or Email already exists' });
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
    
    // Fetch newly created user to get the correct timestamp
    const [newUserRows] = await pool.execute('SELECT created_at FROM users WHERE id = ?', [newUserId]);
    const createdAt = newUserRows[0].created_at;

    console.log('REGISTER SUCCESS:', username, 'ID:', newUserId);
    
    // Generate JWT
    const token = jwt.sign(
      { id: newUserId, role: role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUserId,
        username,
        email,
        role,
        createdAt: createdAt // Send timestamp to frontend
      }
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  console.log("LOGIN ATTEMPT:", req.body);
  try {
    const { email, password } = req.body;

    // Find User (Allow login by email or username, excluding deleted users)
    const [users] = await pool.execute(
        'SELECT * FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL LIMIT 1', 
        [email, email]
    );
    const user = users[0];

    if (!user) {
      console.log("USER NOT FOUND OR DELETED:", email);
      return res.status(401).json({ message: "Kredensial tidak valid atau akun telah dihapus" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("PASSWORD MISMATCH for:", user.username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("LOGIN SUCCESS:", user.username, "Role:", user.role);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url, // Map from snake_case
        createdAt: user.created_at
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Generate Reset Token
const crypto = require("crypto");

// Forgot Password (MySQL)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await pool.execute('SELECT id, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.execute(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, hashedToken, expiresAt]
    );

    const resetUrl = `${req.protocol}://${req.get("host")}/auth/reset-password.html?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Email could not be sent" });
  }
};

// Reset Password (MySQL)
exports.resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.resettoken || req.body.token;
    if (!resetToken) return res.status(400).json({ message: "Token required" });

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const [resets] = await pool.execute(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [hashedToken]
    );

    if (resets.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const resetRecord = resets[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRecord.user_id]);
    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [resetRecord.user_id]);

    res.status(200).json({ success: true, data: "Password updated" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Google OAuth login/register (MySQL)
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  try {
    const { token, payload: clientPayload } = req.body;
    let name, email, picture, googleId;

    if (token && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
      try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, 
        });
        const p = ticket.getPayload();
        name = p.name;
        email = p.email;
        picture = p.picture;
        googleId = p.sub;
      } catch (verifyErr) {
        if (process.env.NODE_ENV === 'production') {
          return res.status(401).json({ message: 'Google token verification failed' });
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
        return res.status(401).json({ message: 'Google login requires valid token in production' });
      }
      name = clientPayload.name || clientPayload.email.split('@')[0];
      email = clientPayload.email;
      picture = clientPayload.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
      googleId = clientPayload.sub || `google_${Date.now()}`;
    } else if (token) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'Google Client ID not configured' });
      }
      // Dev-only fallback decode
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

    console.log("GOOGLE LOGIN SUCCESS:", email);

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
        console.log("Creating new user from Google:", email);
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
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

    const jwtToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.json({
        success: true,
        token: jwtToken,
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
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'Admin' LIMIT 1");
    if (admins.length > 0) return res.status(400).json({ message: "Admin already exists" });

    const { username, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'Admin')",
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: "Admin created successfully",
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
