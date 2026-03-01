// backend/routes/staff.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { paginate } = require('../utils/helpers');

// GET /api/staff - Get all staff members (Admin only)
router.get('/', 
  authenticateToken, 
  authorize('ADMIN'),
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, offset } = req.pagination;
      // Convert to integers for LIMIT/OFFSET
      const limitNum = parseInt(limit) || 100;
      const offsetNum = parseInt(offset) || 0;
      
      const search = req.query.search || '';
      const position = req.query.position;

      let query = `
        SELECT 
          s.*,
          u.username,
          u.email,
          u.role,
          u.is_active as user_active,
          u.last_login
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];

      if (search) {
        query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.middle_name LIKE ? OR s.position LIKE ? OR s.contact_number LIKE ?)`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (position) {
        query += ` AND s.position = ?`;
        queryParams.push(position);
      }

      // Get total count - clone the WHERE conditions for count query
      let countQuery = 'SELECT COUNT(*) as total FROM staff s WHERE 1=1';
      const countParams = [...queryParams];
      
      // Reconstruct the WHERE clauses for count query
      if (search) {
        countQuery += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.middle_name LIKE ? OR s.position LIKE ? OR s.contact_number LIKE ?)`;
        // countParams already has the search patterns from above
      }
      if (position) {
        countQuery += ` AND s.position = ?`;
      }
      
      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Add sorting and pagination - LIMIT and OFFSET must be added directly, not as parameters
      query += ` ORDER BY s.last_name ASC, s.first_name ASC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [staff] = await pool.execute(query, queryParams);

      res.json({
        success: true,
        data: staff,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch staff members' 
      });
    }
});

// GET /api/staff/stats - Get staff statistics (Admin only)
router.get('/stats', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      // Total staff
      const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM staff');
      const total = totalRows[0].count;
      
      // Staff with linked users
      const [linkedRows] = await pool.execute('SELECT COUNT(*) as count FROM staff WHERE user_id IS NOT NULL');
      const linked = linkedRows[0].count;
      
      // Staff without linked users
      const [unlinkedRows] = await pool.execute('SELECT COUNT(*) as count FROM staff WHERE user_id IS NULL');
      const unlinked = unlinkedRows[0].count;
      
      // By position (top 10 positions)
      const [positionRows] = await pool.execute(
        'SELECT position, COUNT(*) as count FROM staff WHERE position IS NOT NULL GROUP BY position ORDER BY count DESC LIMIT 10'
      );
      
      // New this week
      const [weekRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM staff WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
      );
      const newThisWeek = weekRows[0].count;

      // New this month
      const [monthRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM staff WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
      );
      const newThisMonth = monthRows[0].count;

      res.json({
        success: true,
        stats: {
          total: parseInt(total),
          linked: parseInt(linked),
          unlinked: parseInt(unlinked),
          byPosition: positionRows.map(row => ({
            position: row.position,
            count: parseInt(row.count)
          })),
          newThisWeek: parseInt(newThisWeek),
          newThisMonth: parseInt(newThisMonth)
        }
      });

    } catch (error) {
      console.error('Error fetching staff stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch staff statistics' 
      });
    }
});

