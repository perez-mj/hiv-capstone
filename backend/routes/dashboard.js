// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('Fetching dashboard statistics...');
    
    // Get patient statistics
    const [totalPatients] = await pool.execute('SELECT COUNT(*) as total FROM patients');
    const [consentedPatients] = await pool.execute('SELECT COUNT(*) as consented FROM patients WHERE consent = TRUE');
    const [hivStats] = await pool.execute(`
      SELECT 
        SUM(CASE WHEN hiv_status = 'Reactive' THEN 1 ELSE 0 END) as reactive,
        SUM(CASE WHEN hiv_status = 'Non-Reactive' THEN 1 ELSE 0 END) as non_reactive
      FROM patients
    `);
    
    // Get daily enrollments
    const [dailyEnrollments] = await pool.execute(`
      SELECT COUNT(*) as daily_enrollments 
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    
    // Get recent audit logs
    const [recentLogs] = await pool.execute(`
      SELECT action_type, description, patient_id, timestamp 
      FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    
    // Get user statistics
    const [userStats] = await pool.execute(`
      SELECT COUNT(*) as total_users,
             SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users
      FROM users
    `);
    
    const stats = {
      patients: {
        total: parseInt(totalPatients[0].total),
        consented: parseInt(consentedPatients[0].consented),
        reactive: parseInt(hivStats[0].reactive) || 0,
        non_reactive: parseInt(hivStats[0].non_reactive) || 0,
        daily_enrollments: parseInt(dailyEnrollments[0].daily_enrollments)
      },
      users: {
        total: parseInt(userStats[0].total_users),
        active: parseInt(userStats[0].active_users)
      },
      recent_activity: recentLogs,
      last_updated: new Date().toISOString()
    };
    
    console.log('Dashboard statistics fetched successfully');
    res.json(stats);
    
  } catch (err) {
    console.error('Error fetching dashboard statistics:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/dashboard/overview - Get overview data
router.get('/overview', async (req, res) => {
  try {
    // Get enrollment trends for the last 30 days
    const [enrollmentTrends] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    // Get consent breakdown
    const [consentBreakdown] = await pool.execute(`
      SELECT 
        CASE 
          WHEN consent = TRUE THEN 'Consented'
          ELSE 'Not Consented'
        END as status,
        COUNT(*) as count
      FROM patients
      GROUP BY consent
    `);
    
    // Get HIV status breakdown
    const [hivBreakdown] = await pool.execute(`
      SELECT 
        hiv_status,
        COUNT(*) as count
      FROM patients
      GROUP BY hiv_status
    `);
    
    const overview = {
      enrollment_trends: enrollmentTrends,
      consent_breakdown: consentBreakdown,
      hiv_breakdown: hivBreakdown,
      last_30_days: enrollmentTrends.reduce((sum, day) => sum + day.count, 0)
    };
    
    res.json(overview);
    
  } catch (err) {
    console.error('Error fetching dashboard overview:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [recentActivity] = await pool.execute(`
      SELECT 
        al.action_type,
        al.description,
        al.patient_id,
        al.timestamp,
        u.username as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC 
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({
      activities: recentActivity,
      count: recentActivity.length
    });
    
  } catch (err) {
    console.error('Error fetching dashboard activity:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;