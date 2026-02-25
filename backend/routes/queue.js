// backend/routes/queue.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { generateQueueNumber, formatDate } = require('../utils/helpers');

// ==================== PUBLIC ROUTES (no auth) ====================

// GET queue display board view (public - no auth needed for display)
router.get('/display', async (req, res) => {
  try {
    const [queue] = await pool.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.status,
        q.called_at,
        q.served_at,
        a.appointment_number,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as display_name,
        at.type_name,
        TIMESTAMPDIFF(MINUTE, q.called_at, NOW()) as minutes_since_called
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        CASE 
          WHEN q.status = 'CALLED' THEN 1
          WHEN q.status = 'SERVING' THEN 2
          ELSE 3
        END,
        q.queue_number ASC`
    );

    // Get currently serving and last 3 called
    const nowServing = queue.find(q => q.status === 'SERVING');
    const recentlyCalled = queue
      .filter(q => q.status === 'CALLED')
      .slice(0, 3);
    
    const waiting = queue.filter(q => q.status === 'WAITING');

    res.json({
      success: true,
      data: {
        now_serving: nowServing ? {
          number: nowServing.queue_number,
          name: nowServing.display_name,
          type: nowServing.type_name,
          since: nowServing.served_at
        } : null,
        recently_called: recentlyCalled.map(c => ({
          number: c.queue_number,
          name: c.display_name,
          type: c.type_name,
          called_at: c.called_at
        })),
        waiting_count: waiting.length,
        next_numbers: waiting.slice(0, 5).map(w => w.queue_number)
      }
    });

  } catch (error) {
    console.error('Error fetching queue display:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch queue display' 
    });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

// GET /api/queue/current - CURRENT QUEUE STATUS (what frontend needs)
router.get('/current', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching current queue status...');
    
    const [queue] = await pool.execute(
      `SELECT 
        q.*,
        a.appointment_number,
        a.scheduled_at,
        p.id as patient_id,
        p.patient_facility_code,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.middle_name as patient_middle_name,
        at.type_name,
        at.duration_minutes,
        u.username as created_by_username
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        q.priority DESC,
        q.queue_number ASC`
    );

    // Get now serving
    const nowServing = queue.find(q => q.status === 'SERVING');
    
    // Get waiting count
    const waitingCount = queue.filter(q => q.status === 'WAITING').length;
    
    // Get called count
    const calledCount = queue.filter(q => q.status === 'CALLED').length;

    // Calculate estimated wait time (15 minutes per waiting patient)
    const estimatedWaitTime = waitingCount * 15;

    res.json({
      success: true,
      data: {
        queue: queue,
        now_serving: nowServing ? {
          number: nowServing.queue_number,
          name: `${nowServing.patient_first_name} ${nowServing.patient_last_name}`,
          type: nowServing.type_name
        } : null,
        waiting_count: waitingCount,
        called_count: calledCount,
        estimated_wait_time: estimatedWaitTime,
        total_in_queue: queue.length
      }
    });

  } catch (error) {
    console.error('Error fetching current queue:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch current queue' 
    });
  }
});

// GET /api/queue - All queue (Admin/Nurse only) - KEEP ORIGINAL
router.get('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [queue] = await pool.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          a.scheduled_at,
          p.id as patient_id,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          at.type_name,
          at.duration_minutes,
          u.username as created_by_username
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON q.created_by = u.id
        WHERE DATE(q.created_at) = CURDATE()
          AND q.status IN ('WAITING', 'CALLED', 'SERVING')
        ORDER BY 
          q.priority DESC,
          q.queue_number ASC`
      );

      // Group by status
      const grouped = {
        waiting: queue.filter(q => q.status === 'WAITING'),
        called: queue.filter(q => q.status === 'CALLED'),
        serving: queue.filter(q => q.status === 'SERVING'),
        total: queue.length
      };

      // Get current serving
      const currentServing = queue.find(q => q.status === 'SERVING');

      // Calculate estimated wait times
      const avgServiceTime = 15; // minutes
      let estimatedWaitTime = 0;
      
      for (let i = 0; i < grouped.waiting.length; i++) {
        grouped.waiting[i].estimated_wait_minutes = estimatedWaitTime;
        estimatedWaitTime += avgServiceTime;
      }

      res.json({
        success: true,
        data: grouped,
        current_serving: currentServing || null,
        stats: {
          waiting_count: grouped.waiting.length,
          called_count: grouped.called.length,
          serving_count: grouped.serving.length,
          total_in_queue: grouped.total,
          estimated_total_wait: estimatedWaitTime
        }
      });

    } catch (error) {
      console.error('Error fetching queue:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue' 
      });
    }
});

