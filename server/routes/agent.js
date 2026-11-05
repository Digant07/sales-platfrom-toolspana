const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAgent } = require('../middleware/auth');

// All agent routes require token + agent role
router.use(authenticateToken);
router.use(requireAgent);

// Format lead safely for the agent (strictly single record, parse JSON if present)
function sanitizeLeadForAgent(lead) {
  if (!lead) return null;
  let parsedExtra = null;
  if (lead.extra_data) {
    try {
      parsedExtra = JSON.parse(lead.extra_data);
    } catch (e) {
      parsedExtra = lead.extra_data;
    }
  }

  return {
    id: lead.id,
    lead_id_code: lead.lead_id_code,
    lead_name: lead.lead_name,
    phone_number: lead.phone_number,
    alternate_phone: lead.alternate_phone,
    company_or_details: lead.company_or_details,
    extra_data: parsedExtra,
    status: lead.status,
    locked_at: lead.locked_at,
    created_at: lead.created_at,
  };
}

// GET /api/agent/stats - Get caller's today metrics
router.get('/stats', async (req, res) => {
  try {
    const agentId = req.user.id;

    // Calls handled today by this agent
    const todayCalls = await db.get(`
      SELECT 
        COUNT(*) as total_today,
        SUM(CASE WHEN disposition = 'Answered - Interested' THEN 1 ELSE 0 END) as interested_today,
        SUM(CASE WHEN disposition = 'Call Back Later' THEN 1 ELSE 0 END) as followups_today,
        SUM(CASE WHEN disposition = 'Answered - Not Interested' THEN 1 ELSE 0 END) as not_interested_today,
        SUM(CASE WHEN disposition IN ('No Answer / Busy', 'Invalid / Wrong Number') THEN 1 ELSE 0 END) as no_answer_today,
        AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds ELSE NULL END) as avg_call_seconds
      FROM call_logs
      WHERE agent_id = ? AND date(called_at) = date('now', 'localtime')
    `, [agentId]);

    // Queue status (overall count remaining pending)
    const queueStatus = await db.get(`
      SELECT COUNT(*) as pending_count FROM leads WHERE status = 'Pending'
    `);

    return res.json({
      todayCalls: {
        total: todayCalls?.total_today || 0,
        interested: todayCalls?.interested_today || 0,
        followups: todayCalls?.followups_today || 0,
        notInterested: todayCalls?.not_interested_today || 0,
        noAnswer: todayCalls?.no_answer_today || 0,
        avgSeconds: Math.round(todayCalls?.avg_call_seconds || 0),
      },
      queueRemaining: queueStatus?.pending_count || 0,
    });
  } catch (err) {
    console.error('Agent stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch agent stats.' });
  }
});

// GET /api/agent/current-lead
// Strictly returns ONLY the active locked lead for this agent, or null if none is locked.
// Prevents skipping by refreshing the page!
router.get('/current-lead', async (req, res) => {
  try {
    const agentId = req.user.id;

    const lockedLead = await db.get(`
      SELECT *
      FROM leads
      WHERE assigned_agent_id = ? AND status = 'Locked_In_Progress'
      ORDER BY locked_at DESC
      LIMIT 1
    `, [agentId]);

    if (lockedLead) {
      return res.json({
        lead: sanitizeLeadForAgent(lockedLead),
        alreadyLocked: true,
      });
    }

    return res.json({ lead: null, alreadyLocked: false });
  } catch (err) {
    console.error('Fetch current lead error:', err);
    return res.status(500).json({ error: 'Failed to check current lead.' });
  }
});

