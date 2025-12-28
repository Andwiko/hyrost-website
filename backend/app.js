const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static files FIRST
// This ensures index.html is loaded when accessing root /
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// Routes
// We mount all API routes under /api
app.use('/api', require('./routes/index'));

// Debug route to check files (temporary)
app.get('/api/debug-files', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'modules');
  try {
    const files = fs.readdirSync(dir);
    res.json({ root: path.join(__dirname, '..'), modules: files });
  } catch (err) {
    res.status(500).json({ error: err.message, dir });
  }
});

// Default Route (Fallback for API testing if static file fails or for explicit checks)
// Note: Since static middleware is above, this will only be hit if no static file matches
app.get('/', (req, res) => {
  res.send('Hyrost API Running');
});

// Error Handler (Should be last)
app.use(errorHandler);

module.exports = app;
