const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./db');
const seedDefaults = require('./seed');

const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agent');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sequential Lead Dialer CRM API',
    database: db.isTurso ? 'Turso Cloud SQLite' : 'Local SQLite',
    tursoConfigured: Boolean(process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL),
    timestamp: new Date().toISOString()
  });
});

// API Routes: mount both with and without /api prefix for Vercel rewrite resilience
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/agent', agentRoutes);
app.use('/agent', agentRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

// Run auto seed on start
seedDefaults().catch(console.error);

// Serve frontend static build if built locally
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/auth') && !req.path.startsWith('/agent') && !req.path.startsWith('/admin')) {
      return res.sendFile(path.resolve(distPath, 'index.html'));
    }
    next();
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Sequential Lead Dialer CRM Server running on port ${PORT}`);
    console.log(`📍 Web App & API available at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
