// backend/utils/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ 
      error: 'Duplicate entry',
      details: 'A record with this information already exists'
    });
  }

  // Foreign key constraint errors
  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(404).json({ 
      error: 'Referenced record not found',
      details: 'The referenced patient does not exist'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token'
    });
  }

  // Default error
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
};

module.exports = errorHandler;