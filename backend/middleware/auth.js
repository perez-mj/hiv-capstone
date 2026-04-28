// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// Validate secrets exist in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Check for required secrets
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production environment');
  }
} else {
  // Development warning for missing secrets
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    console.warn('⚠️  WARNING: Using default JWT secrets. This is insecure for production!');
    console.warn('⚠️  Set JWT_SECRET and JWT_REFRESH_SECRET in your .env file');
    
    // Only use defaults if explicitly allowed (for quick testing)
    if (process.env.USE_DEFAULT_JWT === 'true') {
      console.warn('⚠️  Using default secrets as ALLOWED by USE_DEFAULT_JWT flag');
      // These defaults are ONLY for development/testing
      if (!JWT_SECRET) process.env.JWT_SECRET = 'dev-default-secret-do-not-use-in-production';
      if (!JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'dev-default-refresh-secret-do-not-use-in-production';
    }
  }
}

// Token blacklist for logout functionality
// In production, replace this with Redis or a database
const tokenBlacklist = new Set();

// Clean up blacklist every hour (remove expired tokens)
setInterval(() => {
  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
        tokenBlacklist.delete(token);
      }
    } catch (error) {
      // Invalid token, remove it
      tokenBlacklist.delete(token);
    }
  }
}, 60 * 60 * 1000); // Run every hour

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET || JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

const blacklistToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      tokenBlacklist.add(token);
      // Auto-remove token from blacklist when it would have expired
      const timeToExpiry = (decoded.exp * 1000) - Date.now();
      if (timeToExpiry > 0) {
        setTimeout(() => {
          tokenBlacklist.delete(token);
        }, timeToExpiry);
      }
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access token required' 
    });
  }

  // Check if token is blacklisted
  if (isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      error: 'Token has been revoked. Please login again.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET, (err, user) => {
    if (err) {
      // Provide more specific error messages
      let errorMessage = 'Invalid or expired token';
      if (err.name === 'TokenExpiredError') {
        errorMessage = 'Token expired. Please refresh your token.';
      } else if (err.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token format';
      }
      
      return res.status(403).json({ 
        success: false,
        error: errorMessage
      });
    }
    req.user = user;
    next();
  });
};

// Async version for use with async/await patterns
const authenticateTokenAsync = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new Error('Access token required');
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      throw new Error('Token has been revoked');
    }

    const user = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    req.user = user;
    next();
  } catch (error) {
    const status = error.message === 'Access token required' ? 401 : 403;
    let errorMessage = error.message;
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expired. Please refresh your token.';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format';
    }
    
    res.status(status).json({
      success: false,
      error: errorMessage
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    // Case-insensitive role comparison
    const userRoleUpper = req.user.role?.toUpperCase();
    const hasRole = roles.some(role => role.toUpperCase() === userRoleUpper);
    
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        user_role: req.user.role,
        required_roles: roles
      });
    }
    
    next();
  };
};

// Alias for backward compatibility and cleaner route definitions
const protect = authenticateToken;

module.exports = {
  authenticateToken,
  authenticateTokenAsync,
  protect,
  authorize,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted
};