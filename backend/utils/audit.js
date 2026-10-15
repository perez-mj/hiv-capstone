// backend/utils/audit.js
const db = require('../models');
const { sanitize } = require('./auditSanitizer');
const logger = require('./logger');

async function write({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
  metadata = null,       
  ipAddress = null,
  userAgent = null,
  statusCode = 200,
  durationMs = null
} = {}) {
  try {
    if (!action || !entityType) {
      logger.warn('[audit] skipped — action and entityType are required');
      return null;
    }

    const row = await db.AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      old_data: oldData ? sanitize(oldData) : null,
      new_data: newData ? sanitize(newData) : null,
      request_data: metadata ? sanitize(metadata) : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status_code: statusCode,
      duration_ms: durationMs
    });

    return row;
  } catch (err) {
    logger.error('[audit] failed to write audit log:', err.message);
    return null;
  }
}

async function track({
  userId, action, entityType, entityId,
  before, run, after,
  ipAddress, userAgent, metadata
}) {
  const started = Date.now();
  const oldData = typeof before === 'function' ? before() : before;
  const result = await run();
  const newData = typeof after === 'function' ? after(result) : (after ?? result);

  write({
    userId, action, entityType, entityId,
    oldData, newData,
    ipAddress, userAgent, metadata,
    durationMs: Date.now() - started
  });

  return result;
}

module.exports = { write, track };