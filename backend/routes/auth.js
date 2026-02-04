// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for user:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if user exists - CHANGED FROM users TO users
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log('✅ User found:', user.username);

    // Check if user is active
    if (user.is_active !== 1) {
      console.log('❌ User account is inactive:', username);
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Check if password is properly hashed
    if (!user.password_hash || user.password_hash.trim() === '') {
      console.error('❌ Empty password in database for user:', username);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify password with better error handling
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

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        fullName: user.full_name,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for user:', username);

    res.json({
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        isActive: user.is_active === 1
      }
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

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );
    
    const [rows] = await pool.execute(
      'SELECT id, username, full_name, email, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    const user = rows[0];
    
    // Check if user is active
    if (user.is_active !== 1) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        isActive: user.is_active === 1
      }
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

// Optional: Logout endpoint (for client-side token invalidation)
router.post('/logout', async (req, res) => {
  // Note: This is a client-side logout. For server-side token invalidation,
  // you'd need to implement a token blacklist or use refresh tokens
  
  // Log the logout action to audit trail
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.decode(token); // Just decode without verification
      if (decoded && decoded.userId) {
        await pool.execute(
          'INSERT INTO audit_logs (action_type, user_id, description, ip_address) VALUES (?, ?, ?, ?)',
          [
            'USER_LOGOUT',
            decoded.userId,
            `User ${decoded.username} logged out`,
            req.ip
          ]
        );
      }
    }
  } catch (auditError) {
    console.error('Failed to log logout action:', auditError);
  }
  
  res.json({ message: 'Logout successful' });
});

module.exports = router;