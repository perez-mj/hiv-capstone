/**
 * Standard API response handler - ALIGNED WITH FRONTEND http.js
 * Frontend http.js interceptor returns response.data automatically
 * So we should return data directly without double nesting
 */

const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    message,
    timestamp: new Date().toISOString()
  };
  
  // If data exists, attach it directly (not wrapped in another data property)
  if (data !== null) {
    response.data = data;
  }
  
  if (meta !== null) {
    response.meta = meta;
  }
  
  return res.status(statusCode).json(response);
};

// Success responses - Return data directly in response.data
const sendSuccess = (res, message = 'Operation successful', data = null) => {
  return sendResponse(res, 200, message, data);
};

const sendCreated = (res, message = 'Resource created successfully', data = null) => {
  return sendResponse(res, 201, message, data);
};

const sendNoContent = (res) => {
  return res.status(204).send();
};

// Error responses
const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendResponse(res, 400, message, null, errors);
};

const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendResponse(res, 401, message);
};

const sendForbidden = (res, message = 'Access forbidden') => {
  return sendResponse(res, 403, message);
};

const sendNotFound = (res, message = 'Resource not found') => {
  return sendResponse(res, 404, message);
};

const sendConflict = (res, message = 'Resource conflict') => {
  return sendResponse(res, 409, message);
};

const sendValidationError = (res, message = 'Validation failed', errors = null) => {
  return sendResponse(res, 422, message, null, errors);
};

const sendServerError = (res, message = 'Internal server error', error = null) => {
  return sendResponse(res, 500, message, null, error);
};

// Paginated response - returns data array with pagination in meta
const sendPaginated = (res, data, pagination, message = 'Data retrieved successfully') => {
  const safeData = Array.isArray(data) ? data : [];
  
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data: safeData,  // Frontend will get this as response.data
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 100,
      total: pagination.total || 0,
      total_pages: pagination.total_pages || 0,
      has_next: (pagination.page || 1) < (pagination.total_pages || 0),
      has_previous: (pagination.page || 1) > 1
    }
  };

  return res.status(200).json(response);
};

const sendBulkResponse = (res, results, message = 'Bulk operation completed') => {
  const statusCode = results.failed === 0 ? 200 : 207;
  const success = results.failed === 0;

  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    results: {
      total: results.success + results.failed,
      successful: results.success,
      failed: results.failed,
      errors: results.errors || []
    }
  };

  return res.status(statusCode).json(response);
};

const formatValidationErrors = (error) => {
  if (!error || !error.details) {
    return { message: 'Validation failed' };
  }

  const errors = {};
  error.details.forEach(detail => {
    const path = detail.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(detail.message);
  });

  return {
    message: 'Validation failed',
    fields: errors
  };
};

const formatListResponse = (items, meta = {}) => {
  return {
    items,
    total: items.length,
    ...meta
  };
};

const formatSingleResponse = (item, meta = {}) => {
  return {
    item,
    ...meta
  };
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendServerError,
  sendPaginated,
  sendBulkResponse,
  formatValidationErrors,
  formatListResponse,
  formatSingleResponse
};