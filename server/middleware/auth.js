const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sequential-lead-dialer-jwt-super-secret-key-2026';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }

  try {
    // Check user active status in database
    const user = await db.get('SELECT id, name, username, role, is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is deactivated. Contact administrator.' });
    }

    // Update last_active_at (non-fatal if it fails)
    try {
      await db.run('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } catch (e) {
      // Ignore background timestamp update failures
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification DB error:', err);
    return res.status(500).json({ error: 'Database error during authentication check: ' + err.message });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }
  next();
}

function requireAgent(req, res, next) {
  if (!req.user || (req.user.role !== 'agent' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied: Caller Agent privileges required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAgent,
  JWT_SECRET,
};
