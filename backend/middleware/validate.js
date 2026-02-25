// backend/middleware/validate.js
const { validationSchemas } = require('../utils/validators');

/**
 * General validation middleware factory
 * @param {string} schemaName - Name of the validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schemaName, property = 'body') => {
  return async (req, res, next) => {
    try {
      // Get validation schema
      const schema = validationSchemas[schemaName];
      
      if (!schema) {
        console.error(`Validation schema '${schemaName}' not found`);
        return res.status(500).json({ 
          success: false,
          error: 'Validation configuration error' 
        });
      }

      // Validate the request data
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validation_errors: errors
        });
      }

      // Replace request data with validated and sanitized value
      req[property] = value;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Validation error' 
      });
    }
  };
};

/**
 * Validate patient ID parameter
 */
const validatePatientId = async (req, res, next) => {
  const patientId = parseInt(req.params.patientId || req.params.id);
  
  if (isNaN(patientId) || patientId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid patient ID'
    });
  }
  
  req.patientId = patientId;
  next();
};

/**
 * Validate appointment ID parameter
 */
const validateAppointmentId = async (req, res, next) => {
  const appointmentId = parseInt(req.params.appointmentId || req.params.id);
  
  if (isNaN(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid appointment ID'
    });
  }
  
  req.appointmentId = appointmentId;
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  let page = parseInt(req.query.page);
  let limit = parseInt(req.query.limit);

  // Validate and set defaults
  req.pagination = {
    page: (isNaN(page) || page < 1) ? 1 : page,
    limit: (isNaN(limit) || limit < 1 || limit > 100) ? 10 : limit
  };

  req.pagination.offset = (req.pagination.page - 1) * req.pagination.limit;
  
  next();
};

/**
 * Validate date range parameters
 */
const validateDateRange = (req, res, next) => {
  const { start_date, end_date } = req.query;
  
  req.dateRange = {};
  
  if (start_date) {
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD'
      });
    }
    req.dateRange.start_date = startDate;
  }
  
  if (end_date) {
    const endDate = new Date(end_date);
    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD'
      });
    }
    req.dateRange.end_date = endDate;
  }
  
  next();
};

/**
 * Validate file upload
 */
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
      });
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Basic XSS prevention
        obj[key] = obj[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });
    
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

module.exports = {
  validate,
  validatePatientId,
  validateAppointmentId,
  validatePagination,
  validateDateRange,
  validateFileUpload,
  sanitizeInput
};