// backend/utils/audit-logger.js
const pool = require('../db');

/**
 * Log audit trail for database operations
 * FIXED: Use separate connection to avoid lock conflicts
 */
const logAudit = async (
  userId,
  actionType,
  tableName,
  recordId = null,
  patientId = null,
  oldValues = null,
  newValues = null,
  description = '',
  req = null
) => {
  // Create a new connection for audit log to avoid transaction conflicts
  let connection;
  
  try {
    // Skip audit logging for certain tables if needed
    const skipTables = ['audit_logs', 'sessions'];
    if (skipTables.includes(tableName)) {
      return;
    }

    // Truncate description if too long
    if (description && description.length > 1000) {
      description = description.substring(0, 997) + '...';
    }

    // Get client IP and user agent
    let ipAddress = null;
    let userAgent = null;
    
    if (req) {
      ipAddress = req.ip || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress || 
                  req.headers['x-forwarded-for'] || 
                  null;
      
      userAgent = req.headers['user-agent'] || null;
    }

    // Get a dedicated connection for audit log
    connection = await pool.getConnection();
    
    // Set shorter timeout for audit log to avoid blocking
    await connection.query('SET innodb_lock_wait_timeout = 2');
    
    await connection.execute(
      `INSERT INTO audit_logs 
       (user_id, action_type, table_name, record_id, patient_id, 
        old_values, new_values, description, ip_address, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        actionType,
        tableName,
        recordId?.toString(),
        patientId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        description,
        ipAddress,
        userAgent
      ]
    );
    
    console.log(`✅ Audit log created: ${actionType} on ${tableName}`);
    
  } catch (error) {
    // Just log the error but don't throw - audit logging should not break main operation
    console.error('⚠️ Audit log error (non-critical):', error.message);
    
    // Log more details for debugging
    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      console.error('   Lock wait timeout - audit log skipped');
    }
    
    // You can also log to a file here if needed
  } finally {
    // Always release the connection
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing audit log connection:', releaseError.message);
      }
    }
  }
};

/**
 * Create audit middleware for CRUD operations
 */
const auditMiddleware = (tableName, getPatientId = null) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    const startTime = Date.now();

    // Override send function to capture response
    res.send = function(body) {
      res.locals.responseBody = body;
      res.locals.responseTime = Date.now() - startTime;
      originalSend.call(this, body);
    };

    // Store request data for auditing
    req.auditData = {
      actionType: req.method,
      tableName,
      oldValues: null,
      newValues: req.body,
      description: null
    };

    // If it's an update, fetch old values
    if (req.method === 'PUT' && req.params.id) {
      try {
        const [rows] = await pool.execute(
          `SELECT * FROM ${tableName} WHERE id = ?`,
          [req.params.id]
        );
        if (rows.length > 0) {
          req.auditData.oldValues = rows[0];
        }
      } catch (error) {
        console.error('Error fetching old values for audit:', error);
      }
    }

    next();
  };
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        al.*,
        u.username as user_username,
        u.role as user_role,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN patients p ON al.patient_id = p.id
      WHERE 1=1
    `;
    
    const params = [];

    if (filters.userId) {
      query += ` AND al.user_id = ?`;
      params.push(filters.userId);
    }

    if (filters.patientId) {
      query += ` AND al.patient_id = ?`;
      params.push(filters.patientId);
    }

    if (filters.actionType) {
      query += ` AND al.action_type = ?`;
      params.push(filters.actionType);
    }

    if (filters.tableName) {
      query += ` AND al.table_name = ?`;
      params.push(filters.tableName);
    }

    if (filters.startDate) {
      query += ` AND al.timestamp >= ?`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND al.timestamp <= ?`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY al.timestamp DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }

    const [logs] = await pool.execute(query, params);
    return logs;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Clean up old audit logs
 */
const cleanupOldLogs = async (daysToKeep = 365) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Set timeout for delete operation
    await connection.query('SET innodb_lock_wait_timeout = 10');
    
    const [result] = await connection.execute(
      `DELETE FROM audit_logs 
       WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysToKeep]
    );
    
    return {
      deleted_count: result.affectedRows,
      message: `Deleted audit logs older than ${daysToKeep} days`
    };
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  logAudit,
  auditMiddleware,
  getAuditLogs,
  cleanupOldLogs
};