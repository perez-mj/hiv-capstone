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

    // Check if user exists
    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log('✅ User found:', user.username);

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
      console.error('Password hash in DB:', user.password_hash);
      return res.status(500).json({ error: 'Authentication service error' });
    }
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for user:', username);

    res.json({
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        username: user.username 
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    
    const [rows] = await pool.execute(
      'SELECT id, username FROM admin_users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      user: rows[0]
    });

  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;