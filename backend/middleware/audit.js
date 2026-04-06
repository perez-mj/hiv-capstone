const blockchainAuditService = require('../services/blockchainAuditService');

// Middleware to automatically log all database operations
const auditMiddleware = (modelName) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Track if response has been sent
    let responseSent = false;
    
    // Override res.json
    res.json = function(data) {
      if (!responseSent) {
        responseSent = true;
        res.locals.responseData = data;
      }
      return originalJson.call(this, data);
    };
    
    // Override res.send
    res.send = function(data) {
      if (!responseSent) {
        responseSent = true;
        res.locals.responseData = data;
      }
      return originalSend.call(this, data);
    };
    
    // Store request start time
    req.auditStartTime = Date.now();
    
    // Continue to route handler
    next();
  };
};

// Function to log specific actions
const logAudit = async (req, actionType, tableName, recordId, patientId, oldValues, newValues, description) => {
  try {
    await blockchainAuditService.logAction(
      actionType,
      tableName,
      recordId,
      patientId,
      oldValues,
      newValues,
      description,
      req
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't throw error - audit logging shouldn't break the main flow
  }
};

module.exports = {
  auditMiddleware,
  logAudit
};