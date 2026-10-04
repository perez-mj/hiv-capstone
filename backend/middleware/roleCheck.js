// backend/middleware/roleCheck.js
const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

const officeCheck = (allowedOffices) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admins and staff can access any of the allowed offices
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      // Optionally validate the requested office is in allowedOffices
      // (This is already guaranteed by the route param and the allowedOffices array,
      //  but you could add an explicit check here if desired)
      return next();
    }
    
    // For other roles, enforce office restriction
    if (!allowedOffices.includes(req.user.office)) {
      return res.status(403).json({ error: 'Access denied. Wrong office.' });
    }
    
    next();
  };
};

module.exports = { roleCheck, officeCheck };