// POST /api/agent/next-lead
// Atomic Lead Assignment:
// 1. If agent already has Locked_In_Progress lead, returns that lead (cannot skip).
// 2. Otherwise in an immediate transaction, lock the oldest Pending lead and assign to this agent.
router.post('/next-lead', async (req, res) => {
  try {
    const agentId = req.user.id;

    // Check if agent already has an active locked lead
    const existingLocked = await db.get(`
      SELECT *
      FROM leads
      WHERE assigned_agent_id = ? AND status = 'Locked_In_Progress'
      ORDER BY locked_at DESC
      LIMIT 1
    `, [agentId]);

    if (existingLocked) {
      return res.json({
        lead: sanitizeLeadForAgent(existingLocked),
        alreadyLocked: true,
        message: 'You already have an active lead in progress. Please complete notes before requesting a new lead.',
      });
    }

    // Atomic transaction to grab and lock the next pending lead
    const assignedLead = await db.transaction(async (txDb) => {
      const runner = txDb || db;
      const nextPending = await runner.get(`
        SELECT id FROM leads
        WHERE status = 'Pending'
        ORDER BY id ASC
        LIMIT 1
      `);

      if (!nextPending) {
        return null;
      }

      const now = new Date().toISOString();

      // Lock it atomically with WHERE status = 'Pending'
      const updateResult = await runner.run(`
        UPDATE leads
        SET status = 'Locked_In_Progress',
            assigned_agent_id = ?,
            locked_at = ?,
            updated_at = ?
        WHERE id = ? AND status = 'Pending'
      `, [agentId, now, now, nextPending.id]);

      if (updateResult.changes === 0) {
        return null;
      }

      // Return the locked lead
      return await runner.get('SELECT * FROM leads WHERE id = ?', [nextPending.id]);
    });

    if (!assignedLead) {
      return res.json({
        lead: null,
        message: 'Queue is currently empty! All leads have been contacted or are in progress.',
      });
    }

    return res.json({
      lead: sanitizeLeadForAgent(assignedLead),
      alreadyLocked: false,
    });
  } catch (err) {
    console.error('Assign next lead error:', err);
    return res.status(500).json({ error: 'Failed to assign next lead.' });
  }
});

// POST /api/agent/submit-lead
// Submits notes and disposition for the active lead
router.post('/submit-lead', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { lead_id, call_disposition, agent_notes, follow_up_date, call_duration_seconds } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'Lead ID is required.' });
    }

    // Verify lead is currently locked to this agent
    const lead = await db.get(`
      SELECT * FROM leads
      WHERE id = ? AND assigned_agent_id = ? AND status = 'Locked_In_Progress'
    `, [lead_id, agentId]);

    if (!lead) {
      return res.status(404).json({ error: 'Active lead not found or not locked to your session.' });
    }

    // Validation: Call Disposition
    const validDispositions = [
      'Answered - Interested',
      'Answered - Not Interested',
      'Call Back Later',
      'No Answer / Busy',
      'Invalid / Wrong Number',
    ];

    if (!call_disposition || !validDispositions.includes(call_disposition)) {
      return res.status(400).json({ error: 'Please select a valid call disposition.' });
    }

    // Note requirement gate:
    // At least 10 chars unless 'No Answer / Busy' or 'Invalid / Wrong Number'
    const notesRequiredMinLength = ['No Answer / Busy', 'Invalid / Wrong Number'].includes(call_disposition) ? 0 : 10;
    const cleanNotes = (agent_notes || '').trim();

    if (cleanNotes.length < notesRequiredMinLength) {
      return res.status(400).json({
        error: `Agent notes must contain at least ${notesRequiredMinLength} characters describing the conversation for '${call_disposition}'.`,
      });
    }

    // Determine final lead status: Follow_Up if 'Call Back Later', otherwise Completed
    const finalStatus = call_disposition === 'Call Back Later' ? 'Follow_Up' : 'Completed';
    const now = new Date().toISOString();
    const duration = parseInt(call_duration_seconds, 10) || 0;

    // Save lead update and write to call_logs in a transaction
    await db.transaction(async (txDb) => {
      const runner = txDb || db;
      await runner.run(`
        UPDATE leads
        SET status = ?,
            call_disposition = ?,
            agent_notes = ?,
            follow_up_date = ?,
            called_at = ?,
            call_duration_seconds = ?,
            updated_at = ?
        WHERE id = ?
      `, [
        finalStatus,
        call_disposition,
        cleanNotes,
        follow_up_date || null,
        now,
        duration,
        now,
        lead.id
      ]);

      await runner.run(`
        INSERT INTO call_logs (lead_id, agent_id, disposition, notes, follow_up_date, called_at, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        lead.id,
        agentId,
        call_disposition,
        cleanNotes,
        follow_up_date || null,
        now,
        duration
      ]);
    });

    return res.json({
      success: true,
      message: 'Call logged successfully.',
      completedLeadId: lead.id,
    });
  } catch (err) {
    console.error('Submit lead error:', err);
    return res.status(500).json({ error: 'Failed to submit lead notes.' });
  }
});

module.exports = router;
