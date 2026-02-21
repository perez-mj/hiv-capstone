// backend/routes/queue.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );

    // Get user from database
    const [rows] = await pool.execute(
      'SELECT id, username, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0 || rows[0].is_active !== 1) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

// Helper function to generate queue number for the day
const generateQueueNumber = async (connection) => {
  // Get the highest queue number for today
  const [rows] = await connection.execute(
    `SELECT MAX(queue_number) as max_queue 
     FROM queue 
     WHERE DATE(created_at) = CURDATE()`,
    []
  );
  
  const maxQueue = rows[0].max_queue || 0;
  return maxQueue + 1;
};

// Helper function to calculate average wait time
function calculateAverageWaitTime(queueEntries) {
  const completedWithWait = queueEntries.filter(
    q => q.status === 'COMPLETED' && q.called_at && q.served_at
  );
  
  if (completedWithWait.length === 0) return 0;
  
  const totalWait = completedWithWait.reduce((sum, q) => {
    const calledTime = new Date(q.called_at).getTime();
    const servedTime = new Date(q.served_at).getTime();
    return sum + (servedTime - calledTime) / (1000 * 60); // Convert to minutes
  }, 0);
  
  return Math.round((totalWait / completedWithWait.length) * 10) / 10;
}

// Helper function to calculate estimated service time
function calculateEstimatedServiceTime(queueEntries) {
  const completed = queueEntries.filter(q => q.status === 'COMPLETED' && q.served_at && q.completed_at);
  
  if (completed.length === 0) return 15; // Default 15 minutes
  
  const totalService = completed.reduce((sum, q) => {
    const servedTime = new Date(q.served_at).getTime();
    const completedTime = new Date(q.completed_at).getTime();
    return sum + (completedTime - servedTime) / (1000 * 60);
  }, 0);
  
  return Math.round((totalService / completed.length) * 10) / 10;
}

// ==================== QUEUE MANAGEMENT ENDPOINTS ====================

/**
 * GET /api/queue/current - Get current queue status for today
 * Access: ADMIN, NURSE
 */
router.get('/current', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    // Get all queue entries for today with appointment details
    const [rows] = await pool.execute(
      `SELECT 
        q.id,
        q.appointment_id,
        q.queue_number,
        q.priority,
        q.status,
        q.called_at,
        q.served_at,
        q.completed_at,
        q.created_at,
        a.appointment_number,
        a.scheduled_at,
        a.status as appointment_status,
        a.notes as appointment_notes,
        at.type_name,
        at.duration_minutes,
        p.patient_id,
        p.first_name,
        p.last_name,
        p.middle_name,
        p.contact_number,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
        p.hiv_status,
        CASE 
          WHEN p.hiv_status = 'REACTIVE' AND p.art_start_date IS NOT NULL THEN 'ON_ART'
          WHEN p.hiv_status = 'REACTIVE' AND p.art_start_date IS NULL THEN 'REACTIVE_NOT_ON_ART'
          ELSE 'NON_REACTIVE'
        END as art_status,
        u.username as called_by_username
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON q.updated_by = u.id
      WHERE DATE(q.created_at) = CURDATE()
      ORDER BY 
        q.priority DESC,
        CASE 
          WHEN q.status = 'WAITING' THEN 1
          WHEN q.status = 'CALLED' THEN 2
          WHEN q.status = 'SERVING' THEN 3
          WHEN q.status = 'COMPLETED' THEN 4
          ELSE 5
        END,
        q.queue_number ASC`
    );

    // Separate into different status groups for easier frontend consumption
    const waiting = rows.filter(q => q.status === 'WAITING');
    const called = rows.filter(q => q.status === 'CALLED');
    const serving = rows.filter(q => q.status === 'SERVING');
    const completed = rows.filter(q => q.status === 'COMPLETED');
    const skipped = rows.filter(q => q.status === 'SKIPPED');

    // Get statistics
    const totalToday = rows.length;
    const averageWaitTime = calculateAverageWaitTime(rows);
    const estimatedServiceTime = calculateEstimatedServiceTime(rows);

    res.json({
      current_queue: {
        waiting,
        called,
        serving,
        completed,
        skipped
      },
      statistics: {
        total_today: totalToday,
        waiting_count: waiting.length,
        called_count: called.length,
        serving_count: serving.length,
        completed_count: completed.length,
        skipped_count: skipped.length,
        average_wait_time_minutes: averageWaitTime,
        estimated_service_time_minutes: estimatedServiceTime,
        last_updated: new Date().toISOString()
      },
      now_serving: serving.length > 0 ? serving[0].queue_number : null,
      next_in_queue: waiting.length > 0 ? waiting[0].queue_number : null
    });

  } catch (err) {
    console.error('Error fetching current queue:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/queue/current/summary - Get quick queue summary
 * Access: ADMIN, NURSE
 */
router.get('/current/summary', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        COUNT(CASE WHEN status = 'WAITING' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'CALLED' THEN 1 END) as called_count,
        COUNT(CASE WHEN status = 'SERVING' THEN 1 END) as serving_count,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END) as skipped_count,
        MIN(CASE WHEN status = 'WAITING' THEN queue_number END) as next_queue_number,
        AVG(CASE 
          WHEN status = 'COMPLETED' AND called_at IS NOT NULL AND served_at IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, called_at, served_at) 
        END) as avg_wait_time,
        MAX(CASE 
          WHEN status = 'COMPLETED' AND called_at IS NOT NULL AND served_at IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, called_at, served_at) 
        END) as longest_wait
      FROM queue
      WHERE DATE(created_at) = CURDATE()`,
      []
    );

    const summary = rows[0];
    
    res.json({
      waiting: summary.waiting_count || 0,
      called: summary.called_count || 0,
      in_progress: (summary.called_count || 0) + (summary.serving_count || 0),
      completed_today: summary.completed_count || 0,
      average_wait_time: Math.round((summary.avg_wait_time || 0) * 10) / 10,
      longest_wait: summary.longest_wait || 0,
      next_queue_number: summary.next_queue_number || null
    });

  } catch (err) {
    console.error('Error fetching queue summary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/queue/position/:queueNumber - Get position details for a specific queue number
 * Access: ADMIN, NURSE, PATIENT (for their own)
 */
router.get('/position/:queueNumber', authenticateToken, async (req, res) => {
  try {
    const { queueNumber } = req.params;

    const [rows] = await pool.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.priority,
        q.status,
        q.called_at,
        q.served_at,
        q.completed_at,
        q.created_at,
        a.appointment_number,
        a.scheduled_at,
        at.type_name,
        p.patient_id,
        p.first_name,
        p.last_name,
        (SELECT COUNT(*) FROM queue 
         WHERE DATE(created_at) = CURDATE() 
         AND status = 'WAITING' 
         AND queue_number < ?) as patients_ahead,
        (SELECT COUNT(*) FROM queue 
         WHERE DATE(created_at) = CURDATE() 
         AND status IN ('WAITING', 'CALLED', 'SERVING')) as total_active
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE q.queue_number = ? AND DATE(q.created_at) = CURDATE()`,
      [queueNumber, queueNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found for today' });
    }

    const queueEntry = rows[0];

    // If user is patient, verify they're accessing their own queue
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length === 0 || patientRows[0].patient_id !== queueEntry.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Estimate wait time based on patients ahead (assuming 15 mins per patient average)
    const estimatedWaitMinutes = queueEntry.patients_ahead * 15;

    res.json({
      ...queueEntry,
      estimated_wait_minutes: estimatedWaitMinutes,
      estimated_completion_time: new Date(Date.now() + estimatedWaitMinutes * 60000).toISOString()
    });

  } catch (err) {
    console.error('Error fetching queue position:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/queue/patient/:patientId - Get current queue status for a specific patient
 * Access: ADMIN, NURSE, PATIENT (own)
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check access
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length === 0 || patientRows[0].patient_id !== patientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [rows] = await pool.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.priority,
        q.status,
        q.called_at,
        q.served_at,
        q.completed_at,
        q.created_at,
        a.id as appointment_id,
        a.appointment_number,
        a.scheduled_at,
        at.type_name,
        at.duration_minutes,
        (SELECT COUNT(*) FROM queue 
         WHERE DATE(created_at) = CURDATE() 
         AND status = 'WAITING' 
         AND queue_number < q.queue_number) as patients_ahead
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.patient_id = ? 
      AND DATE(q.created_at) = CURDATE()
      ORDER BY q.created_at DESC
      LIMIT 1`,
      [patientId]
    );

    if (rows.length === 0) {
      return res.json({ 
        message: 'No active queue entry for today',
        in_queue: false 
      });
    }

    const queueEntry = rows[0];
    const estimatedWaitMinutes = queueEntry.patients_ahead * 15;

    res.json({
      in_queue: true,
      ...queueEntry,
      estimated_wait_minutes: estimatedWaitMinutes,
      estimated_completion_time: new Date(Date.now() + estimatedWaitMinutes * 60000).toISOString()
    });

  } catch (err) {
    console.error('Error fetching patient queue:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/queue/check-appointment/:appointmentId - Check if appointment is in queue
 * Access: ADMIN, NURSE
 */
router.get('/check-appointment/:appointmentId', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const [rows] = await pool.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.status,
        q.created_at
      FROM queue q
      WHERE q.appointment_id = ? 
      AND DATE(q.created_at) = CURDATE()`,
      [appointmentId]
    );

    if (rows.length === 0) {
      return res.json({
        in_queue: false
      });
    }

    res.json({
      in_queue: true,
      queue_entry: rows[0]
    });

  } catch (err) {
    console.error('Error checking appointment in queue:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/queue/add - Add appointment to queue
 * Access: ADMIN, NURSE
 */
router.post('/add', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { appointment_id, priority = 0 } = req.body;

    if (!appointment_id) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }

    // Check if appointment exists and is valid
    const [appointmentCheck] = await connection.execute(
      `SELECT a.*, p.patient_id, p.first_name, p.last_name 
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.id = ?`,
      [appointment_id]
    );

    if (appointmentCheck.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointmentCheck[0];

    // Check if appointment is already in queue today
    const [queueCheck] = await connection.execute(
      'SELECT id FROM queue WHERE appointment_id = ? AND DATE(created_at) = CURDATE()',
      [appointment_id]
    );

    if (queueCheck.length > 0) {
      return res.status(400).json({ error: 'Appointment already in today\'s queue' });
    }

    // Check if appointment is scheduled for today
    const appointmentDate = new Date(appointment.scheduled_at).toDateString();
    const today = new Date().toDateString();
    
    if (appointmentDate !== today) {
      return res.status(400).json({ 
        error: 'Appointment is not scheduled for today',
        scheduled_date: appointment.scheduled_at
      });
    }

    // Check appointment status
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED' || appointment.status === 'NO_SHOW') {
      return res.status(400).json({ 
        error: `Cannot add appointment with status: ${appointment.status}` 
      });
    }

    // Generate queue number
    const queueNumber = await generateQueueNumber(connection);

    // Add to queue
    const [result] = await connection.execute(
      `INSERT INTO queue 
       (appointment_id, queue_number, priority, status, created_by) 
       VALUES (?, ?, ?, 'WAITING', ?)`,
      [appointment_id, queueNumber, priority, req.user.id]
    );

    // Update appointment status to CONFIRMED if it was SCHEDULED
    if (appointment.status === 'SCHEDULED') {
      await connection.execute(
        'UPDATE appointments SET status = ? WHERE id = ?',
        ['CONFIRMED', appointment_id]
      );
    }

    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, new_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'CREATE', 
        req.user.id, 
        'queue', 
        result.insertId, 
        appointment.patient_id,
        JSON.stringify({ appointment_id, queue_number: queueNumber, priority }),
        `Added appointment to queue - Queue #${queueNumber} for patient ${appointment.first_name} ${appointment.last_name}`
      ]
    );

    await connection.commit();

    // Get the created queue entry
    const [newQueueEntry] = await connection.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.priority,
        q.status,
        q.created_at,
        a.appointment_number,
        a.scheduled_at,
        p.first_name,
        p.last_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE q.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Appointment added to queue successfully',
      queue_entry: newQueueEntry[0],
      patients_ahead: 0 // First in waiting queue
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error adding to queue:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/queue/call/:id - Call a patient from queue (mark as CALLED)
 * Access: ADMIN, NURSE
 */
