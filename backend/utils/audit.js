// backend/utils/audit.js
const db = require('../models');
const { sanitize } = require('./auditSanitizer');
const logger = require('./logger');   // you already have backend/utils/logger.js

/**
 * Write an audit log entry. Fire-and-forget — never throws, never blocks.
 *
 * Usage from a service:
 *   await audit.write({
 *     userId: actorId,
 *     action: 'UPDATE',
 *     entityType: 'Patient',
 *     entityId: patient.id,
 *     oldData,
 *     newData: patient.toJSON()
 *   });
 *
 * Or non-awaited (truly fire-and-forget):
 *   audit.write({ ... });
 */
async function write({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
  metadata = null,       // any extra context (search query, filters, etc.)
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
    // Audit must NEVER break the caller
    logger.error('[audit] failed to write audit log:', err.message);
    return null;
  }
}

/**
 * Convenience: wrap an async operation with before/after audit.
 *
 * Usage:
 *   const result = await audit.track({
 *     userId, action: 'UPDATE', entityType: 'Patient',
 *     entityId: id,
 *     before: () => patient.toJSON(),
 *     run: () => patient.update(updates),
 *     after: (updated) => updated.toJSON()
 *   });
 */
async function track({
  userId, action, entityType, entityId,
  before, run, after,
  ipAddress, userAgent, metadata
}) {
  const started = Date.now();
  const oldData = typeof before === 'function' ? before() : before;
  const result = await run();
  const newData = typeof after === 'function' ? after(result) : (after ?? result);

  // Fire-and-forget — don't await in the hot path
  write({
    userId, action, entityType, entityId,
    oldData, newData,
    ipAddress, userAgent, metadata,
    durationMs: Date.now() - started
  });

  return result;
}

module.exports = { write, track };