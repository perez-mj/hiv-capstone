// --- backend/routes/admin.js ---
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../db');
const { logAudit } = require('../utils/auditLogger');
const auth = require('../middleware/auth');

router.use(auth);

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// Simple session storage (use Redis in production)
const activeSessions = new Map();

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
router.post('/logout', async (req, res, next) => {
  try {

    const userInfo = getUserInfo(req);
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      activeSessions.delete(token);
    }

    await logAudit(null, {
      admin_user_id: userInfo.admin_user_id,
      action_type: 'LOGOUT',
      description: `Admin logged out: ${req.admin.full_name}`
    });

    res.json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/profile
router.get('/profile', async (req, res, next) => {
  try {
    res.json({ admin: req.admin });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats - System statistics
router.get('/stats', async (req, res, next) => {
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

// GET /api/admin/users - Get all admin users
router.get('/users', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, username, full_name, email, is_active, last_login, created_at, updated_at 
      FROM admin_users 
      ORDER BY created_at DESC
    `);

    res.json({ admins: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users - Create new admin user
router.post('/users', async (req, res, next) => {
  try {
    const { username, full_name, email, password, is_active = true } = req.body;

    if (!username || !full_name || !password) {
      return res.status(400).json({ error: 'Username, full name, and password are required' });
    }

    // Check if username already exists
    const [existing] = await pool.execute(
      'SELECT id FROM admin_users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO admin_users (username, full_name, email, password_hash, is_active) VALUES (?, ?, ?, ?, ?)',
      [username, full_name, email, password_hash, is_active]
    );

    // Get the created admin
    const [rows] = await pool.execute(
      'SELECT id, username, full_name, email, is_active, last_login, created_at, updated_at FROM admin_users WHERE username = ?',
      [username]
    );

    // Audit log
    const userInfo = getUserInfo(req);
    await logAudit(userInfo.admin_user_id, {
      action_type: 'ADMIN_CREATED',
      admin_user_id: userInfo.admin_user_id,
      description: `Created admin user: ${full_name} (${username})`,
      ip_address: userInfo.ip_address
    });

    res.status(201).json({ admin: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id - Update admin user
router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, email, is_active } = req.body;

    // Check if admin exists
    const [existing] = await pool.execute(
      'SELECT id, username FROM admin_users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    await pool.execute(
      'UPDATE admin_users SET full_name = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [full_name, email, is_active, parseInt(id)]
    );

    // Get the updated admin
    const [rows] = await pool.execute(
      'SELECT id, username, full_name, email, is_active, last_login, created_at, updated_at FROM admin_users WHERE id = ?',
      [id]
    );

    // Audit log
    const userInfo = getUserInfo(req);
    await logAudit(userInfo.admin_user_id, {
      action_type: 'ADMIN_UPDATED',
      admin_user_id: userInfo.admin_user_id,
      description: `Updated admin user: ${full_name} (${existing[0].username})`,
      ip_address: userInfo.ip_address
    });

    res.json({ admin: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id - Delete admin user
router.delete('/users/:id', async (req, res, next) => {
  const userInfo = getUserInfo(req);
  try {
    const { id } = req.params;

    // Check if admin exists
    const [existing] = await pool.execute(
      'SELECT id, username, full_name FROM admin_users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Prevent self-deletion
    if (parseInt(id) === userInfo.admin_user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.execute('DELETE FROM admin_users WHERE id = ?', [id]);

    // Audit log
    await logAudit(userInfo.admin_user_id, {
      action_type: 'ADMIN_DELETED',
      admin_user_id: userInfo.admin_user_id,
      description: `Deleted admin user: ${existing[0].full_name} (${existing[0].username})`,
      ip_address: userInfo.ip_address
    });

    res.json({ message: 'Admin user deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;