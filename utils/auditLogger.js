const pool = require('../db');

const logAudit = async (connection, auditData) => {
  const { action_type, patient_id, description, ip_address } = auditData;
  
  const query = `
    INSERT INTO audit_logs (action_type, patient_id, description, ip_address, timestamp) 
    VALUES (?, ?, ?, ?, NOW())
  `;
  
  const params = [action_type, patient_id, description, ip_address];
  
  try {
    if (connection && connection.execute) {
      await connection.execute(query, params);
    } else {
      await pool.execute(query, params);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error for audit failures to avoid breaking main functionality
  }
};

module.exports = { logAudit };