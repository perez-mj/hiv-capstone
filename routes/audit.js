// backend/routes/audit.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/audit/logs - Get audit logs
router.get('/logs', async (req, res, next) => {
  try {
    // Parse safely \u2014 handle empty strings, nulls, NaNs
    const page = Number(req.query.page) || 1;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // Validate integers
    if (!Number.isInteger(page) || !Number.isInteger(limit) || !Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }
    const { action_type, patient_id } = req.query;

    let query = `
      SELECT * FROM audit_logs 
      WHERE 1=1
    `;
    const params = [];

    if (action_type) {
      query += ' AND action_type = ?';
      params.push(action_type);
    }

    if (patient_id) {
      query += ' AND patient_id = ?';
      params.push(patient_id);
    }

    query += ` ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;


    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];

    if (action_type) {
      countQuery += ' AND action_type = ?';
      countParams.push(action_type);
    }

    if (patient_id) {
      countQuery += ' AND patient_id = ?';
      countParams.push(patient_id);
    }

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    res.json({
      logs: rows,
      pagination: {
        page: page,
        limit: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/audit/stats - Get audit statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [last30Days] = await pool.execute(`
      SELECT 
        action_type,
        COUNT(*) as count,
        DATE(timestamp) as date
      FROM audit_logs 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY action_type, DATE(timestamp)
      ORDER BY date DESC, count DESC
    `);

    const [last24Hours] = await pool.execute(`
      SELECT 
        action_type, 
        COUNT(*) as count
      FROM audit_logs 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY action_type
      ORDER BY count DESC
    `);

    res.json({
      last_30_days: last30Days,
      last_24_hours: last24Hours
    });

  } catch (err) {
    console.error('Error fetching audit stats:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;