router.post('/call/:id', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { station = 'General' } = req.body;

    // Check if queue entry exists and is WAITING
    const [queueCheck] = await connection.execute(
      `SELECT q.*, a.patient_id, p.first_name, p.last_name 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE q.id = ?`,
      [id]
    );

    if (queueCheck.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const queueEntry = queueCheck[0];

    if (queueEntry.status !== 'WAITING') {
      return res.status(400).json({ 
        error: `Cannot call patient with status: ${queueEntry.status}` 
      });
    }

    // Update queue status to CALLED
    await connection.execute(
      `UPDATE queue 
       SET status = 'CALLED', called_at = NOW(), updated_by = ? 
       WHERE id = ?`,
      [req.user.id, id]
    );

    // Update appointment status
    await connection.execute(
      `UPDATE appointments SET status = 'IN_PROGRESS' WHERE id = ?`,
      [queueEntry.appointment_id]
    );

    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'CALL_PATIENT', 
        req.user.id, 
        'queue', 
        id, 
        queueEntry.patient_id,
        `Called patient ${queueEntry.first_name} ${queueEntry.last_name} to station ${station}`
      ]
    );

    await connection.commit();

    res.json({
      message: 'Patient called successfully',
      queue_number: queueEntry.queue_number,
      patient_name: `${queueEntry.first_name} ${queueEntry.last_name}`,
      station,
      called_at: new Date().toISOString()
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error calling patient:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/queue/start-serving/:id - Start serving a patient (mark as SERVING)
 * Access: ADMIN, NURSE
 */
router.post('/start-serving/:id', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;

    // Check if queue entry exists and is CALLED
    const [queueCheck] = await connection.execute(
      `SELECT q.*, a.patient_id, p.first_name, p.last_name 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE q.id = ?`,
      [id]
    );

    if (queueCheck.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const queueEntry = queueCheck[0];

    if (queueEntry.status !== 'CALLED') {
      return res.status(400).json({ 
        error: `Cannot start serving patient with status: ${queueEntry.status}` 
      });
    }

    // Update queue status to SERVING
    await connection.execute(
      `UPDATE queue 
       SET status = 'SERVING', served_at = NOW(), updated_by = ? 
       WHERE id = ?`,
      [req.user.id, id]
    );

    await connection.commit();

    res.json({
      message: 'Started serving patient',
      queue_number: queueEntry.queue_number,
      patient_name: `${queueEntry.first_name} ${queueEntry.last_name}`,
      served_at: new Date().toISOString()
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error starting service:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/queue/complete/:id - Complete serving a patient (mark as COMPLETED)
 * Access: ADMIN, NURSE
 */
router.post('/complete/:id', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;

    // Check if queue entry exists and is SERVING
    const [queueCheck] = await connection.execute(
      `SELECT q.*, a.patient_id, p.first_name, p.last_name 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE q.id = ?`,
      [id]
    );

    if (queueCheck.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const queueEntry = queueCheck[0];

    if (queueEntry.status !== 'SERVING') {
      return res.status(400).json({ 
        error: `Cannot complete patient with status: ${queueEntry.status}` 
      });
    }

    // Update queue status to COMPLETED
    await connection.execute(
      `UPDATE queue 
       SET status = 'COMPLETED', completed_at = NOW(), updated_by = ? 
       WHERE id = ?`,
      [req.user.id, id]
    );

    // Update appointment status
    await connection.execute(
      `UPDATE appointments SET status = 'COMPLETED' WHERE id = ?`,
      [queueEntry.appointment_id]
    );

    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'COMPLETE_SERVICE', 
        req.user.id, 
        'queue', 
        id, 
        queueEntry.patient_id,
        `Completed service for patient ${queueEntry.first_name} ${queueEntry.last_name}`
      ]
    );

    await connection.commit();

    res.json({
      message: 'Service completed successfully',
      queue_number: queueEntry.queue_number,
      patient_name: `${queueEntry.first_name} ${queueEntry.last_name}`,
      completed_at: new Date().toISOString()
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error completing service:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/queue/skip/:id - Skip a patient in queue
 * Access: ADMIN, NURSE
 */
router.post('/skip/:id', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { reason } = req.body;

    // Check if queue entry exists and is WAITING or CALLED
    const [queueCheck] = await connection.execute(
      `SELECT q.*, a.patient_id, p.first_name, p.last_name 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE q.id = ?`,
      [id]
    );

    if (queueCheck.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const queueEntry = queueCheck[0];

    if (queueEntry.status !== 'WAITING' && queueEntry.status !== 'CALLED') {
      return res.status(400).json({ 
        error: `Cannot skip patient with status: ${queueEntry.status}` 
      });
    }

    // Update queue status to SKIPPED
    await connection.execute(
      `UPDATE queue 
       SET status = 'SKIPPED', updated_by = ? 
       WHERE id = ?`,
      [req.user.id, id]
    );

    // Update appointment status
    await connection.execute(
      `UPDATE appointments SET status = 'NO_SHOW' WHERE id = ?`,
      [queueEntry.appointment_id]
    );

    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, old_values, new_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'SKIP_PATIENT', 
        req.user.id, 
        'queue', 
        id, 
        queueEntry.patient_id,
        JSON.stringify({ status: queueEntry.status }),
        JSON.stringify({ status: 'SKIPPED', reason }),
        `Skipped patient ${queueEntry.first_name} ${queueEntry.last_name} from queue. Reason: ${reason || 'Not specified'}`
      ]
    );

    await connection.commit();

    res.json({
      message: 'Patient skipped successfully',
      queue_number: queueEntry.queue_number,
      patient_name: `${queueEntry.first_name} ${queueEntry.last_name}`
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error skipping patient:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/queue/reorder - Reorder queue (change priority)
 * Access: ADMIN only
 */
router.post('/reorder', authenticateToken, authorize('ADMIN'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { updates } = req.body; // Array of { id, priority }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    for (const update of updates) {
      await connection.execute(
        'UPDATE queue SET priority = ? WHERE id = ? AND DATE(created_at) = CURDATE()',
        [update.priority, update.id]
      );
    }

    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, description) 
       VALUES (?, ?, ?, ?)`,
      [
        'REORDER_QUEUE', 
        req.user.id, 
        'queue',
        `Reordered queue with ${updates.length} priority updates`
      ]
    );

    await connection.commit();

    // Fetch updated queue
    const [updatedQueue] = await connection.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.priority,
        q.status,
        p.first_name,
        p.last_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE DATE(q.created_at) = CURDATE()
      ORDER BY q.priority DESC, q.queue_number ASC`
    );

    res.json({
      message: 'Queue reordered successfully',
      queue: updatedQueue
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error reordering queue:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// ==================== QUEUE HISTORY ====================

/**
 * GET /api/queue/history - Get queue history with filters
 * Access: ADMIN, NURSE
 */
router.get('/history', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      status,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        q.id,
        q.queue_number,
        q.priority,
        q.status,
        q.called_at,
        q.served_at,
        q.completed_at,
        q.created_at,
        a.appointment_number,
        a.scheduled_at,
        at.type_name,
        p.patient_id,
        p.first_name,
        p.last_name,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
        u.username as handled_by,
        TIMESTAMPDIFF(MINUTE, q.called_at, q.served_at) as waiting_time_minutes,
        TIMESTAMPDIFF(MINUTE, q.served_at, q.completed_at) as service_time_minutes
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON q.updated_by = u.id
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      query += ' AND DATE(q.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(q.created_at) <= ?';
      params.push(end_date);
    }

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    ).split('ORDER BY')[0];

    const [countResult] = await pool.execute(countQuery, params);

    // Add pagination
    query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, params);

    // Calculate statistics
    const completedEntries = rows.filter(r => r.status === 'COMPLETED');
    const avgWaitingTime = completedEntries.length > 0
      ? completedEntries.reduce((sum, r) => sum + (r.waiting_time_minutes || 0), 0) / completedEntries.length
      : 0;

    res.json({
      history: rows,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      statistics: {
        total_entries: countResult[0].total,
        completed_count: completedEntries.length,
        average_waiting_time_minutes: Math.round(avgWaitingTime * 10) / 10,
        date_range: {
          start: start_date || 'all time',
          end: end_date || 'all time'
        }
      }
    });

  } catch (err) {
    console.error('Error fetching queue history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== QUEUE STATISTICS ====================

/**
 * GET /api/queue/stats/daily - Get daily queue statistics
 * Access: ADMIN, NURSE
 */
router.get('/stats/daily', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const [rows] = await pool.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_patients,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
        AVG(CASE 
          WHEN status = 'COMPLETED' AND served_at IS NOT NULL AND called_at IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, called_at, served_at) 
          ELSE NULL 
        END) as avg_wait_time,
        AVG(CASE 
          WHEN status = 'COMPLETED' AND completed_at IS NOT NULL AND served_at IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, served_at, completed_at) 
          ELSE NULL 
        END) as avg_service_time,
        MIN(queue_number) as first_queue,
        MAX(queue_number) as last_queue
      FROM queue
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      [parseInt(days)]
    );

    res.json({
      daily_stats: rows,
      period: `Last ${days} days`
    });

  } catch (err) {
    console.error('Error fetching daily stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/queue/stats/peak-hours - Get peak hours analysis
 * Access: ADMIN, NURSE
 */
router.get('/stats/peak-hours', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as total_entries,
        AVG(CASE 
          WHEN status = 'COMPLETED' 
          THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) 
          ELSE NULL 
        END) as avg_total_time
      FROM queue
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY total_entries DESC`
    );

    const peakHours = rows.slice(0, 3); // Top 3 busiest hours
    const quietestHours = rows.slice(-3).reverse(); // Bottom 3 hours

    res.json({
      hourly_breakdown: rows,
      peak_hours: peakHours,
      quietest_hours: quietestHours
    });

  } catch (err) {
    console.error('Error fetching peak hours:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN UTILITY ====================

/**
 * DELETE /api/queue/reset - Reset today's queue (Admin only, use with caution)
 * Access: ADMIN only
 */
router.delete('/reset', authenticateToken, authorize('ADMIN'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { confirm } = req.query;

    if (confirm !== 'YES') {
      return res.status(400).json({ 
        error: 'Confirmation required. Use ?confirm=YES to proceed.' 
      });
    }

    // Get today's queue entries for audit
    const [todayQueue] = await connection.execute(
      `SELECT q.*, a.patient_id 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE DATE(q.created_at) = CURDATE()`
    );

    if (todayQueue.length === 0) {
      return res.status(404).json({ error: 'No queue entries for today' });
    }

    // Update appointments back to SCHEDULED
    for (const entry of todayQueue) {
      await connection.execute(
        `UPDATE appointments SET status = 'SCHEDULED' 
         WHERE id = ? AND status IN ('CONFIRMED', 'IN_PROGRESS')`,
        [entry.appointment_id]
      );
    }

    // Delete today's queue entries
    await connection.execute('DELETE FROM queue WHERE DATE(created_at) = CURDATE()');

    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, old_values, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'RESET_QUEUE', 
        req.user.id, 
        'queue',
        JSON.stringify(todayQueue),
        `Reset today's queue. Removed ${todayQueue.length} entries.`
      ]
    );

    await connection.commit();

    res.json({
      message: 'Queue reset successfully',
      entries_removed: todayQueue.length
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error resetting queue:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;