// GET /api/queue/patient/:patientId - Get patient's queue position
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    const [queue] = await pool.execute(
      `SELECT q.*, a.scheduled_at
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE a.patient_id = ? 
       AND DATE(q.created_at) = CURDATE()
       AND q.status IN ('WAITING', 'CALLED', 'SERVING')
       ORDER BY q.created_at DESC
       LIMIT 1`,
      [patientId]
    );

    if (queue.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Patient not in queue'
      });
    }

    // Get position in queue
    const [position] = await pool.execute(
      `SELECT COUNT(*) + 1 as position
       FROM queue
       WHERE DATE(created_at) = CURDATE()
       AND status = 'WAITING'
       AND queue_number < ?`,
      [queue[0].queue_number]
    );

    res.json({
      success: true,
      data: {
        ...queue[0],
        position: position[0].position,
        estimated_wait_minutes: (position[0].position - 1) * 15
      }
    });

  } catch (error) {
    console.error('Error fetching patient queue:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch patient queue' 
    });
  }
});

// GET /api/queue/my-status - Patient's own queue status
router.get('/my-status', 
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== 'PATIENT') {
        return res.status(403).json({ 
          success: false,
          error: 'Only patients can access their queue status' 
        });
      }

      // Get patient ID from user ID
      const [patient] = await pool.execute(
        'SELECT id FROM patients WHERE user_id = ?',
        [req.user.id]
      );

      if (patient.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Patient record not found' 
        });
      }

      const patientId = patient[0].id;

      const [queue] = await pool.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          a.scheduled_at,
          at.type_name,
          at.duration_minutes,
          (SELECT COUNT(*) + 1 
           FROM queue q2 
           WHERE DATE(q2.created_at) = CURDATE() 
             AND q2.status IN ('WAITING', 'CALLED')
             AND q2.queue_number < q.queue_number) as position
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE a.patient_id = ?
          AND DATE(q.created_at) = CURDATE()
          AND q.status IN ('WAITING', 'CALLED', 'SERVING')
        ORDER BY q.created_at DESC
        LIMIT 1`,
        [patientId]
      );

      if (queue.length === 0) {
        return res.json({
          success: true,
          in_queue: false,
          message: 'You are not currently in the queue'
        });
      }

      const queueStatus = queue[0];
      
      // Calculate estimated wait time based on position
      const avgServiceTime = 15;
      queueStatus.estimated_wait_minutes = (queueStatus.position - 1) * avgServiceTime;

      res.json({
        success: true,
        in_queue: true,
        data: queueStatus
      });

    } catch (error) {
      console.error('Error fetching patient queue status:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue status' 
      });
    }
});

// GET queue history with filters
router.get('/history', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, offset } = req.pagination;
      const { start_date, end_date, status } = req.query;

      let query = `
        SELECT 
          q.*,
          a.appointment_number,
          a.scheduled_at,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          at.type_name,
          u.username as created_by_username,
          TIMESTAMPDIFF(MINUTE, q.called_at, q.served_at) as service_duration,
          TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at) as wait_duration
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON q.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];

      if (start_date) {
        query += ` AND DATE(q.created_at) >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND DATE(q.created_at) <= ?`;
        params.push(end_date);
      }

      if (status) {
        query += ` AND q.status = ?`;
        params.push(status);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM queue q/,
        'SELECT COUNT(*) as total FROM queue q'
      );
      
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      query += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [history] = await pool.execute(query, params);

      // Calculate summary statistics
      const [summary] = await pool.execute(
        `SELECT 
          AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as avg_wait_time,
          AVG(TIMESTAMPDIFF(MINUTE, called_at, served_at)) as avg_service_time,
          COUNT(*) as total_served,
          SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_count
        FROM queue
        WHERE DATE(created_at) = CURDATE()`
      );

      res.json({
        success: true,
        data: history,
        summary: {
          avg_wait_time: Math.round(summary[0].avg_wait_time || 0),
          avg_service_time: Math.round(summary[0].avg_service_time || 0),
          total_served: summary[0].total_served || 0,
          skipped_count: summary[0].skipped_count || 0
        },
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching queue history:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue history' 
      });
    }
});

