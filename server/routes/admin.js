const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Multer in-memory storage for handling file uploads safely
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are supported'));
    }
  }
});

// Protect all admin routes with authentication + admin verification
router.use(authenticateToken);
router.use(requireAdmin);

// Helper function to clean and sanitize phone numbers
function sanitizePhone(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const cleaned = str.replace(/[^\d+]/g, '');
  return cleaned;
}

// ----------------------------------------------------
// 1. FILE PREVIEW & COLUMN MAPPING (EXCEL / CSV)
// ----------------------------------------------------
router.post('/leads/preview-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel (.xlsx/.xls) or CSV file.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to array of objects
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded spreadsheet is empty.' });
    }

    const headers = Object.keys(rawRows[0]);
    const previewRows = rawRows.slice(0, 5);

    // Auto-detect best column matches
    const suggestedMapping = {
      lead_name: '',
      phone_number: '',
      alternate_phone: '',
      company_or_details: '',
      lead_id_code: '',
    };

    headers.forEach((h) => {
      const lower = h.toLowerCase().trim();
      if (!suggestedMapping.lead_name && (lower.includes('name') || lower.includes('business') || lower.includes('contact person') || lower.includes('owner') || lower.includes('client'))) {
        suggestedMapping.lead_name = h;
      }
      if (!suggestedMapping.phone_number && (lower.includes('phone') || lower.includes('mobile') || lower.includes('verified contact') || lower.includes('contact no') || lower.includes('cell'))) {
        suggestedMapping.phone_number = h;
      }
      if (!suggestedMapping.alternate_phone && (lower.includes('alt') || lower.includes('desk') || lower.includes('secondary phone'))) {
        suggestedMapping.alternate_phone = h;
      }
      if (!suggestedMapping.company_or_details && (lower.includes('address') || lower.includes('product') || lower.includes('niche') || lower.includes('cluster') || lower.includes('town') || lower.includes('pitch'))) {
        suggestedMapping.company_or_details = h;
      }
      if (!suggestedMapping.lead_id_code && (lower.includes('id') || lower.includes('code') || lower.includes('lead id'))) {
        suggestedMapping.lead_id_code = h;
      }
    });

    return res.json({
      sheetName: firstSheetName,
      totalRows: rawRows.length,
      headers,
      previewRows,
      suggestedMapping,
      allRows: rawRows,
    });
  } catch (err) {
    console.error('File preview error:', err);
    return res.status(500).json({ error: 'Failed to parse spreadsheet file: ' + err.message });
  }
});

