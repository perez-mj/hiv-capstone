// backend/services/appointmentScheduler.js
const cron = require('node-cron');
const pool = require('../db');
const blockchainAuditService = require('./blockchainAuditService');

// Run every hour to check for unconfirmed appointments
const setupAppointmentScheduler = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running appointment auto-cancellation check...');
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // First, get the appointments that will be cancelled (for blockchain logging)
      const [toCancel] = await connection.execute(
        `SELECT id, appointment_number, patient_id, scheduled_at, status
         FROM appointments 
         WHERE status = 'SCHEDULED' 
           AND scheduled_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
           AND scheduled_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      );
      
      if (toCancel.length > 0) {
        // Auto-cancel appointments
        const [cancelled] = await connection.execute(
          `UPDATE appointments 
           SET status = 'CANCELLED', 
               updated_at = NOW(),
               cancellation_reason = 'Auto-cancelled - Not confirmed within 24 hours'
           WHERE status = 'SCHEDULED' 
             AND scheduled_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
             AND scheduled_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        );
        
        console.log(`Auto-cancelled ${cancelled.affectedRows} unconfirmed appointments`);
        
        // Log to blockchain for each cancelled appointment
        for (const appointment of toCancel) {
          try {
            // Prepare appointment data for blockchain snapshot
            const appointmentSnapshot = {
              id: appointment.id,
              appointment_number: appointment.appointment_number,
              patient_id: appointment.patient_id,
              scheduled_at: appointment.scheduled_at,
              status: 'CANCELLED',
              cancellation_reason: 'Auto-cancelled - Not confirmed within 24 hours',
              cancelled_by: 'system',
              cancelled_at: new Date().toISOString()
            };
            
            // Store on blockchain using the blockchain audit service
            const result = await blockchainAuditService.storeAppointmentSnapshot(
              appointmentSnapshot,
              'AUTO_CANCEL',
              null // No request object for system action
            );
            
            // Also log to blockchain audit trail
            await blockchainAuditService.logAction(
              'AUTO_CANCEL',
              'appointments',
              appointment.id,
              appointment.patient_id,
              { status: 'SCHEDULED' },
              { status: 'CANCELLED', cancellation_reason: 'Auto-cancelled - Not confirmed within 24 hours' },
              `Auto-cancelled appointment ${appointment.appointment_number} - not confirmed within 24 hours`,
              null
            );
            
            console.log(`✅ Appointment ${appointment.id} logged to blockchain`);
          } catch (blockchainError) {
            console.error(`Failed to log appointment ${appointment.id} to blockchain:`, blockchainError.message);
            // Continue with other appointments even if blockchain logging fails
          }
        }
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('Error in auto-cancellation:', error);
    } finally {
      connection.release();
    }
  });
  
  console.log('Appointment scheduler started with blockchain integration');
};

module.exports = { setupAppointmentScheduler };