// backend/routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { hashPassword, maskSensitiveData, paginate } = require('../utils/helpers');

// GET /api/users - Get all users (Admin only)
router.get('/', 
  authenticateToken, 
  authorize('ADMIN'),
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, offset } = req.pagination;
      const search = req.query.search || '';
      const role = req.query.role;
      const status = req.query.status;

      let query = `
        SELECT 
          id, 
          username, 
          email, 
          role,
          is_active, 
          last_login, 
          created_at, 
          updated_at 
        FROM users 
        WHERE 1=1
      `;
      
      const queryParams = [];

      if (search) {
        query += ` AND (username LIKE ? OR email LIKE ?)`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      if (role) {
        query += ` AND role = ?`;
        queryParams.push(role);
      }

      if (status !== undefined) {
        query += ` AND is_active = ?`;
        queryParams.push(status === 'active' ? 1 : 0);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM users/,
        'SELECT COUNT(*) as total FROM users'
      );
      
      const [countResult] = await pool.execute(countQuery, queryParams);
      const total = countResult[0].total;

      // Add sorting and pagination
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      const [users] = await pool.execute(query, queryParams);

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users' 
      });
    }
});

// GET /api/users/stats - Get user statistics (Admin only)
router.get('/stats', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      // Total users
      const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
      const total = totalRows[0].count;
      
      // Active users
      const [activeRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
      const active = activeRows[0].count;
      
      // By role
      const [adminRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "ADMIN"');
      const [nurseRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "NURSE"');
      const [patientRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "PATIENT"');
      
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

      // New this month
      const [monthRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
      );
      const newThisMonth = monthRows[0].count;

      res.json({
        success: true,
        stats: {
          total: parseInt(total),
          active: parseInt(active),
          inactive: parseInt(total - active),
          byRole: {
            admin: parseInt(adminRows[0].count),
            nurse: parseInt(nurseRows[0].count),
            patient: parseInt(patientRows[0].count)
          },
          activeToday: parseInt(activeToday),
          newThisWeek: parseInt(newThisWeek),
          newThisMonth: parseInt(newThisMonth)
        }
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch user statistics' 
      });
    }
});

// GET /api/users/:id - Get single user (Admin only)
router.get('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const [users] = await pool.execute(
        `SELECT 
          id, 
          username, 
          email, 
          role,
          is_active, 
          last_login, 
          created_at, 
          updated_at 
        FROM users 
        WHERE id = ?`,
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Get user activity count
      const [activity] = await pool.execute(
        `SELECT 
          COUNT(*) as total_actions,
          COUNT(DISTINCT DATE(timestamp)) as active_days
        FROM audit_logs 
        WHERE user_id = ?`,
        [id]
      );

      const user = users[0];
      user.activity = activity[0];

      res.json({
        success: true,
        user
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch user' 
      });
    }
});

// GET /api/users/:id/activity - Get user activity log (Admin only)
router.get('/:id/activity', 
  authenticateToken, 
  authorize('ADMIN'),
  validatePagination,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page, limit, offset } = req.pagination;

      // Check if user exists
      const [user] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [id]
      );

      if (user.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Get activity logs
      const [logs] = await pool.execute(
        `SELECT 
          id, action_type, table_name, record_id, patient_id,
          description, ip_address, user_agent, timestamp
        FROM audit_logs 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?`,
        [id, limit, offset]
      );

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?',
        [id]
      );

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch user activity' 
      });
    }
});

