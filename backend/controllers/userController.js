// backend/controllers/userController.js
const User = require('../models/User');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const { sendResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');
const blockchainAuditService = require('../services/blockchainAuditService');

const userController = {
  // Get all users
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 100, role, is_active, search } = req.query;
      const offset = (page - 1) * limit;
      
      const filters = { role, is_active, search };
      const users = await User.getAll(filters, { limit, offset });
      const total = await User.count(filters);
      
      // Return data directly, not nested
      sendResponse(res, 200, 'Users retrieved successfully', users, {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Get user by ID
  async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return sendResponse(res, 404, 'User not found');
      }
      
      sendResponse(res, 200, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  },
  
  // Create new user
  async createUser(req, res, next) {
    try {
      const { username, password, email, role } = req.body;
      
      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return sendResponse(res, 400, 'Username already exists');
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const userId = await User.create({
        username,
        password_hash: passwordHash,
        email,
        role
      });
      
      const newUser = await User.findById(userId);
      
      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'CREATE',
        'users',
        userId,
        null, // No patient_id for user accounts
        null,
        newUser,
        `Created user account: ${username} (Role: ${role})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 201, 'User created successfully', newUser);
    } catch (error) {
      next(error);
    }
  },
  
  // Update user
  async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const { email, role, is_active } = req.body;
      
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return sendResponse(res, 404, 'User not found');
      }
      
      const updated = await User.update(userId, { email, role, is_active });
      
      if (!updated) {
        return sendResponse(res, 400, 'No changes made');
      }
      
      const updatedUser = await User.findById(userId);
      
      // Track changes for blockchain
      const changedFields = {};
      if (email !== undefined && email !== existingUser.email) {
        changedFields.email = { old: existingUser.email, new: email };
      }
      if (role !== undefined && role !== existingUser.role) {
        changedFields.role = { old: existingUser.role, new: role };
      }
      if (is_active !== undefined && is_active !== existingUser.is_active) {
        changedFields.is_active = { old: existingUser.is_active, new: is_active };
      }
      
      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'UPDATE',
        'users',
        userId,
        null,
        existingUser,
        updatedUser,
        `Updated user account: ${existingUser.username} - Changes: ${Object.keys(changedFields).join(', ')}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 200, 'User updated successfully', updatedUser);
    } catch (error) {
      next(error);
    }
  },
  
  // Delete user
  async deleteUser(req, res, next) {
    try {
      const userId = req.params.id;
      
      // Don't allow deleting own account
      if (parseInt(userId) === req.user.id) {
        return sendResponse(res, 400, 'Cannot delete your own account');
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return sendResponse(res, 404, 'User not found');
      }
      
      // Check if user has associated patient or staff records
      const patient = await Patient.findByUserId(userId);
      const staff = await Staff.findByUserId(userId);
      
      if (patient || staff) {
        return sendResponse(res, 400, 'Cannot delete user with associated patient or staff records');
      }
      
      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'DELETE',
        'users',
        userId,
        null,
        user,
        null,
        `Deleted user account: ${user.username} (Role: ${user.role})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      await User.delete(userId);
      
      sendResponse(res, 200, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;