// GET queue statistics
router.get('/stats/overview', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      // Today's stats
      const [todayStats] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
          SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called,
          SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
          AVG(CASE WHEN status = 'COMPLETED' 
            THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) 
            ELSE NULL END) as avg_total_time,
          AVG(CASE WHEN status = 'COMPLETED' 
            THEN TIMESTAMPDIFF(MINUTE, created_at, called_at) 
            ELSE NULL END) as avg_wait_time,
          AVG(CASE WHEN status = 'COMPLETED' 
            THEN TIMESTAMPDIFF(MINUTE, called_at, served_at) 
            ELSE NULL END) as avg_service_time
        FROM queue
        WHERE DATE(created_at) = CURDATE()`
      );

      // Hourly distribution
      const [hourly] = await pool.execute(
        `SELECT 
          HOUR(created_at) as hour,
          COUNT(*) as count
        FROM queue
        WHERE DATE(created_at) = CURDATE()
        GROUP BY HOUR(created_at)
        ORDER BY hour`
      );

      // By appointment type
      const [byType] = await pool.execute(
        `SELECT 
          at.type_name,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.completed_at)) as avg_time
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE DATE(q.created_at) = CURDATE()
          AND q.status = 'COMPLETED'
        GROUP BY at.type_name`
      );

      // Peak hours (last 30 days)
      const [peakHours] = await pool.execute(
        `SELECT 
          HOUR(created_at) as hour,
          AVG(COUNT(*)) OVER() as avg_count,
          COUNT(*) as total_count
        FROM queue
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY HOUR(created_at)
        ORDER BY total_count DESC
        LIMIT 5`
      );

      res.json({
        success: true,
        stats: {
          today: {
            ...todayStats[0],
            avg_total_time: Math.round(todayStats[0].avg_total_time || 0),
            avg_wait_time: Math.round(todayStats[0].avg_wait_time || 0),
            avg_service_time: Math.round(todayStats[0].avg_service_time || 0)
          },
          hourly_distribution: hourly,
          by_appointment_type: byType,
          peak_hours: peakHours
        }
      });

    } catch (error) {
      console.error('Error fetching queue statistics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue statistics' 
      });
    }
});

// POST add patient to queue
router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('queueAdd'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { appointment_id, priority = 0 } = req.body;

      // Check if appointment exists and is suitable for queue
      const [appointment] = await connection.execute(
        `SELECT a.*, p.first_name, p.last_name, at.type_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.id = ?`,
        [appointment_id]
      );

      if (appointment.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found' 
        });
      }

      const appt = appointment[0];

      // Check if appointment is suitable for queue
      if (!['SCHEDULED', 'CONFIRMED'].includes(appt.status)) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: `Cannot add appointment with status '${appt.status}' to queue` 
        });
      }

      // Check if already in queue today
      const [existing] = await connection.execute(
        `SELECT id FROM queue 
         WHERE appointment_id = ? AND DATE(created_at) = CURDATE()`,
        [appointment_id]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Appointment is already in today\'s queue' 
        });
      }

      // Generate queue number
      const queue_number = await generateQueueNumber(connection);

      // Add to queue
      const [result] = await connection.execute(
        `INSERT INTO queue (
          appointment_id, queue_number, priority, status, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'WAITING', ?, NOW(), NOW())`,
        [appointment_id, queue_number, priority, req.user.id]
      );

      // Update appointment status to CONFIRMED if it was SCHEDULED
      if (appt.status === 'SCHEDULED') {
        await connection.execute(
          `UPDATE appointments SET status = 'CONFIRMED', updated_at = NOW() 
           WHERE id = ?`,
          [appointment_id]
        );
      }

      // Get created queue entry
      const [newQueue] = await connection.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        WHERE q.id = ?`,
        [result.insertId]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'INSERT',
        'queue',
        result.insertId,
        appt.patient_id,
        null,
        newQueue[0],
        `Added patient ${appt.first_name} ${appt.last_name} to queue (No. ${queue_number})`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Patient added to queue successfully',
        data: newQueue[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error adding to queue:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to add patient to queue' 
      });
    } finally {
      connection.release();
    }
});

