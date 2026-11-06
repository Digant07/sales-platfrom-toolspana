const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// GET /api/auth/login or /api/auth (Redirect browser navigations directly to the portal web app)
router.get(['/login', '/'], (req, res) => {
  // If requested as JSON via API call, return status info
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({
      status: 'ok',
      service: 'Auth Service',
      database: db.isTurso ? 'Turso Cloud SQLite' : 'Local SQLite',
      message: 'Auth service active. Submit POST request to /api/auth/login to authenticate.',
    });
  }
  // For web browsers, provide an explicit HTML auto-redirect so the browser immediately opens the CRM app
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/">
  <script>window.location.replace('/');</script>
  <title>Redirecting to Sequential Lead Dialer CRM...</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #020617; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
  <div>
    <h2 style="color: #ffffff; font-size: 1.1rem; margin-bottom: 0.5rem;">Redirecting to Sequential Lead Dialer CRM...</h2>
    <p style="font-size: 0.85rem; margin-bottom: 1rem;">If you are not redirected automatically, please click below:</p>
    <a href="/" style="display: inline-block; padding: 0.5rem 1rem; background: #ffffff; color: #020617; font-weight: 600; font-size: 0.85rem; text-decoration: none; border-radius: 6px;">Open Dialer Console</a>
  </div>
</body>
</html>`);
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
    const causeMsg = err.cause ? ` (${err.cause.message || err.cause.code || err.cause})` : '';
    return res.status(500).json({ error: 'Internal server error during login: ' + err.message + causeMsg });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
