// backend/services/appointmentScheduler.js
const cron = require('node-cron');
const pool = require('../db');

// Run every hour to check for unconfirmed appointments
const setupAppointmentScheduler = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running appointment auto-cancellation check...');
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Auto-cancel appointments that:
      // 1. Are still SCHEDULED (not confirmed)
      // 2. Are scheduled for more than 24 hours ago
      // 3. Are within the last 7 days (don't cancel too old appointments)
      const [cancelled] = await connection.execute(
        `UPDATE appointments 
         SET status = 'CANCELLED', 
             updated_at = NOW(),
             cancellation_reason = 'Auto-cancelled - Not confirmed within 24 hours'
         WHERE status = 'SCHEDULED' 
           AND scheduled_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
           AND scheduled_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      );
      
      if (cancelled.affectedRows > 0) {
        console.log(`Auto-cancelled ${cancelled.affectedRows} unconfirmed appointments`);
        
        // Log to audit
        await connection.execute(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, description, created_at)
           VALUES (NULL, 'AUTO_CANCEL', 'appointments', NULL, ?, ?, NOW())`,
          [JSON.stringify({ count: cancelled.affectedRows }), 
           `Auto-cancelled ${cancelled.affectedRows} unconfirmed appointments`]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('Error in auto-cancellation:', error);
    } finally {
      connection.release();
    }
  });
  
  console.log('Appointment scheduler started');
};

module.exports = { setupAppointmentScheduler };