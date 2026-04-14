// backend/utils/blockchain-logger.js
const blockchainAuditService = require('../services/blockchainAuditService');

/**
 * Helper to log actions to blockchain with request context
 * @param {Object} req - Express request object
 * @param {Object} logData - Log data
 * @param {string} logData.actionType - INSERT, UPDATE, DELETE, etc.
 * @param {string} logData.tableName - Database table name
 * @param {number|string} logData.recordId - Record ID
 * @param {number|null} logData.patientId - Patient ID (if applicable)
 * @param {Object|null} logData.oldValues - Old values before change
 * @param {Object|null} logData.newValues - New values after change
 * @param {string} logData.description - Human readable description
 * @returns {Promise<Object>} Blockchain log result
 */
async function logToBlockchain(req, logData) {
  return await blockchainAuditService.logAction(
    logData.actionType,
    logData.tableName,
    logData.recordId,
    logData.patientId || null,
    logData.oldValues || null,
    logData.newValues || null,
    logData.description,
    req // Pass the request object to get user, IP, etc.
  );
}

module.exports = { logToBlockchain };