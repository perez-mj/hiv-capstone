// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/login - Unified login for all users (Admin, Nurse, Patient)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    let user = null;
    let userSource = null;

    // First attempt: Try to find user by username in users table
    const [userRows] = await pool.execute(
      'SELECT id, username, password_hash, email, role, is_active FROM users WHERE username = ?',
      [username]
    );

    if (userRows.length > 0) {
      user = userRows[0];
      userSource = 'users';
      console.log('✅ User found in users table:', user.username, 'Role:', user.role);
    } else {
      // Second attempt: Try to find user by patient_id (via patients table)
      const [patientRows] = await pool.execute(
        `SELECT u.id, u.username, u.password_hash, u.email, u.role, u.is_active,
                p.patient_id, p.first_name, p.last_name
         FROM patients p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.patient_id = ?`,
        [username]
      );

      if (patientRows.length > 0) {
        user = patientRows[0];
        userSource = 'patient';
        console.log('✅ User found via patient_id:', user.patient_id, 'Role:', user.role);
      }
    }

    // If user not found in either table
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user account is active
    if (user.is_active !== 1) {
      console.log('❌ User account is inactive:', username);
      return res.status(401).json({ error: 'Account is inactive. Please contact administrator.' });
    }

    // Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('❌ Bcrypt comparison error:', bcryptError.message);
      return res.status(500).json({ error: 'Authentication service error' });
    }
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    try {
      await pool.execute(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );
    } catch (updateError) {
      console.error('⚠️ Failed to update last login:', updateError.message);
      // Continue with login even if timestamp update fails
    }

    // Prepare user details based on role
    const userDetails = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.is_active === 1
    };

    // Add role-specific details
    if (user.role === 'ADMIN' || user.role === 'NURSE') {
      // Get staff details for admin/nurse
      const [staffRows] = await pool.execute(
        'SELECT first_name, last_name, middle_name, position FROM staff WHERE user_id = ?',
        [user.id]
      );
      
      if (staffRows.length > 0) {
        const staff = staffRows[0];
        userDetails.fullName = `${staff.first_name} ${staff.last_name}`.trim();
        userDetails.firstName = staff.first_name;
        userDetails.lastName = staff.last_name;
        userDetails.middleName = staff.middle_name;
        userDetails.position = staff.position;
      } else {
        userDetails.fullName = user.username;
      }
    } 
    else if (user.role === 'PATIENT') {
      // Get patient details
      const [patientRows] = await pool.execute(
        `SELECT patient_id, first_name, last_name, middle_name, 
                date_of_birth, gender, contact_number, address,
                hiv_status, diagnosis_date, art_start_date
         FROM patients 
         WHERE user_id = ?`,
        [user.id]
      );
      
      if (patientRows.length > 0) {
        const patient = patientRows[0];
        userDetails.patientId = patient.patient_id;
        userDetails.fullName = `${patient.first_name} ${patient.last_name}`.trim();
        userDetails.firstName = patient.first_name;
        userDetails.lastName = patient.last_name;
        userDetails.middleName = patient.middle_name;
        userDetails.dateOfBirth = patient.date_of_birth;
        userDetails.gender = patient.gender;
        userDetails.contactNumber = patient.contact_number;
        userDetails.address = patient.address;
        userDetails.hivStatus = patient.hiv_status;
        userDetails.diagnosisDate = patient.diagnosis_date;
        userDetails.artStartDate = patient.art_start_date;
      }
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role,
        // Add minimal data to token (avoid putting too much)
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Log successful login to audit trail
    try {
      await pool.execute(
        `INSERT INTO audit_logs 
         (action_type, user_id, description, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          'USER_LOGIN',
          user.id,
          `User logged in successfully from ${userSource} source`,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || null
        ]
      );
    } catch (auditError) {
      console.error('⚠️ Failed to log login action:', auditError.message);
      // Don't block login if audit log fails
    }

    console.log('✅ Login successful for:', username, 'Role:', user.role);

    res.json({
      message: 'Login successful',
      token,
      user: userDetails
    });

  } catch (err) {
    console.error('💥 Login error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed'
    });
  }
});

// GET /api/auth/check - Check if user is authenticated
router.get('/check', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );
    
    // Get user from database
    const [rows] = await pool.execute(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    const user = rows[0];
    
    // Check if user is still active
    if (user.is_active !== 1) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Prepare response based on role
    const userDetails = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.is_active === 1
    };

    // Get role-specific details
    if (user.role === 'ADMIN' || user.role === 'NURSE') {
      const [staffRows] = await pool.execute(
        'SELECT first_name, last_name FROM staff WHERE user_id = ?',
        [user.id]
      );
      if (staffRows.length > 0) {
        userDetails.fullName = `${staffRows[0].first_name} ${staffRows[0].last_name}`.trim();
      } else {
        userDetails.fullName = user.username;
      }
    } 
    else if (user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id, first_name, last_name FROM patients WHERE user_id = ?',
        [user.id]
      );
      if (patientRows.length > 0) {
        userDetails.patientId = patientRows[0].patient_id;
        userDetails.fullName = `${patientRows[0].first_name} ${patientRows[0].last_name}`.trim();
      } else {
        userDetails.fullName = user.username;
      }
    }

    res.json({
      user: userDetails
    });

  } catch (err) {
    console.error('Token verification error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// POST /api/auth/logout - Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      // Decode token without verification to get user info for audit log
      const decoded = jwt.decode(token);
      
      if (decoded && decoded.userId) {
        // Log logout action to audit trail
        await pool.execute(
          `INSERT INTO audit_logs 
           (action_type, user_id, description, ip_address, user_agent) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            'USER_LOGOUT',
            decoded.userId,
            'User logged out',
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || null
          ]
        );
      }
    }
  } catch (auditError) {
    console.error('Failed to log logout action:', auditError);
    // Don't send error to client, logout should still succeed
  }
  
  res.json({ message: 'Logout successful' });
});

// POST /api/auth/change-password - Change password (authenticated users only)
router.post('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );

    // Get user with current password hash
    const [rows] = await pool.execute(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, user.id]
    );

    // Log password change
    await pool.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, description, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'PASSWORD_CHANGE',
        user.id,
        'User changed password',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || null
      ]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (err) {
    console.error('Password change error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the old token (ignore expiration)
    let decoded;
    try {
      decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        { ignoreExpiration: true }
      );
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user still exists and is active
    const [rows] = await pool.execute(
      'SELECT id, username, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0 || rows[0].is_active !== 1) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Create new token
    const newToken = jwt.sign(
      { 
        userId: decoded.userId, 
        username: decoded.username,
        role: decoded.role
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({ token: newToken });

  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;