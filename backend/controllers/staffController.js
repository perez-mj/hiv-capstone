// backend/controllers/staffController.js
const Staff = require('../models/Staff');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

// Helper functions
const generateUsername = (firstName, lastName) => {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomNum = Math.floor(Math.random() * 1000);
  return `${cleanFirst}.${cleanLast}${randomNum}`;
};

const generateRandomPassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const staffController = {
  // Get all staff members
  async getAllStaff(req, res, next) {
  try {
    const { page = 1, limit = 100, search, position } = req.query;
    const offset = (page - 1) * limit;
    
    const filters = { search, position };
    const staff = await Staff.findAll(filters, { limit, offset });
    const total = await Staff.count(filters);
    
    // Return data directly, not nested
    sendResponse(res, 200, 'Staff members retrieved successfully', staff, {
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

  // Get staff statistics
  async getStatistics(req, res, next) {
    try {
      const stats = await Staff.getStatistics();
      sendResponse(res, 200, 'Staff statistics retrieved', stats);
    } catch (error) {
      next(error);
    }
  },

  // Get single staff member
  async getStaffById(req, res, next) {
    try {
      const { id } = req.params;
      const staff = await Staff.findById(id);
      
      if (!staff) {
        return sendResponse(res, 404, 'Staff member not found');
      }
      
      const encounterStats = await Staff.getEncounterStats(id);
      staff.encounter_stats = encounterStats;
      
      sendResponse(res, 200, 'Staff member retrieved', staff);
    } catch (error) {
      next(error);
    }
  },

  // Create staff member with user account
  async createStaffWithUser(req, res, next) {
    try {
      const { 
        first_name, last_name, middle_name, position, contact_number,
        username, password, role, email
      } = req.body;
      
      if (!first_name || !last_name) {
        return sendResponse(res, 400, 'First name and last name are required');
      }
      
      // Check if username exists
      const finalUsername = username || generateUsername(first_name, last_name);
      const existingUser = await User.findByUsername(finalUsername);
      if (existingUser) {
        return sendResponse(res, 400, 'Username already exists');
      }
      
      const finalPassword = password || generateRandomPassword();
      const passwordHash = await bcrypt.hash(finalPassword, 10);
      const finalRole = role || 'NURSE';
      
      // Create user account
      const userId = await User.create({
        username: finalUsername,
        password_hash: passwordHash,
        email: email || null,
        role: finalRole
      });
      
      // Create staff member
      const staffId = await Staff.create({
        user_id: userId,
        first_name,
        last_name,
        middle_name,
        position,
        contact_number
      });
      
      const newStaff = await Staff.findById(staffId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'STAFF_CREATED_WITH_USER',
        table_name: 'staff',
        record_id: staffId,
        new_values: newStaff,
        description: `Staff member ${first_name} ${last_name} created with user account`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      const response = {
        success: true,
        message: 'Staff member and user account created successfully',
        data: newStaff
      };
      
      if (!password) {
        response.generated_password = finalPassword;
      }
      
      sendResponse(res, 201, response.message, response.data, response.generated_password ? { generated_password: response.generated_password } : null);
    } catch (error) {
      next(error);
    }
  },

  // Create staff member (without user account)
  async createStaff(req, res, next) {
    try {
      const { user_id, first_name, last_name, middle_name, position, contact_number } = req.body;
      
      if (!first_name || !last_name) {
        return sendResponse(res, 400, 'First name and last name are required');
      }
      
      if (user_id) {
        const linked = await Staff.checkUserLinked(user_id);
        if (linked) {
          return sendResponse(res, 400, 'User is already linked to a staff member');
        }
        
        const userExists = await User.findById(user_id);
        if (!userExists) {
          return sendResponse(res, 400, 'User not found');
        }
      }
      
      const staffId = await Staff.create({
        user_id,
        first_name,
        last_name,
        middle_name,
        position,
        contact_number
      });
      
      const newStaff = await Staff.findById(staffId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'STAFF_CREATED',
        table_name: 'staff',
        record_id: staffId,
        new_values: newStaff,
        description: `Staff member ${first_name} ${last_name} created`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 201, 'Staff member created successfully', newStaff);
    } catch (error) {
      next(error);
    }
  },

  // Update staff member
  async updateStaff(req, res, next) {
    try {
      const { id } = req.params;
      const existingStaff = await Staff.findById(id);
      
      if (!existingStaff) {
        return sendResponse(res, 404, 'Staff member not found');
      }
      
      const { user_id, first_name, last_name, middle_name, position, contact_number } = req.body;
      
      if (user_id) {
        const linked = await Staff.checkUserLinked(user_id, id);
        if (linked) {
          return sendResponse(res, 400, 'User is already linked to another staff member');
        }
        
        const userExists = await User.findById(user_id);
        if (!userExists) {
          return sendResponse(res, 400, 'User not found');
        }
      }
      
      const updated = await Staff.update(id, {
        user_id,
        first_name,
        last_name,
        middle_name,
        position,
        contact_number
      });
      
      if (!updated) {
        return sendResponse(res, 400, 'No changes made');
      }
      
      const updatedStaff = await Staff.findById(id);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'STAFF_UPDATED',
        table_name: 'staff',
        record_id: id,
        old_values: existingStaff,
        new_values: updatedStaff,
        description: `Staff member ${existingStaff.first_name} ${existingStaff.last_name} updated`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Staff member updated successfully', updatedStaff);
    } catch (error) {
      next(error);
    }
  },

  // Delete staff member
  async deleteStaff(req, res, next) {
    try {
      const { id } = req.params;
      const existingStaff = await Staff.findById(id);
      
      if (!existingStaff) {
        return sendResponse(res, 404, 'Staff member not found');
      }
      
      const hasEncounters = await Staff.checkClinicalEncounters(id);
      if (hasEncounters) {
        return sendResponse(res, 400, 'Cannot delete staff member with existing clinical encounters');
      }
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'STAFF_DELETED',
        table_name: 'staff',
        record_id: id,
        old_values: existingStaff,
        description: `Staff member ${existingStaff.first_name} ${existingStaff.last_name} deleted`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      await Staff.delete(id);
      
      sendResponse(res, 200, 'Staff member deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get all positions
  async getAllPositions(req, res, next) {
    try {
      const positions = await Staff.getAllPositions();
      sendResponse(res, 200, 'Positions retrieved successfully', positions);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = staffController;