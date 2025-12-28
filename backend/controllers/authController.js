const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/mysql");
const User = require('../models/User'); // Import missed earlier

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, role = 'Member' } = req.body;

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

    // Find User (Allow login by email or username)
    // Note: In MySQL, we need to query explicitly
    const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1', 
        [email, email]
    );
    const user = users[0];

    if (!user) {
      console.log("USER NOT FOUND:", email);
      return res.status(401).json({ message: "Invalid credentials" });
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

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset url
    // Since we are running locally/without domain for now, we construct a relative or localhost URL
    // For the user to click, they need a frontend URL.
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/reset-password.html?token=${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    console.log("============================================");
    console.log("EMAIL SENT (SIMULATED):");
    console.log(`To: ${user.email}`);
    console.log(`Subject: Password Reset Token`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log("============================================");

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Email could not be sent" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, data: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Google OAuth login/register (JWT)
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    // 1. Verify Google Token
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID, 
    });
    const { name, email, picture, sub: googleId } = ticket.getPayload();

    console.log("GOOGLE LOGIN:", email);

    // 2. Check if user exists
    let user = await User.findOne({ email });

    if (user) {
        // User exists -> Login
        // Update googleId if missing (linking account)
        if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }
    } else {
        // User new -> Register
        console.log("Creating new user from Google:", email);
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        user = new User({
            username: name,
            email,
            password: hashedPassword,
            googleId,
            role: 'user', // Default role
            avatar: picture // Assuming User model has avatar field, or ignored if strict
        });
        await user.save();
    }

    // 3. Generate JWT
    const jwtToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.json({
        token: jwtToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: picture
        }
    });

  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    res.status(400).json({ message: "Google Login Failed", error: err.message });
  }
};

// Create first admin (only if no admin exists)
exports.createFirstAdmin = async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists)
      return res.status(400).json({ message: "Admin already exists" });

    const { username, email, password } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = new User({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    res.status(201).json({
      message: "Admin created successfully",
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
