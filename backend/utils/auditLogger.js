// backend/utils/auditLogger.js
const pool = require('../db');

const logAudit = async (user_id, auditData) => {
  try {
    const {
      action_type,
      patient_id = null,
      description,
      ip_address = null
    } = auditData;

    // Validate required fields
    if (!action_type || !description) {
      console.error('Missing required audit log fields:', { action_type, description });
      return;
    }

    // Ensure values are properly set (convert undefined to null)
    const safeAdminUserId = user_id || null;
    const safePatientId = patient_id || null;
    const safeIpAddress = ip_address || null;

    await pool.execute(
      `INSERT INTO audit_logs 
       (user_id, action_type, patient_id, description, ip_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [safeAdminUserId, action_type, safePatientId, description, safeIpAddress]
    );

    console.log(`✅ Audit logged: ${action_type} - ${description}`);
  } catch (error) {
    console.error('❌ Audit logging error:', error.message);
    // Don't throw the error to prevent breaking the main operation
  }
};
// Helper function to safely get user info from request
const getUserInfo = (req) => {
 return {
  user_id: req.user?.id || null,
  ip_address: req.ip || req.connection.remoteAddress || null
 };
};

module.exports = { logAudit, getUserInfo };