const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { verifyToken, verifyAdmin } = require('./middleware/auth');

// Load environment variables
// Fallback for No-DB mode or missing env
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'fallback_secret_key_123';
if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://localhost:27017/hyrost';

const result = dotenv.config({ path: path.join(__dirname, '.env') });

// Error Handlers for process
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// Force keep alive (Hack for No-DB mode persistent process)
setInterval(() => {}, 10000);

// Connect to MongoDB
global.dbConnected = false;
console.log('MONGO_URI:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 }) // Fail fast
  .then(() => {
    console.log('MongoDB Connected Successfully');
    global.dbConnected = true;
  })
  .catch(err => {
      console.error('MongoDB Connection Error:', err.message);
      console.log('RUNNING IN NO-DB MODE (In-Memory Only)');
      global.dbConnected = false;
  });

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the parent directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.get('/', (req, res) => {
  res.send('Hyrost API Running');
});

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes);

// Additional routes
app.use('/api/forum', require('./routes/forum'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/products', require('./routes/productRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Request logger middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});