// GET /api/staff/:id - Get single staff member (Admin only)
router.get('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const [staff] = await pool.execute(
        `SELECT 
          s.*,
          u.username,
          u.email,
          u.role,
          u.is_active as user_active,
          u.last_login
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [id]
      );

      if (staff.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Staff member not found' 
        });
      }

      // Get clinical encounters count
      const [encounters] = await pool.execute(
        `SELECT 
          COUNT(*) as total_encounters,
          COUNT(DISTINCT patient_id) as unique_patients
        FROM clinical_encounters 
        WHERE staff_id = ?`,
        [id]
      );

      const staffMember = staff[0];
      staffMember.encounter_stats = encounters[0];

      res.json({
        success: true,
        data: staffMember
      });

    } catch (error) {
      console.error('Error fetching staff member:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch staff member' 
      });
    }
});

// POST /api/staff/with-user - Create new staff member with user account (Admin only)
router.post('/with-user', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { 
        first_name, 
        last_name, 
        middle_name, 
        position, 
        contact_number,
        username,
        password,
        role,
        email
      } = req.body;

      console.log('Creating staff member with user account:', { 
        first_name, 
        last_name, 
        position,
        username,
        role
      });

      // Validate required fields
      if (!first_name || !last_name) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'First name and last name are required'
        });
      }

      // Check if username already exists (if provided)
      if (username) {
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
      }

      // Generate username if not provided
      const finalUsername = username || generateUsername(first_name, last_name);
      
      // Generate random password if not provided
      const finalPassword = password || generateRandomPassword();
      
      // Hash password
      const bcrypt = require('bcryptjs');
      const password_hash = await bcrypt.hash(finalPassword, 10);
      
      // Set default role if not provided
      const finalRole = role || 'NURSE';

      // Create user account first
      const [userResult] = await connection.execute(
        `INSERT INTO users 
          (username, password_hash, email, role, is_active, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          finalUsername, 
          password_hash, 
          email || null, 
          finalRole, 
          1 // is_active = true
        ]
      );
      
      const userId = userResult.insertId;
      console.log("User created with ID:", userId);

      // Check if user_id already exists in staff table
      const [existingStaff] = await connection.execute(
        'SELECT id FROM staff WHERE user_id = ?',
        [userId]
      );
      
      if (existingStaff.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'User is already linked to a staff member'
        });
      }

      // Create staff member linked to the user
      const [staffResult] = await connection.execute(
        `INSERT INTO staff 
          (user_id, first_name, last_name, middle_name, position, contact_number, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId, 
          first_name, 
          last_name, 
          middle_name || null, 
          position || null, 
          contact_number || null
        ]
      );
      
      console.log("Staff member created with ID:", staffResult.insertId);

      // Get created staff member with user details
      const [newStaffRows] = await connection.execute(
        `SELECT 
          s.*,
          u.username,
          u.email,
          u.role,
          u.is_active as user_active,
          u.last_login
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [staffResult.insertId]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'STAFF_CREATED_WITH_USER',
        'staff',
        staffResult.insertId,
        null,
        null,
        newStaffRows[0],
        `Staff member ${first_name} ${last_name} created with user account by ${req.user.username}`,
        req
      );

      await connection.commit();

      // Return the created password only if it was auto-generated
      const response = {
        success: true,
        message: 'Staff member and user account created successfully',
        data: newStaffRows[0]
      };

      // Include the generated password in the response if it was auto-generated
      if (!password) {
        response.generated_password = finalPassword;
      }

      res.status(201).json(response);

    } catch (error) {
      await connection.rollback();
      console.error('Error creating staff member with user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create staff member' 
      });
    } finally {
      connection.release();
    }
});

// Helper function to generate username
function generateUsername(firstName, lastName) {
  // Clean the names (remove special characters, convert to lowercase)
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Generate base username
  let baseUsername = `${cleanFirst}.${cleanLast}`;
  
  // Add random numbers to ensure uniqueness
  const randomNum = Math.floor(Math.random() * 1000);
  return `${baseUsername}${randomNum}`;
}

