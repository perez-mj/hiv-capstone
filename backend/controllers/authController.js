// backend/controllers/authController.js
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const AuditLog = require('../models/AuditLog');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { comparePassword } = require('../utils/helpers');
const { sendResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

const authController = {
  // User login
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      // Get user from database
      const user = await User.findByUsername(username);
      
      if (!user) {
        return sendResponse(res, 401, 'Invalid username or password');
      }
      
      // Check if account is active
      if (user.is_active !== 1) {
        return sendResponse(res, 401, 'Account is inactive. Please contact administrator.');
      }
      
      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return sendResponse(res, 401, 'Invalid username or password');
      }
      
      // Update last login
      await User.updateLastLogin(user.id);
      
      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Log login
      await AuditLog.log({
        user_id: user.id,
        action_type: 'LOGIN',
        table_name: 'users',
        record_id: user.id,
        description: `User ${username} logged in`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      // Remove sensitive data
      const { password_hash, ...userWithoutPassword } = user;
      
      sendResponse(res, 200, 'Login successful', {
        user: userWithoutPassword,
        token,
        refreshToken
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Check authentication status
  async checkAuth(req, res, next) {
    try {
      // Get fresh user data
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return sendResponse(res, 401, 'User not found');
      }
      
      sendResponse(res, 200, 'Authenticated', { user });
      
    } catch (error) {
      next(error);
    }
  },
  
  // User logout
  async logout(req, res, next) {
    try {
      // Log logout action
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'LOGOUT',
        table_name: 'users',
        record_id: req.user.id,
        description: `User ${req.user.username} logged out`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Logout successful');
      
    } catch (error) {
      next(error);
    }
  },
  
  // Change password
  async changePassword(req, res, next) {
    try {
      const { current_password, new_password, confirm_password } = req.body;
      
      // Validate input
      if (!current_password || !new_password || !confirm_password) {
        return sendResponse(res, 400, 'All fields are required');
      }
      
      if (new_password.length < 6) {
        return sendResponse(res, 400, 'New password must be at least 6 characters long');
      }
      
      if (new_password !== confirm_password) {
        return sendResponse(res, 400, 'New password and confirm password do not match');
      }
      
      // Change password
      const changed = await User.changePassword(req.user.id, current_password, new_password);
      
      if (!changed) {
        return sendResponse(res, 401, 'Current password is incorrect or new password is same as old');
      }
      
      // Log password change
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'PASSWORD_CHANGE',
        table_name: 'users',
        record_id: req.user.id,
        description: `User ${req.user.username} changed their password`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Password changed successfully');
      
    } catch (error) {
      next(error);
    }
  },
  
  // Refresh JWT token
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return sendResponse(res, 400, 'Refresh token is required');
      }
      
      // Verify refresh token
      const user = await verifyRefreshToken(refreshToken);
      
      if (!user) {
        return sendResponse(res, 401, 'Invalid or expired refresh token');
      }
      
      // Generate new tokens
      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);
      
      sendResponse(res, 200, 'Token refreshed successfully', {
        token: newToken,
        refreshToken: newRefreshToken
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Initiate password reset
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return sendResponse(res, 400, 'Email is required');
      }
      
      // Check if user exists
      const user = await User.findByEmail(email);
      
      if (!user) {
        // For security, don't reveal that email doesn't exist
        return sendResponse(res, 200, 'If the email exists, a password reset link will be sent');
      }
      
      // Ensure password_resets table exists
      await PasswordReset.createTable();
      
      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      
      // Store reset token in database
      await PasswordReset.create(user.id, resetToken);
      
      // In production, send email with reset link
      console.log(`Password reset token for ${user.username}: ${resetToken}`);
      
      // Log password reset request
      await AuditLog.log({
        user_id: user.id,
        action_type: 'PASSWORD_RESET_REQUEST',
        table_name: 'users',
        record_id: user.id,
        description: `Password reset requested for ${user.username}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'If the email exists, a password reset link will be sent');
      
    } catch (error) {
      next(error);
    }
  },
  
  // Reset password with token
  async resetPassword(req, res, next) {
    try {
      const { token, new_password, confirm_password } = req.body;
      
      if (!token || !new_password || !confirm_password) {
        return sendResponse(res, 400, 'Token, new password, and confirm password are required');
      }
      
      // Validate password strength
      if (new_password.length < 6) {
        return sendResponse(res, 400, 'Password must be at least 6 characters long');
      }
      
      if (new_password !== confirm_password) {
        return sendResponse(res, 400, 'Passwords do not match');
      }
      
      // Check if token exists and is valid
      const resetRecord = await PasswordReset.findByToken(token);
      
      if (!resetRecord) {
        return sendResponse(res, 400, 'Invalid or expired token');
      }
      
      // Get user
      const user = await User.findById(resetRecord.user_id);
      if (!user) {
        return sendResponse(res, 404, 'User not found');
      }
      
      // Check if new password is same as old
      const isSamePassword = await User.verifyPassword(user.id, new_password);
      if (isSamePassword) {
        return sendResponse(res, 400, 'New password must be different from current password');
      }
      
      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(new_password, saltRounds);
      
      // Update password
      await User.updatePassword(user.id, passwordHash);
      
      // Mark token as used
      await PasswordReset.markAsUsed(token);
      
      // Log password reset
      await AuditLog.log({
        user_id: user.id,
        action_type: 'PASSWORD_RESET',
        table_name: 'users',
        record_id: user.id,
        description: 'Password reset completed',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Password reset successful');
      
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;