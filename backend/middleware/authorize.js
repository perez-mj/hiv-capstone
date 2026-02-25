// backend/middleware/authorize.js
/**
 * Role-based authorization middleware factory
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Insufficient permissions.',
        required_roles: allowedRoles,
        user_role: req.user.role
      });
    }

    next();
  };
};

/**
 * Resource ownership check middleware
 * Checks if the user owns the resource or has admin privileges
 * @param {Function} getResourceOwnerId - Async function to get owner ID from request
 */
const authorizeOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // Admin can access any resource
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Get resource owner ID
      const ownerId = await getResourceOwnerId(req);
      
      // For PATIENT role, check if they own the resource
      if (req.user.role === 'PATIENT') {
        // Get patient ID associated with this user
        const [patient] = await req.db.execute(
          'SELECT id FROM patients WHERE user_id = ?',
          [req.user.id]
        );

        if (patient.length === 0) {
          return res.status(403).json({ 
            success: false,
            error: 'No patient profile associated with this user' 
          });
        }

        if (patient[0].id !== ownerId) {
          return res.status(403).json({ 
            success: false,
            error: 'Access denied. You do not own this resource.' 
          });
        }
      }

      // For NURSE role, check if they have access (customize as needed)
      if (req.user.role === 'NURSE') {
        // Add any nurse-specific access logic here
        // For now, allow nurses to access all resources
        return next();
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error checking resource ownership' 
      });
    }
  };
};

/**
 * Permission-based authorization middleware
 * @param {string} permission - Required permission
 */
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Define role-based permissions
      const rolePermissions = {
        ADMIN: ['*'], // Admin has all permissions
        NURSE: [
          'view:patients',
          'create:patients',
          'edit:patients',
          'view:appointments',
          'create:appointments',
          'edit:appointments',
          'view:lab_results',
          'create:lab_results',
          'edit:lab_results',
          'view:encounters',
          'create:encounters',
          'edit:encounters',
          'manage:queue'
        ],
        PATIENT: [
          'view:own_profile',
          'view:own_appointments',
          'view:own_lab_results',
          'view:own_encounters',
          'view:own_queue'
        ]
      };

      // Check if user has required permission
      const userPermissions = rolePermissions[req.user.role] || [];
      
      if (userPermissions.includes('*') || userPermissions.includes(permission)) {
        return next();
      }

      return res.status(403).json({ 
        success: false,
        error: `Access denied. Required permission: ${permission}` 
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error checking permissions' 
      });
    }
  };
};

/**
 * IP whitelist middleware (for sensitive operations)
 * @param {Array} allowedIPs - List of allowed IP addresses
 */
const ipWhitelist = (allowedIPs) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.includes(clientIP) || allowedIPs.includes('*')) {
      return next();
    }

    return res.status(403).json({ 
      success: false,
      error: 'Access denied from this IP address' 
    });
  };
};

module.exports = {
  authorize,
  authorizeOwnership,
  hasPermission,
  ipWhitelist
};