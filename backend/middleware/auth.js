// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../db');

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );

    // Get user from database with role and active status
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        username, 
        email, 
        role,
        is_active,
        last_login
      FROM users 
      WHERE id = ?`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = rows[0];

    // Check if account is active
    if (user.is_active !== 1) {
      return res.status(401).json({ 
        success: false,
        error: 'User account is inactive. Please contact administrator.' 
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      last_login: user.last_login
    };

    // Optional: Update last activity timestamp in a separate table if needed
    // await pool.execute('UPDATE users SET last_activity = NOW() WHERE id = ?', [user.id]);

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired. Please login again.' 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token. Please login again.' 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Authentication error' 
    });
  }
};

/**
 * Optional authentication - doesn't require token but attaches user if present
 */
const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );

    const [rows] = await pool.execute(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length > 0 && rows[0].is_active === 1) {
      req.user = rows[0];
    }
    
    next();
  } catch (err) {
    // Just continue without user
    next();
  }
};

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      username: user.username,
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

/**
 * Generate refresh token (longer expiry)
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Verify refresh token and generate new access token
 */
const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production'
    );

    const [rows] = await pool.execute(
      'SELECT id, username, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0 || rows[0].is_active !== 1) {
      return null;
    }

    return rows[0];
  } catch (err) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};