// POST call next patient
router.post('/call-next', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Find next patient in queue
      const [nextPatients] = await connection.execute(
        `SELECT q.*, a.patient_id, a.appointment_number,
                p.first_name, p.last_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         WHERE DATE(q.created_at) = CURDATE()
           AND q.status = 'WAITING'
         ORDER BY q.priority DESC, q.queue_number ASC
         LIMIT 1`
      );

      if (nextPatients.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'No patients waiting in queue' 
        });
      }

      const nextPatient = nextPatients[0];

      // Update queue status
      await connection.execute(
        `UPDATE queue 
         SET status = 'CALLED', called_at = NOW(), updated_at = NOW() 
         WHERE id = ?`,
        [nextPatient.id]
      );

      // Update appointment status
      await connection.execute(
        `UPDATE appointments 
         SET status = 'IN_PROGRESS', updated_at = NOW() 
         WHERE id = ?`,
        [nextPatient.appointment_id]
      );

      // Get updated queue entry
      const [updated] = await connection.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.contact_number,
          at.type_name
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE q.id = ?`,
        [nextPatient.id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'CALL_NEXT',
        'queue',
        nextPatient.id,
        nextPatient.patient_id,
        { status: 'WAITING' },
        { status: 'CALLED' },
        `Called patient ${nextPatient.first_name} ${nextPatient.last_name} (No. ${nextPatient.queue_number})`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Next patient called successfully',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error calling next patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to call next patient' 
      });
    } finally {
      connection.release();
    }
});

// PUT start serving patient
router.put('/:id/start', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;

      // Check queue entry
      const [queue] = await connection.execute(
        `SELECT q.*, a.patient_id, a.appointment_id,
                p.first_name, p.last_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         WHERE q.id = ?`,
        [id]
      );

      if (queue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Queue entry not found' 
        });
      }

      const queueEntry = queue[0];

      if (queueEntry.status !== 'CALLED') {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: `Cannot start serving patient with status '${queueEntry.status}'` 
        });
      }

      // Update queue status
      await connection.execute(
        `UPDATE queue 
         SET status = 'SERVING', served_at = NOW(), updated_at = NOW() 
         WHERE id = ?`,
        [id]
      );

      // Get updated queue entry
      const [updated] = await connection.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        WHERE q.id = ?`,
        [id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'START_SERVING',
        'queue',
        id,
        queueEntry.patient_id,
        { status: 'CALLED' },
        { status: 'SERVING' },
        `Started serving patient ${queueEntry.first_name} ${queueEntry.last_name}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Started serving patient',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error starting service:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to start serving patient' 
      });
    } finally {
      connection.release();
    }
});

// PUT complete service
router.put('/:id/complete', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;

      // Check queue entry
      const [queue] = await connection.execute(
        `SELECT q.*, a.patient_id, a.appointment_id,
                p.first_name, p.last_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         WHERE q.id = ?`,
        [id]
      );

      if (queue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Queue entry not found' 
        });
      }

      const queueEntry = queue[0];

      if (queueEntry.status !== 'SERVING') {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: `Cannot complete service for patient with status '${queueEntry.status}'` 
        });
      }

      // Update queue status
      await connection.execute(
        `UPDATE queue 
         SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
         WHERE id = ?`,
        [id]
      );

      // Update appointment status
      await connection.execute(
        `UPDATE appointments 
         SET status = 'COMPLETED', updated_at = NOW() 
         WHERE id = ?`,
        [queueEntry.appointment_id]
      );

      // Get updated queue entry
      const [updated] = await connection.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          TIMESTAMPDIFF(MINUTE, q.called_at, q.completed_at) as total_service_time
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        WHERE q.id = ?`,
        [id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'COMPLETE_SERVICE',
        'queue',
        id,
        queueEntry.patient_id,
        { status: 'SERVING' },
        { status: 'COMPLETED' },
        `Completed service for patient ${queueEntry.first_name} ${queueEntry.last_name}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Service completed successfully',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error completing service:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to complete service' 
      });
    } finally {
      connection.release();
    }
});

// PUT skip patient
router.put('/:id/skip', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { reason } = req.body;

      // Check queue entry
      const [queue] = await connection.execute(
        `SELECT q.*, a.patient_id, a.appointment_id,
                p.first_name, p.last_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         WHERE q.id = ?`,
        [id]
      );

      if (queue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Queue entry not found' 
        });
      }

      const queueEntry = queue[0];

      if (!['WAITING', 'CALLED'].includes(queueEntry.status)) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: `Cannot skip patient with status '${queueEntry.status}'` 
        });
      }

      // Update queue status
      await connection.execute(
        `UPDATE queue 
         SET status = 'SKIPPED', updated_at = NOW() 
         WHERE id = ?`,
        [id]
      );

      // Optionally update appointment status (keep as CONFIRMED or change to NO_SHOW?)
      // For now, leave appointment status as is

      // Log audit
      await logAudit(
        req.user.id,
        'SKIP',
        'queue',
        id,
        queueEntry.patient_id,
        { status: queueEntry.status },
        { status: 'SKIPPED' },
        `Skipped patient ${queueEntry.first_name} ${queueEntry.last_name}${reason ? ': ' + reason : ''}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Patient skipped successfully',
        data: {
          id: queueEntry.id,
          queue_number: queueEntry.queue_number,
          status: 'SKIPPED',
          patient_name: `${queueEntry.first_name} ${queueEntry.last_name}`
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error skipping patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to skip patient' 
      });
    } finally {
      connection.release();
    }
});

// DELETE remove from queue (Admin only)
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;

      // Check queue entry
      const [queue] = await connection.execute(
        `SELECT q.*, a.patient_id, a.appointment_id,
                p.first_name, p.last_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         WHERE q.id = ?`,
        [id]
      );

      if (queue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Queue entry not found' 
        });
      }

      const queueEntry = queue[0];

      // Log audit before deletion
      await logAudit(
        req.user.id,
        'DELETE',
        'queue',
        id,
        queueEntry.patient_id,
        queueEntry,
        null,
        `Removed patient ${queueEntry.first_name} ${queueEntry.last_name} from queue`,
        req
      );

      // Delete queue entry
      await connection.execute(
        'DELETE FROM queue WHERE id = ?',
        [id]
      );

      await connection.commit();

      res.json({ 
        success: true,
        message: 'Patient removed from queue successfully',
        deleted_entry: {
          id: queueEntry.id,
          queue_number: queueEntry.queue_number,
          patient_name: `${queueEntry.first_name} ${queueEntry.last_name}`
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error removing from queue:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to remove patient from queue' 
      });
    } finally {
      connection.release();
    }
});

module.exports = router;