// Helper function to generate random password
function generateRandomPassword(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/staff - Create new staff member (Admin only)
router.post('/', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { 
        user_id, 
        first_name, 
        last_name, 
        middle_name, 
        position, 
        contact_number 
      } = req.body;

      console.log('Creating staff member with data:', { 
        user_id, 
        first_name, 
        last_name, 
        middle_name, 
        position, 
        contact_number 
      });

      // Validate required fields
      if (!first_name || !last_name) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'First name and last name are required'
        });
      }

      // Check if user_id already exists in staff table (if provided)
      if (user_id) {
        const [existingStaff] = await connection.execute(
          'SELECT id FROM staff WHERE user_id = ?',
          [user_id]
        );
        
        if (existingStaff.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'User is already linked to a staff member'
          });
        }

        // Check if user exists
        const [userExists] = await connection.execute(
          'SELECT id, username FROM users WHERE id = ?',
          [user_id]
        );

        if (userExists.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'User not found'
          });
        }
      }

      // Create staff member
      const [result] = await connection.execute(
        `INSERT INTO staff 
          (user_id, first_name, last_name, middle_name, position, contact_number, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          user_id || null, 
          first_name, 
          last_name, 
          middle_name || null, 
          position || null, 
          contact_number || null
        ]
      );
      
      console.log("Staff member created with ID:", result.insertId);

      // Get created staff member
      const [newStaffRows] = await connection.execute(
        `SELECT 
          s.*,
          u.username,
          u.email,
          u.role,
          u.is_active as user_active,
          u.last_login
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [result.insertId]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'STAFF_CREATED',
        'staff',
        result.insertId,
        null,
        null,
        newStaffRows[0],
        `Staff member ${first_name} ${last_name} created by ${req.user.username}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: newStaffRows[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating staff member:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create staff member' 
      });
    } finally {
      connection.release();
    }
});

// PUT /api/staff/:id - Update staff member (Admin only)
router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { user_id, first_name, last_name, middle_name, position, contact_number } = req.body;
      
      // Check if staff member exists
      const [existingRows] = await connection.execute(
        'SELECT id, first_name, last_name FROM staff WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        });
      }

      const existingStaff = existingRows[0];
      
      // Check if user_id already exists in another staff record (if provided)
      if (user_id) {
        const [existingStaff] = await connection.execute(
          'SELECT id FROM staff WHERE user_id = ? AND id != ?',
          [user_id, id]
        );
        
        if (existingStaff.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'User is already linked to another staff member'
          });
        }

        // Check if user exists
        if (user_id) {
          const [userExists] = await connection.execute(
            'SELECT id, username FROM users WHERE id = ?',
            [user_id]
          );

          if (userExists.length === 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              error: 'User not found'
            });
          }
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      
      if (user_id !== undefined) {
        updateFields.push('user_id = ?');
        updateValues.push(user_id || null);
      }
      
      if (first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(first_name);
      }
      
      if (last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(last_name);
      }
      
      if (middle_name !== undefined) {
        updateFields.push('middle_name = ?');
        updateValues.push(middle_name || null);
      }
      
      if (position !== undefined) {
        updateFields.push('position = ?');
        updateValues.push(position || null);
      }
      
      if (contact_number !== undefined) {
        updateFields.push('contact_number = ?');
        updateValues.push(contact_number || null);
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
        `UPDATE staff SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated staff member
      const [updatedRows] = await connection.execute(
        `SELECT 
          s.*,
          u.username,
          u.email,
          u.role,
          u.is_active as user_active,
          u.last_login
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [id]
      );

      // Log the action
      await logAudit(
        req.user.id,
        'STAFF_UPDATED',
        'staff',
        id,
        null,
        existingStaff,
        updatedRows[0],
        `Staff member ${existingStaff.first_name} ${existingStaff.last_name} updated by ${req.user.username}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Staff member updated successfully',
        data: updatedRows[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating staff member:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update staff member' 
      });
    } finally {
      connection.release();
    }
});

// DELETE /api/staff/:id - Delete staff member (Admin only)
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      
      // Check if staff member exists
      const [existingRows] = await connection.execute(
        'SELECT id, first_name, last_name, user_id FROM staff WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        });
      }

      const existingStaff = existingRows[0];
      
      // Check for related records in clinical_encounters
      const [encounterCheck] = await connection.execute(
        'SELECT id FROM clinical_encounters WHERE staff_id = ? LIMIT 1',
        [id]
      );
      
      if (encounterCheck.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot delete staff member with existing clinical encounters. Please reassign or delete encounters first.'
        });
      }
      
      // Log the action before deletion
      await logAudit(
        req.user.id,
        'STAFF_DELETED',
        'staff',
        id,
        null,
        existingStaff,
        null,
        `Staff member ${existingStaff.first_name} ${existingStaff.last_name} deleted by ${req.user.username}`,
        req
      );

      // Delete staff member
      await connection.execute('DELETE FROM staff WHERE id = ?', [id]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Staff member deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting staff member:', error);
      
      // Check if foreign key constraint error
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete staff member. There are related records. Please remove associations first.'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete staff member' 
      });
    } finally {
      connection.release();
    }
});

// GET /api/staff/positions/list - Get all unique positions (Admin only)
router.get('/positions/list', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const [positions] = await pool.execute(
        `SELECT DISTINCT position 
         FROM staff 
         WHERE position IS NOT NULL AND position != '' 
         ORDER BY position`
      );

      res.json({
        success: true,
        data: positions.map(p => p.position)
      });

    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch positions' 
      });
    }
});

module.exports = router;