// ----------------------------------------------------
// 2. BULK IMPORT LEADS
// ----------------------------------------------------
router.post('/leads/import', async (req, res) => {
  try {
    const { rows, mapping } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No data rows provided for import.' });
    }

    if (!mapping || !mapping.lead_name || !mapping.phone_number) {
      return res.status(400).json({ error: 'Please map at least Lead Name and Phone Number columns.' });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    await db.transaction(async (txDb) => {
      const runner = txDb || db;
      for (const row of rows) {
        const leadName = String(row[mapping.lead_name] || '').trim();
        const rawPhone = String(row[mapping.phone_number] || '').trim();
        const cleanPhone = sanitizePhone(rawPhone);

        if (!leadName || !cleanPhone) {
          skippedCount++;
          continue;
        }

        const altPhone = mapping.alternate_phone ? sanitizePhone(row[mapping.alternate_phone]) : null;
        const leadIdCode = mapping.lead_id_code ? String(row[mapping.lead_id_code] || '').trim() : null;

        let companyOrDetails = '';
        if (mapping.company_or_details && row[mapping.company_or_details]) {
          companyOrDetails = String(row[mapping.company_or_details]).trim();
        }

        const extraDataObj = {};
        for (const key of Object.keys(row)) {
          if (![mapping.lead_name, mapping.phone_number, mapping.alternate_phone, mapping.lead_id_code].includes(key)) {
            extraDataObj[key] = row[key];
          }
        }

        await runner.run(`
          INSERT INTO leads (
            lead_id_code,
            lead_name,
            phone_number,
            raw_phone,
            alternate_phone,
            company_or_details,
            extra_data,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [
          leadIdCode,
          leadName,
          cleanPhone,
          rawPhone,
          altPhone,
          companyOrDetails,
          JSON.stringify(extraDataObj)
        ]);

        insertedCount++;
      }
    });

    return res.json({
      success: true,
      message: `Successfully imported ${insertedCount} leads into the dialer queue.`,
      insertedCount,
      skippedCount,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: 'Failed to import leads: ' + err.message });
  }
});

// ----------------------------------------------------
// 3. MANUAL LEAD ENTRY (Admin requirement)
// ----------------------------------------------------
router.post('/leads/manual', async (req, res) => {
  try {
    const {
      lead_name,
      phone_number,
      alternate_phone,
      company_or_details,
      lead_id_code,
      extra_fields,
    } = req.body;

    if (!lead_name || !lead_name.trim()) {
      return res.status(400).json({ error: 'Lead name is required.' });
    }

    const cleanPhone = sanitizePhone(phone_number);
    if (!cleanPhone || cleanPhone.length < 5) {
      return res.status(400).json({ error: 'A valid phone number is required.' });
    }

    const cleanAltPhone = alternate_phone ? sanitizePhone(alternate_phone) : null;
    const extraDataStr = extra_fields && typeof extra_fields === 'object' ? JSON.stringify(extra_fields) : null;

    const result = await db.run(`
      INSERT INTO leads (
        lead_id_code,
        lead_name,
        phone_number,
        raw_phone,
        alternate_phone,
        company_or_details,
        extra_data,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [
      lead_id_code ? lead_id_code.trim() : null,
      lead_name.trim(),
      cleanPhone,
      phone_number.trim(),
      cleanAltPhone,
      company_or_details ? company_or_details.trim() : null,
      extraDataStr
    ]);

    return res.json({
      success: true,
      message: 'Lead created successfully and placed in sequential queue.',
      leadId: result.lastID,
    });
  } catch (err) {
    console.error('Manual lead error:', err);
    return res.status(500).json({ error: 'Failed to create lead manually: ' + err.message });
  }
});

// ----------------------------------------------------
// 4. MASTER LEADS TABLE (Filtering, Sorting, Pagination)
// ----------------------------------------------------
router.get('/leads', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const status = req.query.status;
    const agentId = req.query.agent_id;
    const search = req.query.search ? req.query.search.trim() : '';

    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('l.status = ?');
      params.push(status);
    }

    if (agentId && agentId !== 'all') {
      whereClauses.push('l.assigned_agent_id = ?');
      params.push(agentId);
    }

    if (search) {
      whereClauses.push('(l.lead_name LIKE ? OR l.phone_number LIKE ? OR l.company_or_details LIKE ? OR l.lead_id_code LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await db.get(`SELECT COUNT(*) as total FROM leads l ${whereSql}`, params);
    const totalCount = countResult ? countResult.total : 0;

    const querySql = `
      SELECT 
        l.id,
        l.lead_id_code,
        l.lead_name,
        l.phone_number,
        l.alternate_phone,
        l.company_or_details,
        l.extra_data,
        l.status,
        l.assigned_agent_id,
        u.name as assigned_agent_name,
        l.call_disposition,
        l.agent_notes,
        l.follow_up_date,
        l.locked_at,
        l.called_at,
        l.call_duration_seconds,
        l.created_at
      FROM leads l
      LEFT JOIN users u ON l.assigned_agent_id = u.id
      ${whereSql}
      ORDER BY 
        CASE 
          WHEN l.status = 'Locked_In_Progress' THEN 1
          WHEN l.status = 'Pending' THEN 2
          WHEN l.status = 'Follow_Up' THEN 3
          ELSE 4 
        END,
        l.id ASC
      LIMIT ? OFFSET ?
    `;

    const leads = await db.all(querySql, [...params, limit, offset]);

    const parsedLeads = leads.map(lead => {
      let extra = null;
      if (lead.extra_data) {
        try { extra = JSON.parse(lead.extra_data); } catch(e) { extra = lead.extra_data; }
      }
      return { ...lead, extra_data: extra };
    });

    return res.json({
      leads: parsedLeads,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });
  } catch (err) {
    console.error('Master leads table error:', err);
    return res.status(500).json({ error: 'Failed to fetch leads.' });
  }
});

// ----------------------------------------------------
// 5. RESET / RE-QUEUE / DELETE LEAD
// ----------------------------------------------------
router.post('/leads/:id/reset', async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = await db.get('SELECT id FROM leads WHERE id = ?', [leadId]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    await db.run(`
      UPDATE leads
      SET status = 'Pending',
          assigned_agent_id = NULL,
          locked_at = NULL,
          call_disposition = NULL,
          agent_notes = NULL,
          follow_up_date = NULL,
          called_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [leadId]);

    return res.json({ success: true, message: 'Lead has been returned to Pending queue.' });
  } catch (err) {
    console.error('Reset lead error:', err);
    return res.status(500).json({ error: 'Failed to reset lead.' });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
    return res.json({ success: true, message: 'Lead deleted successfully.' });
  } catch (err) {
    console.error('Delete lead error:', err);
    return res.status(500).json({ error: 'Failed to delete lead.' });
  }
});

router.post('/leads/clear-queue', async (req, res) => {
  try {
    await db.run("DELETE FROM leads WHERE status = 'Pending'");
    return res.json({ success: true, message: 'Pending queue cleared.' });
  } catch (err) {
    console.error('Clear queue error:', err);
    return res.status(500).json({ error: 'Failed to clear queue.' });
  }
});

// ----------------------------------------------------
// 6. REAL-TIME ANALYTICS & KPIS
// ----------------------------------------------------
router.get('/analytics', async (req, res) => {
  try {
    const totalRow = await db.get('SELECT COUNT(*) as count FROM leads');
    const pendingRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE status = 'Pending'");
    const activeRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE status = 'Locked_In_Progress'");
    const completedRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE status = 'Completed'");
    const followUpRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE status = 'Follow_Up'");

    const totalLeads = totalRow?.count || 0;
    const pendingLeads = pendingRow?.count || 0;
    const activeLeads = activeRow?.count || 0;
    const completedLeads = completedRow?.count || 0;
    const followUpLeads = followUpRow?.count || 0;

    // Calls handled today across all agents
    const todayStats = await db.get(`
      SELECT 
        COUNT(*) as total_calls_today,
        AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds ELSE NULL END) as avg_duration_today
      FROM call_logs
      WHERE date(called_at) = date('now', 'localtime')
    `);

    // Disposition breakdown
    const dispositions = await db.all(`
      SELECT 
        COALESCE(call_disposition, 'Uncategorized') as disposition,
        COUNT(*) as count
      FROM leads
      WHERE status IN ('Completed', 'Follow_Up')
      GROUP BY call_disposition
    `);

    return res.json({
      kpis: {
        totalLeads,
        pendingLeads,
        activeLeads,
        completedLeads,
        followUpLeads,
        totalCallsToday: todayStats?.total_calls_today || 0,
        avgDurationToday: Math.round(todayStats?.avg_duration_today || 0),
        completionRate: totalLeads > 0 ? Math.round(((completedLeads + followUpLeads) / totalLeads) * 100) : 0,
      },
      dispositions,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// ----------------------------------------------------
// 7. AGENT PERFORMANCE & USER MANAGEMENT
// ----------------------------------------------------
router.get('/agents', async (req, res) => {
  try {
    const agents = await db.all(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.phone,
        u.is_active,
        u.created_at,
        u.last_active_at,
        (
          SELECT COUNT(*) 
          FROM call_logs 
          WHERE agent_id = u.id AND date(called_at) = date('now', 'localtime')
        ) as calls_today,
        (
          SELECT COUNT(*) 
          FROM call_logs 
          WHERE agent_id = u.id
        ) as total_calls_lifetime,
        (
          SELECT AVG(duration_seconds) 
          FROM call_logs 
          WHERE agent_id = u.id AND duration_seconds > 0
        ) as avg_duration_seconds,
        (
          SELECT l.lead_name 
          FROM leads l 
          WHERE l.assigned_agent_id = u.id AND l.status = 'Locked_In_Progress'
          LIMIT 1
        ) as active_lead_name
      FROM users u
      WHERE u.role = 'agent'
      ORDER BY calls_today DESC, u.name ASC
    `);

    const formattedAgents = agents.map(a => ({
      ...a,
      avg_duration_seconds: Math.round(a.avg_duration_seconds || 0),
      is_online: a.last_active_at && (new Date() - new Date(a.last_active_at)) < 5 * 60 * 1000,
    }));

    return res.json({ agents: formattedAgents });
  } catch (err) {
    console.error('Agent performance error:', err);
    return res.status(500).json({ error: 'Failed to fetch agents.' });
  }
});

router.post('/agents', async (req, res) => {
  try {
    const { name, username, password, phone } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required.' });
    }

    const existing = await db.get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'An agent with this username already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = await db.run(`
      INSERT INTO users (name, username, password_hash, role, phone, is_active)
      VALUES (?, ?, ?, 'agent', ?, 1)
    `, [name.trim(), username.trim().toLowerCase(), passwordHash, phone ? phone.trim() : null]);

    return res.json({
      success: true,
      message: `Agent account '${name}' created successfully.`,
      agentId: result.lastID,
    });
  } catch (err) {
    console.error('Create agent error:', err);
    return res.status(500).json({ error: 'Failed to create agent: ' + err.message });
  }
});

router.patch('/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { is_active, password } = req.body;

    const agent = await db.get("SELECT id FROM users WHERE id = ? AND role = 'agent'", [agentId]);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found.' });
    }

    if (typeof is_active !== 'undefined') {
      await db.run('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, agentId]);
    }

    if (password && password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password.trim(), salt);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, agentId]);
    }

    return res.json({ success: true, message: 'Agent updated successfully.' });
  } catch (err) {
    console.error('Update agent error:', err);
    return res.status(500).json({ error: 'Failed to update agent.' });
  }
});

// Helper for date range calculation
function getDateRangeFilter(dateRange, customStart, customEnd) {
  const now = new Date();
  if (customStart || customEnd) {
    return {
      start: customStart ? new Date(customStart).toISOString() : null,
      end: customEnd ? new Date(customEnd).toISOString() : null
    };
  }
  if (dateRange === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { start: start.toISOString(), end: null };
  } else if (dateRange === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
  } else if (dateRange === 'week') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: null };
  } else if (dateRange === 'month') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: null };
  }
  return { start: null, end: null };
}

// ----------------------------------------------------
// 7.5 CALL ACTIVITY & AUDIT LOGS (Agent Call Details & Analytics)
// ----------------------------------------------------
router.get('/call-logs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const agentId = req.query.agent_id;
    const disposition = req.query.disposition;
    const dateRange = req.query.date_range || 'all';
    const search = req.query.search ? req.query.search.trim() : '';

    const dateFilter = getDateRangeFilter(dateRange, req.query.start_date, req.query.end_date);

    let whereClauses = [];
    let params = [];

    if (agentId && agentId !== 'all') {
      whereClauses.push('cl.agent_id = ?');
      params.push(agentId);
    }

    if (disposition && disposition !== 'all') {
      whereClauses.push('cl.disposition = ?');
      params.push(disposition);
    }

    if (dateFilter.start) {
      whereClauses.push('cl.called_at >= ?');
      params.push(dateFilter.start);
    }
    if (dateFilter.end) {
      whereClauses.push('cl.called_at < ?');
      params.push(dateFilter.end);
    }

    if (search) {
      whereClauses.push('(l.lead_name LIKE ? OR l.phone_number LIKE ? OR u.name LIKE ? OR u.username LIKE ? OR cl.notes LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild, wild);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Get filtered summary metrics
    const summarySql = `
      SELECT 
        COUNT(*) as total_calls,
        COALESCE(SUM(cl.duration_seconds), 0) as total_duration_seconds,
        COALESCE(AVG(CASE WHEN cl.duration_seconds > 0 THEN cl.duration_seconds ELSE NULL END), 0) as avg_duration_seconds,
        SUM(CASE WHEN cl.disposition = 'Answered - Interested' THEN 1 ELSE 0 END) as interested_count,
        SUM(CASE WHEN cl.disposition = 'Call Back Later' THEN 1 ELSE 0 END) as callback_count,
        SUM(CASE WHEN cl.disposition = 'Answered - Not Interested' THEN 1 ELSE 0 END) as not_interested_count,
        SUM(CASE WHEN cl.disposition IN ('No Answer / Busy', 'Invalid / Wrong Number') THEN 1 ELSE 0 END) as unreachable_count
      FROM call_logs cl
      LEFT JOIN leads l ON cl.lead_id = l.id
      LEFT JOIN users u ON cl.agent_id = u.id
      ${whereSql}
    `;
    const summaryRow = await db.get(summarySql, params);

    const totalCalls = summaryRow?.total_calls || 0;
    const interestedCount = summaryRow?.interested_count || 0;
    const conversionRate = totalCalls > 0 ? Math.round((interestedCount / totalCalls) * 100) : 0;

    // 2. Agent breakdown under current filters
    const agentBreakdownSql = `
      SELECT 
        u.id as agent_id,
        u.name as agent_name,
        u.username as agent_username,
        COUNT(cl.id) as calls_count,
        COALESCE(SUM(cl.duration_seconds), 0) as total_duration_seconds,
        COALESCE(AVG(CASE WHEN cl.duration_seconds > 0 THEN cl.duration_seconds ELSE NULL END), 0) as avg_duration_seconds,
        SUM(CASE WHEN cl.disposition = 'Answered - Interested' THEN 1 ELSE 0 END) as interested_count,
        SUM(CASE WHEN cl.disposition = 'Call Back Later' THEN 1 ELSE 0 END) as callback_count
      FROM call_logs cl
      LEFT JOIN users u ON cl.agent_id = u.id
      LEFT JOIN leads l ON cl.lead_id = l.id
      ${whereSql}
      GROUP BY u.id, u.name, u.username
      ORDER BY calls_count DESC, u.name ASC
    `;
    const agentBreakdownRows = await db.all(agentBreakdownSql, params);

    // 3. Paginated call logs list
    const logsSql = `
      SELECT 
        cl.id,
        cl.lead_id,
        cl.agent_id,
        cl.disposition,
        cl.notes,
        cl.follow_up_date,
        cl.called_at,
        cl.duration_seconds,
        u.name as agent_name,
        u.username as agent_username,
        u.phone as agent_phone,
        l.lead_id_code,
        l.lead_name,
        l.phone_number,
        l.alternate_phone,
        l.company_or_details,
        l.status as lead_current_status
      FROM call_logs cl
      LEFT JOIN users u ON cl.agent_id = u.id
      LEFT JOIN leads l ON cl.lead_id = l.id
      ${whereSql}
      ORDER BY cl.called_at DESC, cl.id DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await db.all(logsSql, [...params, limit, offset]);

    return res.json({
      call_logs: logs,
      pagination: {
        page,
        limit,
        total: totalCalls,
        totalPages: Math.ceil(totalCalls / limit) || 1,
      },
      summary: {
        total_calls: totalCalls,
        total_duration_seconds: summaryRow?.total_duration_seconds || 0,
        avg_duration_seconds: Math.round(summaryRow?.avg_duration_seconds || 0),
        interested_count: interestedCount,
        callback_count: summaryRow?.callback_count || 0,
        not_interested_count: summaryRow?.not_interested_count || 0,
        unreachable_count: summaryRow?.unreachable_count || 0,
        conversion_rate: conversionRate,
      },
      agent_breakdown: agentBreakdownRows.map(a => ({
        ...a,
        avg_duration_seconds: Math.round(a.avg_duration_seconds || 0),
        conversion_rate: a.calls_count > 0 ? Math.round((a.interested_count / a.calls_count) * 100) : 0,
      })),
    });
  } catch (err) {
    console.error('Call logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch call logs: ' + err.message });
  }
});