// POST /api/users - Create new user (Admin only)
router.post('/', 
  authenticateToken, 
  authorize('ADMIN'),
  validate('userCreate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { username, password, email, role, is_active } = req.body;

      // Check if username already exists
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      
      if (existingUser.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Check if email already exists (if provided)
      if (email) {
        const [existingEmail] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );
        
        if (existingEmail.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'Email already exists'
          });
        }
      }

      // Hash password
      const password_hash = await hashPassword(password);
      
      // Create user
      const [result] = await connection.execute(
        `INSERT INTO users 
          (username, password_hash, email, role, is_active, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          username, 
          password_hash, 
          email || null, 
          role || 'PATIENT', 
          is_active !== undefined ? is_active : 1
        ]
      );

      // If creating a PATIENT user, create corresponding patient record
      if (role === 'PATIENT') {
        // You might want to create a basic patient record here
        // Or handle this separately through patient creation endpoint
      }

      // Get created user
      const [newUserRows] = await connection.execute(
        `SELECT 
          id, username, email, role, is_active, last_login, created_at, updated_at 
        FROM users 
        WHERE id = ?`,
        [result.insertId]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'USER_CREATED',
        'users',
        result.insertId,
        null,
        null,
        newUserRows[0],
        `User ${username} created by ${req.user.username}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: newUserRows[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create user' 
      });
    } finally {
      connection.release();
    }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  validate('userUpdate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { email, role, is_active } = req.body;
      
      // Check if user exists
      const [existingRows] = await connection.execute(
        'SELECT id, username, email, role FROM users WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const existingUser = existingRows[0];
      
      // Check if email already exists (if provided and changed)
      if (email && email !== existingUser.email) {
        const [emailRows] = await connection.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, id]
        );
        
        if (emailRows.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'Email already exists'
          });
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email || null);
      }
      
      if (role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(role);
      }
      
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }
      
      updateFields.push('updated_at = NOW()');
      
      // If no fields to update
      if (updateFields.length === 1) { // Only updated_at
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      // Add ID to values
      updateValues.push(id);
      
      // Execute update
      await connection.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated user
      const [updatedRows] = await connection.execute(
        `SELECT 
          id, username, email, role, is_active, last_login, created_at, updated_at 
        FROM users 
        WHERE id = ?`,
        [id]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'USER_UPDATED',
        'users',
        id,
        null,
        existingUser,
        updatedRows[0],
        `User ${existingUser.username} updated by ${req.user.username}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'User updated successfully',
        user: updatedRows[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update user' 
      });
    } finally {
      connection.release();
    }
});

// PUT /api/users/:id/toggle-status - Toggle user status (Admin only)
router.put('/:id/toggle-status', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      
      // Prevent toggling own status
      if (parseInt(id) === req.user.id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot change your own account status'
        });
      }

      // Check if user exists
      const [existingRows] = await connection.execute(
        'SELECT id, username, is_active FROM users WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const existingUser = existingRows[0];
      const newStatus = existingUser.is_active ? 0 : 1;
      
      // Update status
      await connection.execute(
        'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );

      // Get updated user
      const [updatedRows] = await connection.execute(
        `SELECT 
          id, username, email, role, is_active, last_login, created_at, updated_at 
        FROM users 
        WHERE id = ?`,
        [id]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'USER_STATUS_CHANGED',
        'users',
        id,
        null,
        { is_active: existingUser.is_active },
        { is_active: newStatus },
        `User ${existingUser.username} ${newStatus ? 'activated' : 'deactivated'} by ${req.user.username}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
        user: updatedRows[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error toggling user status:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update user status' 
      });
    } finally {
      connection.release();
    }
});

// PUT /api/users/:id/password - Change user password (Admin only)
router.put('/:id/password', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { password } = req.body;
      
      if (!password) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }

      if (password.length < 6) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
      }
      
      // Check if user exists
      const [existingRows] = await connection.execute(
        'SELECT id, username FROM users WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const existingUser = existingRows[0];
      
      // Hash new password
      const password_hash = await hashPassword(password);
      
      // Update password
      await connection.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [password_hash, id]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'USER_PASSWORD_CHANGED',
        'users',
        id,
        null,
        null,
        null,
        `Password changed for user ${existingUser.username} by ${req.user.username}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error changing password:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to change password' 
      });
    } finally {
      connection.release();
    }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      
      // Check if user exists
      const [existingRows] = await connection.execute(
        'SELECT id, username, role FROM users WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const existingUser = existingRows[0];
      
      // Prevent deleting self
      if (parseInt(id) === req.user.id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }
      
      // Check for related records based on role
      if (existingUser.role === 'PATIENT') {
        const [patientCheck] = await connection.execute(
          'SELECT id FROM patients WHERE user_id = ?',
          [id]
        );
        
        if (patientCheck.length > 0) {
          // Instead of deleting, just unlink the user from patient
          await connection.execute(
            'UPDATE patients SET user_id = NULL, updated_at = NOW() WHERE user_id = ?',
            [id]
          );
        }
      } else if (existingUser.role === 'NURSE' || existingUser.role === 'ADMIN') {
        const [staffCheck] = await connection.execute(
          'SELECT id FROM staff WHERE user_id = ?',
          [id]
        );
        
        if (staffCheck.length > 0) {
          // Delete staff record first (foreign key constraint)
          await connection.execute(
            'DELETE FROM staff WHERE user_id = ?',
            [id]
          );
        }
      }
      
      // Log the action before deletion
      await logAudit(
        req.user.id,
        'USER_DELETED',
        'users',
        id,
        null,
        existingUser,
        null,
        `User ${existingUser.username} deleted by ${req.user.username}`,
        req
      );

      // Delete user
      await connection.execute('DELETE FROM users WHERE id = ?', [id]);

      await connection.commit();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting user:', error);
      
      // Check if foreign key constraint error
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete user. There are related records. Please remove associations first.'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete user' 
      });
    } finally {
      connection.release();
    }
});

module.exports = router;