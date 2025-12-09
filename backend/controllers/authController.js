const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const users = []; // In-memory store

// Register new user or admin (admin only)
exports.register = async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    
    // NO-DB Fallback
    if (!global.dbConnected) {
        console.log('NO-DB MODE: Registering user in memory');
        const existingUser = users.find(u => u.email === email);
        if (existingUser) return res.status(400).json({ message: 'Email already exists (in memory)' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = {
            _id: 'mem_' + Date.now(),
            username,
            email,
            password: hashedPassword,
            role,
            save: async () => {}
        };
        users.push(user);

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.status(201).json({ token, user: { id: user._id, username, email, role } });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: req.user?.role === 'admin' ? role : 'user' // Only admin can set role
    });

    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  console.log('LOGIN ATTEMPT:', req.body);
  try {
    const { email, password } = req.body;

    // NO-DB Fallback
    if (!global.dbConnected) {
        console.log('NO-DB MODE: Logging in from memory');
        
        // DEV ACCESS: Hardcoded Admin
        if (email === 'admin' && password === 'admin') {
             const token = jwt.sign({ id: 'dev_admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
             return res.json({ token, user: { id: 'dev_admin', username: 'Administrator', email: 'admin', role: 'admin' } });
        }

        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ message: 'Invalid credentials (memory)' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials (memory)' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Generate Reset Token
const crypto = require('crypto');

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset url
    // Since we are running locally/without domain for now, we construct a relative or localhost URL
    // For the user to click, they need a frontend URL.
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    console.log('============================================');
    console.log('EMAIL SENT (SIMULATED):');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Password Reset Token`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log('============================================');

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Email could not be sent' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    
    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, data: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google OAuth login/register (JWT)
exports.googleLogin = (req, res) => {
  // 1. Verifikasi token Google (gunakan google-auth-library)
  // 2. Jika user baru, buat user di DB
  // 3. Jika user sudah ada, login
  // 4. Return JWT token
  res.send('Google OAuth endpoint (implementasi diperlukan)');
};

// Create first admin (only if no admin exists)
exports.createFirstAdmin = async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

    const { username, email, password } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = new User({
      username,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    
    res.status(201).json({
      message: 'Admin created successfully',
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};