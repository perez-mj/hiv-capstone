// --- backend/routes/admin.js ---
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../db');
const { logAudit } = require('../utils/auditLogger');

// Simple session storage (use Redis in production)
const activeSessions = new Map();

// Middleware to verify admin authentication
const authenticateAdmin = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  const session = activeSessions.get(token);
  req.admin = session.admin;
  next();
};

// POST /api/admin/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (rows.length === 0) {
      await logAudit(null, {
        action_type: 'LOGIN_FAILED',
        description: `Failed login attempt for username: ${username}`,
        ip_address: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      await logAudit(null, {
        action_type: 'LOGIN_FAILED',
        description: `Failed login attempt for username: ${username}`,
        ip_address: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session token
    const token = require('crypto').randomBytes(32).toString('hex');
    activeSessions.set(token, { 
      admin: { id: admin.id, username: admin.username, full_name: admin.full_name },
      loginTime: new Date()
    });

    // Update last login
    await pool.execute(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [admin.id]
    );

    // Audit log
    await logAudit(null, {
      admin_user_id: admin.id,
      action_type: 'LOGIN_SUCCESS',
      description: `Admin logged in: ${admin.full_name} (${admin.username})`,
      ip_address: req.ip
    });

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name
      }
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/admin/logout
router.post('/logout', authenticateAdmin, async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      activeSessions.delete(token);
    }

    await logAudit(null, {
      admin_user_id: req.admin.id,
      action_type: 'LOGOUT',
      description: `Admin logged out: ${req.admin.full_name}`
    });

    res.json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/profile
router.get('/profile', authenticateAdmin, async (req, res, next) => {
  try {
    res.json({ admin: req.admin });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats - System statistics
router.get('/stats', authenticateAdmin, async (req, res, next) => {
  try {
    const [patientStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN consent_status = 'YES' THEN 1 END) as consented_patients,
        COUNT(CASE WHEN hiv_status = 'Reactive' THEN 1 END) as reactive_patients,
        COUNT(CASE WHEN hiv_status = 'Non-Reactive' THEN 1 END) as non_reactive_patients
       FROM patients`
    );

    const [dltStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_hashes,
        COUNT(CASE WHEN verified = TRUE THEN 1 END) as verified_hashes
       FROM dlt_hashes`
    );

    const [biometricStats] = await pool.execute(
      `SELECT COUNT(*) as active_biometric_links FROM biometric_links WHERE is_active = TRUE`
    );

    res.json({
      patients: patientStats[0],
      dlt: dltStats[0],
      biometric: biometricStats[0],
      system_uptime: process.uptime()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;