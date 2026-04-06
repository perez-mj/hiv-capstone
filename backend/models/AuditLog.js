// backend/models/AuditLog.js
const pool = require('../db');

class AuditLog {
  /**
   * Create a new audit log entry
   * @param {Object} logData - Audit log data
   * @param {number} logData.user_id - ID of the user performing the action
   * @param {string} logData.action_type - Type of action (INSERT, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
   * @param {string} logData.table_name - Name of the table affected
   * @param {string|number} logData.record_id - ID of the record affected
   * @param {number} logData.patient_id - ID of the patient (if applicable)
   * @param {Object} logData.old_values - Old values before the change
   * @param {Object} logData.new_values - New values after the change
   * @param {string} logData.description - Human-readable description of the action
   * @param {string} logData.ip_address - IP address of the user
   * @param {string} logData.user_agent - User agent of the client
   * @returns {Promise<number>} - ID of the created audit log
   */
  static async log(logData) {
    const {
      user_id = null,
      action_type,
      table_name = null,
      record_id = null,
      patient_id = null,
      old_values = null,
      new_values = null,
      description = null,
      ip_address = null,
      user_agent = null
    } = logData;

    const [result] = await pool.execute(
      `INSERT INTO audit_logs (
        user_id, action_type, table_name, record_id, patient_id,
        old_values, new_values, description, ip_address, user_agent, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user_id,
        action_type,
        table_name,
        record_id ? String(record_id) : null,
        patient_id,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        description,
        ip_address,
        user_agent
      ]
    );

    return result.insertId;
  }

  /**
   * Get audit logs with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} filters.user_id - Filter by user ID
   * @param {string} filters.action_type - Filter by action type
   * @param {string} filters.table_name - Filter by table name
   * @param {number} filters.record_id - Filter by record ID
   * @param {number} filters.patient_id - Filter by patient ID
   * @param {string} filters.start_date - Start date for timestamp filter
   * @param {string} filters.end_date - End date for timestamp filter
   * @param {string} filters.search - Search in description
   * @param {Object} pagination - Pagination options
   * @param {number} pagination.limit - Number of records per page
   * @param {number} pagination.offset - Offset for pagination
   * @returns {Promise<Array>} - Array of audit log entries
   */
  static async findAll(filters = {}, pagination = {}) {
    const {
      user_id,
      action_type,
      table_name,
      record_id,
      patient_id,
      start_date,
      end_date,
      search
    } = filters;
    
    const { limit = 100, offset = 0 } = pagination;

    let query = `
      SELECT 
        al.*,
        u.username as user_username,
        u.email as user_email,
        u.role as user_role,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.patient_facility_code
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN patients p ON al.patient_id = p.id
      WHERE 1=1
    `;

    const queryParams = [];

    if (user_id) {
      query += ` AND al.user_id = ?`;
      queryParams.push(user_id);
    }

    if (action_type) {
      query += ` AND al.action_type = ?`;
      queryParams.push(action_type);
    }

    if (table_name) {
      query += ` AND al.table_name = ?`;
      queryParams.push(table_name);
    }

    if (record_id) {
      query += ` AND al.record_id = ?`;
      queryParams.push(String(record_id));
    }

    if (patient_id) {
      query += ` AND al.patient_id = ?`;
      queryParams.push(patient_id);
    }

    if (start_date) {
      query += ` AND DATE(al.timestamp) >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(al.timestamp) <= ?`;
      queryParams.push(end_date);
    }

    if (search) {
      query += ` AND (
        al.description LIKE ? OR
        al.action_type LIKE ? OR
        al.table_name LIKE ? OR
        u.username LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, queryParams);
    
    // Parse JSON fields
    rows.forEach(row => {
      if (row.old_values) {
        try {
          row.old_values = typeof row.old_values === 'string' 
            ? JSON.parse(row.old_values) 
            : row.old_values;
        } catch (e) {
          console.error('Error parsing old_values:', e);
        }
      }
      if (row.new_values) {
        try {
          row.new_values = typeof row.new_values === 'string' 
            ? JSON.parse(row.new_values) 
            : row.new_values;
        } catch (e) {
          console.error('Error parsing new_values:', e);
        }
      }
    });

    return rows;
  }

  /**
   * Count audit logs with filters
   * @param {Object} filters - Filter criteria (same as findAll)
   * @returns {Promise<number>} - Total count
   */
  static async count(filters = {}) {
    const {
      user_id,
      action_type,
      table_name,
      record_id,
      patient_id,
      start_date,
      end_date,
      search
    } = filters;

    let query = `
      SELECT COUNT(*) as total 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const queryParams = [];

    if (user_id) {
      query += ` AND al.user_id = ?`;
      queryParams.push(user_id);
    }

    if (action_type) {
      query += ` AND al.action_type = ?`;
      queryParams.push(action_type);
    }

    if (table_name) {
      query += ` AND al.table_name = ?`;
      queryParams.push(table_name);
    }

    if (record_id) {
      query += ` AND al.record_id = ?`;
      queryParams.push(String(record_id));
    }

    if (patient_id) {
      query += ` AND al.patient_id = ?`;
      queryParams.push(patient_id);
    }

    if (start_date) {
      query += ` AND DATE(al.timestamp) >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(al.timestamp) <= ?`;
      queryParams.push(end_date);
    }

    if (search) {
      query += ` AND (
        al.description LIKE ? OR
        al.action_type LIKE ? OR
        al.table_name LIKE ? OR
        u.username LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }

  /**
   * Get audit log by ID
   * @param {number} id - Audit log ID
   * @returns {Promise<Object|null>} - Audit log entry or null
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        al.*,
        u.username as user_username,
        u.email as user_email,
        u.role as user_role,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.patient_facility_code
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN patients p ON al.patient_id = p.id
      WHERE al.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const log = rows[0];
    
    // Parse JSON fields
    if (log.old_values) {
      try {
        log.old_values = typeof log.old_values === 'string' 
          ? JSON.parse(log.old_values) 
          : log.old_values;
      } catch (e) {
        console.error('Error parsing old_values:', e);
      }
    }
    if (log.new_values) {
      try {
        log.new_values = typeof log.new_values === 'string' 
          ? JSON.parse(log.new_values) 
          : log.new_values;
      } catch (e) {
        console.error('Error parsing new_values:', e);
      }
    }

    return log;
  }

  /**
   * Get audit logs for a specific user
   * @param {number} userId - User ID
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} - Array of audit log entries
   */
  static async findByUser(userId, pagination = {}) {
    return this.findAll({ user_id: userId }, pagination);
  }

  /**
   * Get audit logs for a specific patient
   * @param {number} patientId - Patient ID
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} - Array of audit log entries
   */
  static async findByPatient(patientId, pagination = {}) {
    return this.findAll({ patient_id: patientId }, pagination);
  }

  /**
   * Get audit logs for a specific record
   * @param {string} tableName - Table name
   * @param {string|number} recordId - Record ID
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} - Array of audit log entries
   */
  static async findByRecord(tableName, recordId, pagination = {}) {
    return this.findAll({ table_name: tableName, record_id: recordId }, pagination);
  }

  /**
   * Get audit log statistics
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Object>} - Statistics object
   */
  static async getStatistics(startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(timestamp) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE DATE(timestamp) >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE DATE(timestamp) <= ?';
      params.push(endDate);
    }

    // Total logs by action type
    const [byActionType] = await pool.execute(
      `SELECT action_type, COUNT(*) as count 
       FROM audit_logs 
       ${dateFilter}
       GROUP BY action_type 
       ORDER BY count DESC`,
      params
    );

    // Total logs by table
    const [byTable] = await pool.execute(
      `SELECT table_name, COUNT(*) as count 
       FROM audit_logs 
       ${dateFilter}
       GROUP BY table_name 
       ORDER BY count DESC`,
      params
    );

    // Total logs by user
    const [byUser] = await pool.execute(
      `SELECT al.user_id, u.username, COUNT(*) as count 
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${dateFilter}
       GROUP BY al.user_id, u.username
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Daily activity
    const [dailyActivity] = await pool.execute(
      `SELECT DATE(timestamp) as date, COUNT(*) as count 
       FROM audit_logs 
       ${dateFilter}
       GROUP BY DATE(timestamp) 
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    // Peak hours
    const [peakHours] = await pool.execute(
      `SELECT HOUR(timestamp) as hour, COUNT(*) as count 
       FROM audit_logs 
       ${dateFilter}
       GROUP BY HOUR(timestamp) 
       ORDER BY count DESC
       LIMIT 5`,
      params
    );

    // Total count
    const [totalResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${dateFilter}`,
      params
    );

    return {
      total_logs: totalResult[0].total,
      by_action_type: byActionType,
      by_table: byTable,
      top_users: byUser,
      daily_activity: dailyActivity,
      peak_hours: peakHours
    };
  }

  /**
   * Clean up old audit logs (older than specified days)
   * @param {number} daysToKeep - Number of days to keep (default: 90)
   * @returns {Promise<number>} - Number of deleted records
   */
  static async cleanup(daysToKeep = 90) {
    const [result] = await pool.execute(
      'DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );
    return result.affectedRows;
  }

  /**
   * Get user activity summary
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Object>} - User activity summary
   */
  static async getUserActivity(userId, startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [userId];

    if (startDate && endDate) {
      dateFilter = 'AND DATE(timestamp) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND DATE(timestamp) >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'AND DATE(timestamp) <= ?';
      params.push(endDate);
    }

    // Total actions
    const [totalResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ? ${dateFilter}`,
      params
    );

    // Actions by type
    const [byActionType] = await pool.execute(
      `SELECT action_type, COUNT(*) as count 
       FROM audit_logs 
       WHERE user_id = ? ${dateFilter}
       GROUP BY action_type 
       ORDER BY count DESC`,
      params
    );

    // Actions by table
    const [byTable] = await pool.execute(
      `SELECT table_name, COUNT(*) as count 
       FROM audit_logs 
       WHERE user_id = ? ${dateFilter}
       GROUP BY table_name 
       ORDER BY count DESC`,
      params
    );

    // Recent activity
    const [recentActivity] = await pool.execute(
      `SELECT * FROM audit_logs 
       WHERE user_id = ? ${dateFilter}
       ORDER BY timestamp DESC 
       LIMIT 20`,
      params
    );

    // Daily activity
    const [dailyActivity] = await pool.execute(
      `SELECT DATE(timestamp) as date, COUNT(*) as count 
       FROM audit_logs 
       WHERE user_id = ? ${dateFilter}
       GROUP BY DATE(timestamp) 
       ORDER BY date DESC 
       LIMIT 30`,
      params
    );

    return {
      total_actions: totalResult[0].total,
      by_action_type: byActionType,
      by_table: byTable,
      recent_activity: recentActivity,
      daily_activity: dailyActivity
    };
  }

  /**
   * Export audit logs to CSV format
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - Array of formatted audit logs for export
   */
  static async exportLogs(filters = {}) {
    const logs = await this.findAll(filters, { limit: 10000, offset: 0 });
    
    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.user_username,
      user_email: log.user_email,
      user_role: log.user_role,
      action_type: log.action_type,
      table_name: log.table_name,
      record_id: log.record_id,
      patient_id: log.patient_id,
      patient_name: log.patient_first_name && log.patient_last_name 
        ? `${log.patient_first_name} ${log.patient_last_name}` 
        : null,
      description: log.description,
      ip_address: log.ip_address
    }));
  }
}

module.exports = AuditLog;