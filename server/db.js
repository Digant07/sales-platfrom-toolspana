const path = require('path');
require('dotenv').config();

const TURSO_URL_DEFAULT = 'libsql://sales-dialer-digant.aws-ap-south-1.turso.io';
const TURSO_TOKEN_DEFAULT = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM4NzkyODEsImlkIjoiMDFhMWFiODktMjMwMS03YzdjLThjYjYtOTQyY2I3ZDhkODBhIiwia2lkIjoiVXZSWWR5MTVmeXBDei1fdE1rVFNlYjRwSWpoWkMxNkFDU1d1Q2h6RVZrQSIsInJpZCI6ImIzYjQyZDc2LTY3YmUtNDRkMC05ZTQzLTc5N2M4NzUzOTgzNyJ9.2cq1ORBcsX5LPfnyAb8NtsI--7vwITbdKOGWn_tAG1mQPfPMr3Kyuzm0v3W66xtFUszaj4ciyFVcEl27iheiAg';

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || TURSO_URL_DEFAULT;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || TURSO_TOKEN_DEFAULT;

const isTurso = Boolean(url && authToken);

let db;
let client = null;
let rawDb = null;
let initPromise = null;

if (isTurso) {
  const { createClient } = require('@libsql/client/web');

  console.log('⚡ Connecting to Turso Cloud SQLite:', url);

  client = createClient({
    url,
    authToken,
  });

  db = {
    isTurso: true,
    client,
    get: async (sql, params = []) => {
      await ensureInit();
      const res = await client.execute({ sql, args: params });
      return res.rows[0] || null;
    },
    all: async (sql, params = []) => {
      await ensureInit();
      const res = await client.execute({ sql, args: params });
      return res.rows;
    },
    run: async (sql, params = []) => {
      await ensureInit();
      const res = await client.execute({ sql, args: params });
      return {
        lastID: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : null,
        changes: res.rowsAffected,
      };
    },
    exec: async (sql) => {
      if (typeof client.executeMultiple === 'function') {
        await client.executeMultiple(sql);
      } else {
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await client.execute(statement);
        }
      }
    },
    transaction: async (callback) => {
      await ensureInit();
      const tx = await client.transaction('write');
      try {
        const txDb = {
          get: async (sql, params = []) => {
            const res = await tx.execute({ sql, args: params });
            return res.rows[0] || null;
          },
          all: async (sql, params = []) => {
            const res = await tx.execute({ sql, args: params });
            return res.rows;
          },
          run: async (sql, params = []) => {
            const res = await tx.execute({ sql, args: params });
            return {
              lastID: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : null,
              changes: res.rowsAffected,
            };
          },
        };
        const result = await callback(txDb);
        await tx.commit();
        return result;
      } catch (err) {
        try {
          await tx.rollback();
        } catch (rbErr) {}
        throw err;
      }
    },
  };
} else {
  // Local SQLite fallback using sqlite3
  console.log('💾 Using Local SQLite (crm.db)');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, 'crm.db');

  rawDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open local database:', err);
    } else {
      rawDb.run('PRAGMA journal_mode = WAL');
      rawDb.run('PRAGMA foreign_keys = ON');
    }
  });

  db = {
    isTurso: false,
    raw: rawDb,
    get: async (sql, params = []) => {
      await ensureInit();
      return new Promise((resolve, reject) => {
        rawDb.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
      });
    },
    all: async (sql, params = []) => {
      await ensureInit();
      return new Promise((resolve, reject) => {
        rawDb.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
      });
    },
    run: async (sql, params = []) => {
      await ensureInit();
      return new Promise((resolve, reject) => {
        rawDb.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    exec: (sql) =>
      new Promise((resolve, reject) => {
        rawDb.exec(sql, (err) => (err ? reject(err) : resolve()));
      }),
    transaction: async (callback) => {
      await ensureInit();
      await db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        const result = await callback(db);
        await db.exec('COMMIT');
        return result;
      } catch (err) {
        try {
          await db.exec('ROLLBACK');
        } catch (rbErr) {}
        throw err;
      }
    },
  };
}

async function createSchema() {
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'agent')),
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id_code TEXT,
      lead_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      raw_phone TEXT,
      alternate_phone TEXT,
      company_or_details TEXT,
      extra_data TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Locked_In_Progress', 'Completed', 'Follow_Up')),
      assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      call_disposition TEXT,
      agent_notes TEXT,
      follow_up_date DATETIME,
      locked_at DATETIME,
      called_at DATETIME,
      call_duration_seconds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      disposition TEXT NOT NULL,
      notes TEXT,
      follow_up_date DATETIME,
      called_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_seconds INTEGER DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_called_at ON leads(called_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_phone ON leads(phone_number)`,
    `CREATE INDEX IF NOT EXISTS idx_call_logs_agent ON call_logs(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_call_logs_called_at ON call_logs(called_at)`,
  ];

  if (isTurso) {
    if (typeof client.batch === 'function') {
      await client.batch(schemaStatements.map((stmt) => ({ sql: stmt, args: [] })));
    } else {
      for (const stmt of schemaStatements) {
        await client.execute(stmt);
      }
    }
  } else {
    for (const stmt of schemaStatements) {
      await db.exec(stmt);
    }
  }
}

let isInitialized = false;

async function ensureInit() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (isTurso) {
          await client.execute('SELECT 1 FROM users LIMIT 1');
        } else {
          await new Promise((resolve, reject) => {
            rawDb.get('SELECT 1 FROM users LIMIT 1', (err) => (err ? reject(err) : resolve()));
          });
        }
        isInitialized = true;
      } catch (checkErr) {
        // Table does not exist, run full schema setup
        await createSchema();
        isInitialized = true;
      }
    })();
  }
  return initPromise;
}

module.exports = db;
