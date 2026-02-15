// backend/routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to verify admin authentication
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );
    
    // Check if user exists and is active
    const [rows] = await pool.execute(
      'SELECT id, username, full_name, email, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    const user = rows[0];
    
    if (user.is_active !== 1) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (err) {
    console.error('Token verification error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// GET /api/users - Get all users
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        username, 
        full_name, 
        email, 
        is_active, 
        last_login, 
        created_at, 
        updated_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      admins: rows
    });

  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
});

// GET /api/users/stats - Get user statistics
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    // Total users
    const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const total = totalRows[0].count;
    
    // Active users
    const [activeRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const active = activeRows[0].count;
    
    // Active today
    const [todayRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE DATE(last_login) = CURDATE()'
    );
    const activeToday = todayRows[0].count;
    
    // New this week
    const [weekRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );
    const newThisWeek = weekRows[0].count;

    res.json({
      success: true,
      stats: {
        total: parseInt(total),
        active: parseInt(active),
        activeToday: parseInt(activeToday),
        newThisWeek: parseInt(newThisWeek)
      }
    });

  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user statistics' 
    });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        username, 
        full_name, 
        email, 
        is_active, 
        last_login, 
        created_at, 
        updated_at 
       FROM users 
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      admin: rows[0]
    });

  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user' 
    });
  }
});

// POST /api/users - Create new user
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { username, password, full_name, email, is_active } = req.body;
    
    // Validate required fields
    if (!username || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, and full name are required'
      });
    }

    // Check if username already exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const [existingEmail] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users 
        (username, password_hash, full_name, email, is_active) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        username, 
        password_hash, 
        full_name, 
        email || null, 
        is_active !== undefined ? is_active : 1
      ]
    );

    // Get created user
    const [newUserRows] = await pool.execute(
      `SELECT 
        id, 
        username, 
        full_name, 
        email, 
        is_active, 
        last_login, 
        created_at, 
        updated_at 
       FROM users 
       WHERE id = ?`,
      [result.insertId]
    );

    // Log the action
    await pool.execute(
      `INSERT INTO audit_logs 
        (action_type, user_id, description, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [
        'USER_CREATED',
        req.user.id,
        `User ${full_name} (@${username}) created by ${req.user.username}`,
        req.ip
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      admin: newUserRows[0]
    });

  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user' 
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, is_active } = req.body;
    
    // Check if user exists
    const [existingRows] = await pool.execute(
      'SELECT id, username, email FROM users WHERE id = ?',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const existingUser = existingRows[0];
    
    // Check if email already exists (if provided and changed)
    if (email && email !== existingUser.email) {
      const [emailRows] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (emailRows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email || null);
    }
    
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    
    // Always update the timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    // Add ID to values
    updateValues.push(id);
    
    // Execute update
    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated user
    const [updatedRows] = await pool.execute(
      `SELECT 
        id, 
        username, 
        full_name, 
        email, 
        is_active, 
        last_login, 
        created_at, 
        updated_at 
       FROM users 
       WHERE id = ?`,
      [id]
    );

    // Log the action
    await pool.execute(
      `INSERT INTO audit_logs 
        (action_type, user_id, description, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [
        'USER_UPDATED',
        req.user.id,
        `User ${updatedRows[0].full_name} (@${updatedRows[0].username}) updated by ${req.user.username}`,
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      admin: updatedRows[0]
    });

  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user' 
    });
  }
});

// PUT /api/users/:id/toggle-status - Toggle user status
router.put('/:id/toggle-status', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent toggling own status
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own account status'
      });
    }

    // Check if user exists
    const [existingRows] = await pool.execute(
      'SELECT id, username, full_name, is_active FROM users WHERE id = ?',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const existingUser = existingRows[0];
    const newStatus = existingUser.is_active ? 0 : 1;
    
    // Update status
    await pool.execute(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    // Get updated user
    const [updatedRows] = await pool.execute(
      `SELECT 
        id, 
        username, 
        full_name, 
        email, 
        is_active, 
        last_login, 
        created_at, 
        updated_at 
       FROM users 
       WHERE id = ?`,
      [id]
    );

    // Log the action
    await pool.execute(
      `INSERT INTO audit_logs 
        (action_type, user_id, description, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [
        'USER_STATUS_CHANGED',
        req.user.id,
        `User ${existingUser.full_name} (@${existingUser.username}) ${newStatus ? 'activated' : 'deactivated'} by ${req.user.username}`,
        req.ip
      ]
    );

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      admin: updatedRows[0]
    });

  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user status' 
    });
  }
});

// PUT /api/users/:id/password - Change user password
router.put('/:id/password', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    // Check if user exists
    const [existingRows] = await pool.execute(
      'SELECT id, username, full_name FROM users WHERE id = ?',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const existingUser = existingRows[0];
    
    // Hash new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [password_hash, id]
    );

    // Log the action
    await pool.execute(
      `INSERT INTO audit_logs 
        (action_type, user_id, description, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [
        'USER_PASSWORD_CHANGED',
        req.user.id,
        `Password changed for user ${existingUser.full_name} (@${existingUser.username}) by ${req.user.username}`,
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change password' 
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const [existingRows] = await pool.execute(
      'SELECT id, username, full_name FROM users WHERE id = ?',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const existingUser = existingRows[0];
    
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }
    
    // Delete user
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    // Log the action
    await pool.execute(
      `INSERT INTO audit_logs 
        (action_type, user_id, description, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [
        'USER_DELETED',
        req.user.id,
        `User ${existingUser.full_name} (@${existingUser.username}) deleted by ${req.user.username}`,
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user' 
    });
  }
});

module.exports = router;