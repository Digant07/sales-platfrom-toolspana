const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// GET /api/auth/login (Health & status check, redirects browsers to frontend login)
router.get('/login', (req, res) => {
  if (req.accepts('html')) {
    return res.redirect('/');
  }
  res.json({
    status: 'ok',
    service: 'Auth Service',
    database: db.isTurso ? 'Turso Cloud SQLite' : 'Local SQLite',
    message: 'Login endpoint is active. Send a POST request with { username, password } to log in.',
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your manager.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Update last active
    try {
      await db.run('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } catch (e) {
      console.warn('Failed to update last_active_at:', e.message);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        phone: user.phone,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
