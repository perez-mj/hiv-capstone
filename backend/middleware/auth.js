// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../models');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // The token might contain 'id' or 'user_id' - check both
    const userId = decoded.id || decoded.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // Fetch the FULL user instance (not just attributes)
    // This ensures all instance methods (like validatePassword) are available
    const user = await db.User.findByPk(userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is deactivated' });
    }

    // Attach the full user instance to req.user
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;