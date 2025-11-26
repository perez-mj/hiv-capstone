  // backend/routes/audit.js
  const express = require('express');
  const router = express.Router();
  const pool = require('../db');
  const auth = require('../middleware/auth');

  // Apply auth middleware to all routes
  router.use(auth);

  // GET /api/audit/logs - Get audit logs
  router.get('/logs', async (req, res, next) => {
    try {
      const { page = 1, limit = 50, action_type, patient_id } = req.query;
      const offset = (page - 1) * limit;

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

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

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
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (err) {
      next(err);
    }
  });

  // GET /api/audit/stats - Get audit statistics
  router.get('/stats', async (req, res, next) => {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          action_type,
          COUNT(*) as count,
          DATE(timestamp) as date,
          COUNT(DISTINCT patient_id) as unique_patients
        FROM audit_logs 
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY action_type, DATE(timestamp)
        ORDER BY date DESC, count DESC
      `);

      const [recentActions] = await pool.execute(`
        SELECT action_type, COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY action_type
        ORDER BY count DESC
      `);

      res.json({
        last_30_days: stats,
        last_24_hours: recentActions
      });

    } catch (err) {
      next(err);
    }
  });

module.exports = router;