// ----------------------------------------------------
// 7.6 EXPORT CALL AUDIT LOGS TO EXCEL (.xlsx)
// ----------------------------------------------------
router.get('/call-logs/export', async (req, res) => {
  try {
    const agentId = req.query.agent_id;
    const disposition = req.query.disposition;
    const dateRange = req.query.date_range || 'all';
    const search = req.query.search ? req.query.search.trim() : '';

    const dateFilter = getDateRangeFilter(dateRange, req.query.start_date, req.query.end_date);

    let whereClauses = [];
    let params = [];

    if (agentId && agentId !== 'all') {
      whereClauses.push('cl.agent_id = ?');
      params.push(agentId);
    }

    if (disposition && disposition !== 'all') {
      whereClauses.push('cl.disposition = ?');
      params.push(disposition);
    }

    if (dateFilter.start) {
      whereClauses.push('cl.called_at >= ?');
      params.push(dateFilter.start);
    }
    if (dateFilter.end) {
      whereClauses.push('cl.called_at < ?');
      params.push(dateFilter.end);
    }

    if (search) {
      whereClauses.push('(l.lead_name LIKE ? OR l.phone_number LIKE ? OR u.name LIKE ? OR u.username LIKE ? OR cl.notes LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild, wild);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const logsSql = `
      SELECT 
        cl.id,
        cl.lead_id,
        cl.agent_id,
        cl.disposition,
        cl.notes,
        cl.follow_up_date,
        cl.called_at,
        cl.duration_seconds,
        u.name as agent_name,
        u.username as agent_username,
        l.lead_id_code,
        l.lead_name,
        l.phone_number,
        l.alternate_phone,
        l.company_or_details
      FROM call_logs cl
      LEFT JOIN users u ON cl.agent_id = u.id
      LEFT JOIN leads l ON cl.lead_id = l.id
      ${whereSql}
      ORDER BY cl.called_at DESC, cl.id DESC
    `;
    const logs = await db.all(logsSql, params);

    const exportRows = logs.map(l => {
      const durationSec = l.duration_seconds || 0;
      const m = Math.floor(durationSec / 60);
      const s = durationSec % 60;
      const formattedDuration = `${m}m ${s < 10 ? '0' : ''}${s}s`;

      return {
        'Log ID': `CALL-${l.id}`,
        'Called Date & Time': l.called_at ? new Date(l.called_at).toLocaleString() : '',
        'Agent Name': l.agent_name || 'Unknown',
        'Agent Username': l.agent_username || '',
        'Lead Code': l.lead_id_code || `LEAD-${l.lead_id}`,
        'Lead Name': l.lead_name || 'N/A',
        'Contact Number': l.phone_number || '',
        'Alternate Contact': l.alternate_phone || '',
        'Key Details / Town': l.company_or_details || '',
        'Call Disposition': l.disposition || '',
        'Call Duration': formattedDuration,
        'Duration (Seconds)': durationSec,
        'Agent Notes': l.notes || '',
        'Follow-Up Scheduled': l.follow_up_date ? new Date(l.follow_up_date).toLocaleString() : 'None',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Call Audit Logs');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="Agent_Call_Logs_Audit_${dateStr}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Call logs export error:', err);
    return res.status(500).json({ error: 'Failed to export call logs: ' + err.message });
  }
});

// ----------------------------------------------------
// 8. ONE-CLICK EXCEL EXPORT
// ----------------------------------------------------
router.get('/leads/export', async (req, res) => {
  try {
    const querySql = `
      SELECT 
        l.id,
        l.lead_id_code,
        l.lead_name,
        l.phone_number,
        l.alternate_phone,
        l.company_or_details,
        l.status,
        l.call_disposition,
        l.agent_notes,
        u.name as assigned_agent_name,
        l.called_at,
        l.follow_up_date,
        l.call_duration_seconds,
        l.extra_data,
        l.created_at
      FROM leads l
      LEFT JOIN users u ON l.assigned_agent_id = u.id
      ORDER BY l.id ASC
    `;

    const leads = await db.all(querySql);

    // Flatten rows for clean spreadsheet export
    const exportRows = leads.map(l => {
      let extraObj = {};
      if (l.extra_data) {
        try { extraObj = JSON.parse(l.extra_data); } catch(e) {}
      }

      // Base export record with all call details
      const row = {
        'Lead ID': l.lead_id_code || `LEAD-${l.id}`,
        'Lead / Business Name': l.lead_name,
        'Phone Number': l.phone_number,
        'Alternate Phone': l.alternate_phone || '',
        'Company / Key Details': l.company_or_details || '',
        'Status': l.status,
        'Call Disposition': l.call_disposition || 'Pending',
        'Agent Notes': l.agent_notes || '',
        'Assigned Agent': l.assigned_agent_name || 'Unassigned',
        'Called At': l.called_at ? new Date(l.called_at).toLocaleString() : '',
        'Follow Up Date': l.follow_up_date ? new Date(l.follow_up_date).toLocaleString() : '',
        'Call Duration (Sec)': l.call_duration_seconds || 0,
      };

      // Merge original extra columns from Excel
      if (extraObj && typeof extraObj === 'object') {
        for (const [key, val] of Object.entries(extraObj)) {
          if (!row[key]) {
            row[key] = val !== null && val !== undefined ? String(val) : '';
          }
        }
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dialer Leads Export');

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="Sequential_Dialer_Export_${dateStr}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ error: 'Failed to export Excel file.' });
  }
});

// ----------------------------------------------------
// 9. ONE-CLICK SAMPLE SEED (Rajasthan Leads from user prompt)
// ----------------------------------------------------
router.post('/leads/seed-sample', async (req, res) => {
  try {
    const sampleLeads = [
      { idCode: 'PT-NUM-001', name: 'Savita Iron Store', phone: '+91 9649192370', alt: '', town: 'Bijolia', dist: 'Bhilwara', owner: 'Proprietor', products: 'Heavy 5"/7" Angle Grinders, Turbo Diamond Blades, Welding Rods', pitch: 'Supply high-wear cutting blades & angle grinders directly via Kota-Bhilwara delivery beat.' },
      { idCode: 'PT-NUM-002', name: 'Sarmathura Stone Industries & Tools', phone: '+91 7949224484', alt: '+91 9782277091', town: 'Sarmathura', dist: 'Dholpur', owner: 'Dinesh / Commercial Desk', products: '11E Demolition Breakers, Heavy Grinders, Diamond Saws', pitch: 'Direct B2B dispatch with specialized volume discounts on demolition chisels and diamond saws.' },
      { idCode: 'PT-NUM-003', name: 'Sadguru Stone & Tools', phone: '+91 9667177989', alt: '', town: 'Sarmathura', dist: 'Dholpur', owner: 'Rameshwar Dayal', products: '110mm Marble Cutters, 4" Grinders, Heavy Masonry Chisels', pitch: 'Pitch durable copper motor power tools with an assured spare-armature replacement warranty.' },
      { idCode: 'PT-NUM-004', name: 'Sarmathura Stone Udhog', phone: '+91 751-203262', alt: '+91 751-203650', town: 'Sarmathura', dist: 'Dholpur', owner: 'Factory In-charge', products: 'Gangsaw Blades, Bridge Cutter Spares, 9" Angle Grinders', pitch: 'Introduce factory-direct consignment stocking for high-wear cutting consumables.' },
      { idCode: 'PT-NUM-005', name: 'Pooja Furniture & Hardware House', phone: '+91 9414499836', alt: '', town: 'Bayana', dist: 'Bharatpur', owner: 'Pooja / Store Manager', products: 'Rotary Hammers, Circular Saws, Wood Planers, Impact Drills', pitch: 'Establish Bayana weekly delivery beat covering masonry and carpentry power tools.' },
      { idCode: 'PT-NUM-006', name: 'Om Choudhary Hardware', phone: '+91 8047622116', alt: '', town: 'Sikandra', dist: 'Dausa', owner: 'Om Choudhary', products: 'Cabinet Hardware, Hand Tools, Tile Cutters, 4" Angle Grinders', pitch: 'Direct B2B carton rates with 15-day rolling credit for recurring hardware and cutting tool buyers.' },
      { idCode: 'PT-NUM-007', name: 'Shri Parasnath Hardware Store', phone: '+91 8047624596', alt: '', town: 'Sikandra', dist: 'Dausa', owner: 'Store Counter', products: 'Stainless Steel Screws, Drill Bits, Hand Tools, Marble Cutters', pitch: 'Bundle fast-wearing carbon brushes and armatures with every power tool package.' },
      { idCode: 'PT-NUM-008', name: 'Shree Ambe Paints & Hardware Store', phone: '+91 8769906604', alt: '', town: 'Mokalsar', dist: 'Balotra (Barmer)', owner: 'Proprietor', products: 'Granite Bridge Cutters, 4" & 5" Grinders, Flap Discs, Polishers', pitch: 'Pitch high-torque wet stone polishers, resin polishing pads, and heavy grinding wheels.' },
      { idCode: 'PT-NUM-009', name: 'Laxmi Spare Parts & Tools', phone: '+91 9462280176', alt: '', town: 'Siwana', dist: 'Balotra (Barmer)', owner: 'Babulal / Counter Manager', products: 'Armatures, Carbon Brushes, Bearings (608/629), Rotary Hammers', pitch: 'Supply a dedicated spares counter box with bearings, switches, and copper armatures.' },
      { idCode: 'PT-NUM-010', name: 'Dhirani Enterprises', phone: '+91 7891291208', alt: '', town: 'Siwana', dist: 'Balotra (Barmer)', owner: 'Dhirani Ji', products: 'Inverter ARC Welders, Angle Grinders, Magnetic Drills', pitch: 'Guaranteed 24-hour bus/transporter parcel delivery with direct factory credit terms.' },
      { idCode: 'PT-NUM-011', name: 'Parmeshwar And Company', phone: '+91 9460460595', alt: '', town: 'Siwana', dist: 'Balotra (Barmer)', owner: 'Parmeshwar Ji', products: 'Demolition Hammers, Heavy Rotary Drills, Cut-Off Discs', pitch: 'Provide demo units of 11kg/16kg demolition breakers and free on-site contractor trials.' },
      { idCode: 'PT-NUM-012', name: 'Supertech Diamond Tools Pvt. Ltd.', phone: '+91 9414174650', alt: '+91 9414174350', town: 'Dhoinda', dist: 'Rajsamand', owner: 'Commercial Desk / Sales', products: 'Gangsaw Segments, Circular Saw Blanks, Diamond Wire Saw Beads', pitch: 'Offer OEM distributor partnerships and circular saw blanks for secondary processing units.' },
      { idCode: 'PT-NUM-013', name: 'Vaidehi Diamond Tools', phone: '+91 9667588998', alt: '', town: 'Dhoinda', dist: 'Rajsamand', owner: 'Store In-charge', products: 'Diamond Cutting Tools, Gangsaw Blades, Diamond Wire Saw Rope', pitch: 'Bulk supply contract for diamond wire rope and circular segments with tiered quantity rebates.' },
      { idCode: 'PT-NUM-014', name: 'AK Enterprises (Jain Bandhu)', phone: '+91 9413037563', alt: '', town: 'Borawar (Makrana)', dist: 'Didwana-Kuchaman (Nagaur)', owner: 'Jain Bandhu / Owner', products: 'Marble Cutting Machines, Heavy Grinders, Diamond Blades, Hardware', pitch: 'Provide specialized dust-sealed marble cutters and wet angle polishers for marble yards.' },
      { idCode: 'PT-NUM-015', name: 'M M Power Tools (M M Tools & Spare)', phone: '+91 8047845903', alt: '', town: 'Sumerpur', dist: 'Pali', owner: 'Manish / Proprietor', products: 'Electric Power Tools, Cutting Tools, Jigsaw Machines, Tool Spares', pitch: 'Appoint as authorized service & sales depot with wholesale discount on complete spares catalog.' },
      { idCode: 'PT-NUM-016', name: 'Shree Shyam Hardware', phone: '+91 8043832345', alt: '', town: 'Raisinghnagar', dist: 'Sri Ganganagar', owner: 'Proprietor', products: '9" Angle Grinders (2200W), 355mm Cut-off Saws, ARC/MIG Welders', pitch: 'Direct carton supply of heavy grinding wheels and 2200W angle grinders at factory rates.' },
      { idCode: 'PT-NUM-017', name: 'Laxmi Plywood & Hardware', phone: '+91 9166925290', alt: '', town: 'Nohar', dist: 'Hanumangarh', owner: 'Proprietor', products: 'Circular Saws, Wood Planers, 4" Grinders, Wood Routers', pitch: 'Pitch combined woodworking & metalworking tools with crop-harvest seasonal credit.' },
      { idCode: 'PT-NUM-018', name: 'Fancy Plywood & Hardware', phone: '+91 9664108109', alt: '', town: 'Nohar', dist: 'Hanumangarh', owner: 'Counter Sales', products: 'Electric Sanders, Trimmers, Cordless Screw Guns, Jigsaws', pitch: 'Offer flexible low minimum order quantity (MOQ) with free shared road-transport delivery.' },
      { idCode: 'PT-NUM-019', name: 'Maruti Plywood', phone: '+91 9950485300', alt: '', town: 'Nohar', dist: 'Hanumangarh', owner: 'Proprietor', products: 'Laminate Cutters, Wood Routers, Orbit Sanders, Hand Tools', pitch: 'Introduce dedicated carpenter-focused power tool kit with extra carbon brushes included.' },
      { idCode: 'PT-NUM-020', name: 'Hanuman Tubewell Store', phone: '+91 9982724175', alt: '', town: 'Nohar', dist: 'Hanumangarh', owner: 'Store In-charge', products: 'Pipe Threaders, Heavy Impact Wrenches, Drill Presses', pitch: 'Supply high-torque electric & pneumatic impact tools with replacement warranty.' },
      { idCode: 'PT-NUM-021', name: 'Ajay Kumar Hardware', phone: '+91 9588396099', alt: '', town: 'Nohar', dist: 'Hanumangarh', owner: 'Ajay Kumar', products: 'Angle Grinders, Marble Cutters, Hammer Drills, Discs', pitch: 'Provide direct distributor rate list with tiered volume rebates and free promotional boards.' },
      { idCode: 'PT-NUM-022', name: 'Fogla Hardware Store', phone: '+91 8043817872', alt: '', town: 'Bhadra', dist: 'Hanumangarh', owner: 'Fogla Family', products: 'Heavy Grinding Discs, Drill Presses, Spanners, Cut-off Saws', pitch: 'Offer 21-day credit terms with localized return-to-base replacement for motor burnouts.' },
      { idCode: 'PT-NUM-023', name: 'Jai Shree Hardware Store', phone: '+91 8071820543', alt: '', town: 'Nokha', dist: 'Bikaner', owner: 'Store Manager', products: '9" Angle Grinders, Blower Machines, Heavy Drills, Welding Spares', pitch: 'Establish bi-weekly Bikaner-Nokha van supply beat for power tools and industrial abrasives.' },
      { idCode: 'PT-NUM-024', name: 'Vishwkarma Power Tools & Hardware Store', phone: '+91 7597008019', alt: '', town: 'Lohawat', dist: 'Phalodi', owner: 'Vishwakarma Ji', products: 'Brushless Cordless Drills, 20V Impact Wrenches, 4" Grinders', pitch: 'Supply 20V Cordless Brushless kits (Impact Driver + Hammer Drill + 2 Batteries) in bulk.' },
      { idCode: 'PT-NUM-025', name: 'Shree Shyam Plywood & Hardware', phone: '+91 9828552743', alt: '', town: 'Phalodi', dist: 'Phalodi', owner: 'Shyam Sunder', products: 'Heavy Rotary Hammers, Demolition Breakers, Cordless Tools', pitch: 'Direct consignment stocking for solar installation tools with bulk fastener bundling.' },
      { idCode: 'PT-NUM-026', name: 'Shree Vishwakarma Trading Company', phone: '+91 9828285879', alt: '', town: 'Phalodi', dist: 'Phalodi', owner: 'Counter Manager', products: 'Cable Cutters, Heavy Crimping Tools, Angle Grinders', pitch: 'Provide demo units of high-torque impact wrenches for on-site solar tracker testing.' },
      { idCode: 'PT-NUM-027', name: 'Jai Majisa Plywood & Hardware', phone: '+91 8047517631', alt: '', town: 'Phalodi', dist: 'Phalodi', owner: 'Proprietor', products: 'Rotary Hammers, Tile Cutters, Cordless Screw Drivers, Blades', pitch: 'Pitch full range of cordless brushless tools with lithium-ion batteries and fast chargers.' },
      { idCode: 'PT-NUM-028', name: 'Ratanchand Bachhawat', phone: '+91 8306022482', alt: '', town: 'Phalodi', dist: 'Phalodi', owner: 'Bachhawat Ji', products: 'Concrete Drills, Breakers, Cut-off Machines, Core Cutters', pitch: 'Offer high-performance 11kg/16kg demolition breakers with free spare SDS-Max chisels.' },
      { idCode: 'PT-NUM-029', name: 'Kumawat Hardware', phone: '+91 7891354673', alt: '', town: 'Phalodi', dist: 'Phalodi', owner: 'Kumawat Ji', products: 'Rotary Hammers, Grinder Discs, Hand Tools, Cutting Blades', pitch: 'Provide monthly WhatsApp catalog replenishment with Jodhpur transport bilty dispatch.' },
    ];

    let count = 0;
    await db.transaction(async (txDb) => {
      const runner = txDb || db;
      for (const item of sampleLeads) {
        const extraObj = {
          'Town / Cluster': item.town,
          'District': item.dist,
          'Contact Person / Owner': item.owner,
          'Demand / Top Products': item.products,
          'Recommended Wholesale Pitch': item.pitch,
        };

        await runner.run(`
          INSERT INTO leads (
            lead_id_code,
            lead_name,
            phone_number,
            raw_phone,
            alternate_phone,
            company_or_details,
            extra_data,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [
          item.idCode,
          item.name,
          sanitizePhone(item.phone),
          item.phone,
          sanitizePhone(item.alt),
          `${item.town}, ${item.dist} | Products: ${item.products}`,
          JSON.stringify(extraObj)
        ]);
        count++;
      }
    });

    return res.json({
      success: true,
      message: `Seeded ${count} realistic Rajasthan industrial power tool leads into dialer queue.`,
      count,
    });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: 'Failed to seed sample leads.' });
  }
});

module.exports = router;
