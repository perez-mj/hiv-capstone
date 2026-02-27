// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { comparePassword } = require('../utils/helpers');

// Validation schema for change password
const changePasswordValidation = {
  current_password: { required: true, minLength: 6 },
  new_password: { required: true, minLength: 6 },
  confirm_password: { required: true, custom: (val, body) => val === body.new_password }
};

// POST /api/auth/login - User login
router.post('/login', validate('userLogin'), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get user from database
    const [users] = await pool.execute(
      `SELECT 
        id, username, password_hash, email, role, is_active, last_login
       FROM users 
       WHERE username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    const user = users[0];

    // Check if account is active
    if (user.is_active !== 1) {
      return res.status(401).json({ 
        success: false,
        error: 'Account is inactive. Please contact administrator.' 
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log login
    await logAudit(
      user.id,
      'LOGIN',
      'users',
      user.id,
      null,
      null,
      null,
      `User ${username} logged in`,
      req
    );

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      user,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

// GET /api/auth/check - Check authentication status
router.get('/check', authenticateToken, async (req, res) => {
  try {
    // Get fresh user data
    const [users] = await pool.execute(
      `SELECT 
        id, username, email, role, is_active, last_login, created_at
       FROM users 
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check authentication status' 
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout action
    await logAudit(
      req.user.id,
      'LOGOUT',
      'users',
      req.user.id,
      null,
      null,
      null,
      `User ${req.user.username} logged out`,
      req
    );

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Logout failed' 
    });
  }
});

// ==================== FIXED: CHANGE PASSWORD ROUTE ====================
// POST /api/auth/change-password - Change password (authenticated)
router.post('/change-password', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { current_password, new_password, confirm_password } = req.body;

    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    if (new_password.length < 6) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'New password must be at least 6 characters long' 
      });
    }

    if (new_password !== confirm_password) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'New password and confirm password do not match' 
      });
    }

    console.log('Changing password for user:', req.user.id);

    // Get user with current password
    const [users] = await connection.execute(
      'SELECT id, username, password_hash, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = users[0];

    // Verify current password
    const isValidPassword = await comparePassword(current_password, user.password_hash);
    if (!isValidPassword) {
      await connection.rollback();
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // Check if new password is same as old
    const isSamePassword = await comparePassword(new_password, user.password_hash);
    if (isSamePassword) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await connection.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    // Log password change
    await logAudit(
      req.user.id,
      'PASSWORD_CHANGE',
      'users',
      req.user.id,
      null,
      null,
      null,
      `User ${user.username} changed their password`,
      req
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to change password' 
    });
  } finally {
    connection.release();
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Refresh token is required' 
      });
    }

    // Verify refresh token
    const user = await verifyRefreshToken(refreshToken);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired refresh token' 
      });
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to refresh token' 
    });
  }
});

// POST /api/auth/forgot-password - Initiate password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, username FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // For security, don't reveal that email doesn't exist
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link will be sent'
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    // Create password_resets table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Store reset token in database with expiry
    await pool.execute(
      `INSERT INTO password_resets (user_id, token, expires_at) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [user.id, resetToken]
    );

    // In production, send email with reset link
    console.log(`Password reset token for ${user.username}: ${resetToken}`);

    // Log password reset request
    await logAudit(
      user.id,
      'PASSWORD_RESET_REQUEST',
      'users',
      user.id,
      null,
      null,
      null,
      `Password reset requested for ${user.username}`,
      req
    );

    res.json({
      success: true,
      message: 'If the email exists, a password reset link will be sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process password reset request' 
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { token, new_password, confirm_password } = req.body;

    if (!token || !new_password || !confirm_password) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'Token, new password, and confirm password are required' 
      });
    }

    // Validate password strength
    if (new_password.length < 6) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    if (new_password !== confirm_password) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'Passwords do not match' 
      });
    }

    // Check if token exists and is not expired
    const [resets] = await connection.execute(
      `SELECT user_id FROM password_resets 
       WHERE token = ? AND expires_at > NOW() AND used = 0`,
      [token]
    );

    if (resets.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }

    const userId = resets[0].user_id;

    // Check if new password is same as old
    const [users] = await connection.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    const isSamePassword = await comparePassword(new_password, users[0].password_hash);
    if (isSamePassword) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await connection.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, userId]
    );

    // Mark token as used
    await connection.execute(
      'UPDATE password_resets SET used = 1 WHERE token = ?',
      [token]
    );

    // Log password reset
    await logAudit(
      userId,
      'PASSWORD_RESET',
      'users',
      userId,
      null,
      null,
      null,
      'Password reset completed',
      req
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset password' 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;