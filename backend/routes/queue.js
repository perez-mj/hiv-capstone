// backend/routes/queue.js - UPDATED VERSION
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
        q.queue_number,
        q.status,
        q.called_at,
        p.first_name,
        p.last_name,
        CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as display_name,
        at.type_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        CASE q.status
          WHEN 'SERVING' THEN 1
          WHEN 'CALLED' THEN 2
          ELSE 3
        END,
        q.queue_number ASC`
    );

    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    console.error('Error fetching queue display:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

// GET /api/queue/current - CURRENT QUEUE STATUS
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
        creator.username as created_by_username,
        updater.username as updated_by_username
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN users creator ON q.created_by = creator.id
      LEFT JOIN users updater ON q.updated_by = updater.id
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

    // Group by status
    const grouped = {
      waiting: queue.filter(q => q.status === 'WAITING'),
      called: queue.filter(q => q.status === 'CALLED'),
      serving: queue.filter(q => q.status === 'SERVING')
    };

    res.json({
      success: true,
      data: grouped,
      now_serving: nowServing ? {
        number: nowServing.queue_number,
        name: `${nowServing.patient_first_name} ${nowServing.patient_last_name}`,
        type: nowServing.type_name
      } : null,
      stats: {
        waiting_count: waitingCount,
        called_count: calledCount,
        serving_count: grouped.serving.length,
        total_in_queue: queue.length,
        estimated_total_wait: estimatedWaitTime
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

// GET /api/queue - All queue (Admin/Nurse only)
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
          creator.username as created_by_username,
          updater.username as updated_by_username
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users creator ON q.created_by = creator.id
        LEFT JOIN users updater ON q.updated_by = updater.id
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

// GET /api/queue/patient/me - Patient's own queue status
router.get('/patient/me', 
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
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
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
      // Convert to integers for safe concatenation
      const limitNum = parseInt(limit) || 20;
      const offsetNum = parseInt(offset) || 0;
      
      const { start_date, end_date, status } = req.query;

      console.log('Fetching queue history with params:', { 
        page, limit, offset, start_date, end_date, status 
      });

      let query = `
        SELECT 
          q.*,
          a.appointment_number,
          a.scheduled_at,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          at.type_name,
          creator.username as created_by_username,
          TIMESTAMPDIFF(MINUTE, q.called_at, q.served_at) as service_duration,
          TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at) as wait_duration
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users creator ON q.created_by = creator.id
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
        // Handle comma-separated status values
        const statusArray = status.split(',');
        if (statusArray.length > 1) {
          query += ` AND q.status IN (${statusArray.map(() => '?').join(', ')})`;
          params.push(...statusArray);
        } else {
          query += ` AND q.status = ?`;
          params.push(status);
        }
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM queue q/,
        'SELECT COUNT(*) as total FROM queue q'
      );
      
      console.log('Count query:', countQuery);
      console.log('Count params:', params);

      let countResult;
      try {
        if (params.length > 0) {
          [countResult] = await pool.execute(countQuery, params);
        } else {
          [countResult] = await pool.query(countQuery);
        }
        
        console.log('Count result:', countResult);
      } catch (countError) {
        console.error('Error executing count query:', countError);
        // Fallback to a simple count without filters if complex query fails
        const [simpleCount] = await pool.execute(
          'SELECT COUNT(*) as total FROM queue'
        );
        countResult = simpleCount;
      }

      // Ensure countResult exists and has the expected structure
      if (!countResult || !Array.isArray(countResult) || countResult.length === 0) {
        console.error('Invalid count result:', countResult);
        countResult = [{ total: 0 }];
      }

      const total = countResult[0]?.total || 0;

      // Add pagination - use string concatenation for LIMIT and OFFSET
      query += ` ORDER BY q.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      console.log('Main query:', query);
      console.log('Main params:', params);

      // Execute the main query
      let history = [];
      try {
        if (params.length > 0) {
          [history] = await pool.execute(query, params);
        } else {
          [history] = await pool.query(query);
        }
        console.log(`Found ${history.length} history entries`);
      } catch (mainError) {
        console.error('Error executing main query:', mainError);
        history = [];
      }

      // Calculate summary statistics
      let summary = [{ avg_wait_time: 0, avg_service_time: 0, total_served: 0, skipped_count: 0 }];
      try {
        const [summaryResult] = await pool.execute(
          `SELECT 
            AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as avg_wait_time,
            AVG(TIMESTAMPDIFF(MINUTE, called_at, served_at)) as avg_service_time,
            COUNT(*) as total_served,
            SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_count
          FROM queue
          WHERE DATE(created_at) = CURDATE()`
        );
        summary = summaryResult || summary;
      } catch (summaryError) {
        console.error('Error fetching summary stats:', summaryError);
      }

      res.json({
        success: true,
        data: history,
        summary: {
          avg_wait_time: Math.round(summary[0]?.avg_wait_time || 0),
          avg_service_time: Math.round(summary[0]?.avg_service_time || 0),
          total_served: summary[0]?.total_served || 0,
          skipped_count: summary[0]?.skipped_count || 0
        },
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Error fetching queue history:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue history',
        details: error.message 
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

// POST add walk-in patient to queue (no appointment)
router.post('/walkin', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        patient_id,
        appointment_type_id,
        notes
      } = req.body;

      // Validate required fields
      if (!patient_id || !appointment_type_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Patient ID and appointment type are required'
        });
      }

      // Check if patient exists
      const [patient] = await connection.execute(
        'SELECT id, first_name, last_name FROM patients WHERE id = ?',
        [patient_id]
      );

      if (patient.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Patient not found' 
        });
      }

      // Check if appointment type exists
      const [appType] = await connection.execute(
        'SELECT * FROM appointment_types WHERE id = ? AND is_active = 1',
        [appointment_type_id]
      );

      if (appType.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment type not found or inactive' 
        });
      }

      // Check if patient is already in queue today
      const [existingInQueue] = await connection.execute(
        `SELECT q.id 
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         WHERE a.patient_id = ? 
           AND DATE(q.created_at) = CURDATE()
           AND q.status IN ('WAITING', 'CALLED', 'SERVING')`,
        [patient_id]
      );

      if (existingInQueue.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Patient is already in today\'s queue' 
        });
      }

      // Generate appointment number for walk-in
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const datePrefix = `W${year}${month}${day}`; // 'W' prefix for walk-in
      
      const [lastAppointment] = await connection.execute(
        `SELECT appointment_number FROM appointments 
         WHERE appointment_number LIKE ? 
         ORDER BY id DESC LIMIT 1`,
        [`${datePrefix}%`]
      );

      let sequence = 1;
      if (lastAppointment.length > 0) {
        const lastSeq = parseInt(lastAppointment[0].appointment_number.split('-')[1]);
        sequence = lastSeq + 1;
      }
      
      const appointmentNumber = `${datePrefix}-${String(sequence).padStart(4, '0')}`;

      // Create a temporary appointment for walk-in
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + 5); // Set 5 minutes from now

      const [appointmentResult] = await connection.execute(
        `INSERT INTO appointments (
          appointment_number, patient_id, appointment_type_id, 
          scheduled_at, notes, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, NOW(), NOW())`,
        [
          appointmentNumber,
          patient_id,
          appointment_type_id,
          scheduledAt,
          notes || 'Walk-in patient',
          req.user.id
        ]
      );

      // Generate queue number
      const [lastQueue] = await connection.execute(
        `SELECT MAX(queue_number) as max_num 
         FROM queue 
         WHERE DATE(created_at) = CURDATE()`
      );
      
      const queueNumber = (lastQueue[0].max_num || 0) + 1;

      // Add to queue
      const [queueResult] = await connection.execute(
        `INSERT INTO queue (
          appointment_id, queue_number, priority, status, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'WAITING', ?, NOW(), NOW())`,
        [appointmentResult.insertId, queueNumber, 0, req.user.id]
      );

      // Get created queue entry with patient info
      const [newQueue] = await connection.execute(
        `SELECT 
          q.*,
          a.appointment_number,
          a.notes as appointment_notes,
          p.id as patient_id,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.contact_number,
          at.type_name,
          at.duration_minutes
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE q.id = ?`,
        [queueResult.insertId]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'WALKIN_ADD',
        'queue',
        queueResult.insertId,
        patient_id,
        null,
        newQueue[0],
        `Added walk-in patient ${patient[0].first_name} ${patient[0].last_name} to queue (No. ${queueNumber})`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Walk-in patient added to queue successfully',
        data: newQueue[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error adding walk-in patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to add walk-in patient to queue' 
      });
    } finally {
      connection.release();
    }
});

// POST confirm appointment and add to queue
router.post('/confirm/:appointmentId', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { appointmentId } = req.params;

      // Check if appointment exists and is in SCHEDULED status
      const [appointment] = await connection.execute(
        `SELECT a.*, p.first_name, p.last_name, at.type_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.id = ?`,
        [appointmentId]
      );

      if (appointment.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found' 
        });
      }

      const appt = appointment[0];

      // Check if appointment is suitable for confirmation
      if (appt.status !== 'SCHEDULED') {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: `Cannot confirm appointment with status '${appt.status}'` 
        });
      }

      // Check if already in queue today
      const [existing] = await connection.execute(
        `SELECT id FROM queue 
         WHERE appointment_id = ? AND DATE(created_at) = CURDATE()`,
        [appointmentId]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Appointment is already in today\'s queue' 
        });
      }

      // Update appointment status to CONFIRMED
      await connection.execute(
        `UPDATE appointments 
         SET status = 'CONFIRMED', updated_at = NOW(), updated_by = ? 
         WHERE id = ?`,
        [req.user.id, appointmentId]
      );

      // Generate queue number for today
      const [lastQueue] = await connection.execute(
        `SELECT MAX(queue_number) as max_num 
         FROM queue 
         WHERE DATE(created_at) = CURDATE()`
      );
      
      const queueNumber = (lastQueue[0].max_num || 0) + 1;

      // Add to queue
      const [queueResult] = await connection.execute(
        `INSERT INTO queue (
          appointment_id, queue_number, priority, status, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'WAITING', ?, NOW(), NOW())`,
        [appointmentId, queueNumber, 0, req.user.id]
      );

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
        [queueResult.insertId]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'CONFIRM_AND_ADD_TO_QUEUE',
        'queue',
        queueResult.insertId,
        appt.patient_id,
        { status: appt.status },
        { status: 'CONFIRMED', queue_number: queueNumber },
        `Confirmed appointment for ${appt.first_name} ${appt.last_name} and added to queue (No. ${queueNumber})`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Appointment confirmed and added to queue successfully',
        data: {
          appointment: {
            id: appt.id,
            status: 'CONFIRMED'
          },
          queue: newQueue[0]
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error confirming appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to confirm appointment' 
      });
    } finally {
      connection.release();
    }
});

// POST call patient (with ID or 'next')
router.post('/call/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;

      if (id === 'next') {
        // Call next patient
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
           SET status = 'CALLED', called_at = NOW(), updated_by = ?, updated_at = NOW() 
           WHERE id = ?`,
          [req.user.id, nextPatient.id]
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

        return res.json({
          success: true,
          message: 'Next patient called successfully',
          data: updated[0]
        });
      } else {
        // Call specific patient by ID
        const [patient] = await connection.execute(
          `SELECT q.*, a.patient_id, a.appointment_number,
                  p.first_name, p.last_name
           FROM queue q
           JOIN appointments a ON q.appointment_id = a.id
           JOIN patients p ON a.patient_id = p.id
           WHERE q.id = ?`,
          [id]
        );

        if (patient.length === 0) {
          await connection.rollback();
          return res.status(404).json({ 
            success: false,
            error: 'Queue entry not found' 
          });
        }

        const queueEntry = patient[0];

        if (queueEntry.status !== 'WAITING') {
          await connection.rollback();
          return res.status(400).json({ 
            success: false,
            error: `Cannot call patient with status '${queueEntry.status}'` 
          });
        }

        // Update queue status
        await connection.execute(
          `UPDATE queue 
           SET status = 'CALLED', called_at = NOW(), updated_by = ?, updated_at = NOW() 
           WHERE id = ?`,
          [req.user.id, id]
        );

        // Update appointment status
        await connection.execute(
          `UPDATE appointments 
           SET status = 'IN_PROGRESS', updated_at = NOW() 
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
            at.type_name
          FROM queue q
          JOIN appointments a ON q.appointment_id = a.id
          JOIN patients p ON a.patient_id = p.id
          JOIN appointment_types at ON a.appointment_type_id = at.id
          WHERE q.id = ?`,
          [id]
        );

        // Log audit
        await logAudit(
          req.user.id,
          'CALL',
          'queue',
          id,
          queueEntry.patient_id,
          { status: queueEntry.status },
          { status: 'CALLED' },
          `Called patient ${queueEntry.first_name} ${queueEntry.last_name} (No. ${queueEntry.queue_number})`,
          req
        );

        await connection.commit();

        res.json({
          success: true,
          message: 'Patient called successfully',
          data: updated[0]
        });
      }

    } catch (error) {
      await connection.rollback();
      console.error('Error calling patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to call patient' 
      });
    } finally {
      connection.release();
    }
});

// POST start serving patient
router.post('/start-serving/:id', 
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
         SET status = 'SERVING', served_at = NOW(), updated_by = ?, updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, id]
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

// POST complete serving patient
router.post('/complete/:id', 
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
         SET status = 'COMPLETED', completed_at = NOW(), updated_by = ?, updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, id]
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

// POST skip patient
router.post('/skip/:id', 
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
         SET status = 'SKIPPED', updated_by = ?, updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, id]
      );

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

// POST reorder queue (update priority)
router.post('/reorder', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { queue_id, priority } = req.body;

      const [queue] = await connection.execute(
        `SELECT q.*, a.patient_id
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         WHERE q.id = ?`,
        [queue_id]
      );

      if (queue.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Queue entry not found' 
        });
      }

      const oldPriority = queue[0].priority;

      await connection.execute(
        `UPDATE queue 
         SET priority = ?, updated_by = ?, updated_at = NOW() 
         WHERE id = ?`,
        [priority, req.user.id, queue_id]
      );

      await logAudit(
        req.user.id,
        'UPDATE_PRIORITY',
        'queue',
        queue_id,
        queue[0].patient_id,
        { priority: oldPriority },
        { priority },
        `Updated queue priority from ${oldPriority} to ${priority}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Queue priority updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error reordering queue:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to reorder queue' 
      });
    } finally {
      connection.release();
    }
});

// DELETE reset queue (with filters)
router.delete('/reset', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { appointment_id, date } = req.query;

      let whereClause = '';
      const params = [];

      if (appointment_id) {
        whereClause = 'WHERE appointment_id = ?';
        params.push(appointment_id);
      } else if (date) {
        whereClause = 'WHERE DATE(created_at) = ?';
        params.push(date);
      } else {
        // Default to today
        whereClause = 'WHERE DATE(created_at) = CURDATE()';
      }

      const [queueEntries] = await connection.execute(
        `SELECT q.*, a.patient_id, p.first_name, p.last_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         ${whereClause}`,
        params
      );

      if (queueEntries.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'No queue entries found to reset' 
        });
      }

      // Log audit for each entry
      for (const entry of queueEntries) {
        await logAudit(
          req.user.id,
          'DELETE',
          'queue',
          entry.id,
          entry.patient_id,
          entry,
          null,
          `Reset queue entry for patient ${entry.first_name} ${entry.last_name}`,
          req
        );
      }

      // Delete queue entries
      await connection.execute(
        `DELETE FROM queue ${whereClause}`,
        params
      );

      await connection.commit();

      res.json({ 
        success: true,
        message: `Successfully reset ${queueEntries.length} queue entries`,
        count: queueEntries.length
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error resetting queue:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to reset queue' 
      });
    } finally {
      connection.release();
    }
});

// GET queue summary
router.get('/current/summary', 
  authenticateToken,
  async (req, res) => {
    try {
      const [summary] = await pool.execute(
        `SELECT 
          COUNT(*) as total_in_queue,
          SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
          SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called,
          SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving,
          MIN(CASE WHEN status = 'WAITING' THEN queue_number ELSE NULL END) as next_number
        FROM queue
        WHERE DATE(created_at) = CURDATE()
          AND status IN ('WAITING', 'CALLED', 'SERVING')`
      );

      res.json({
        success: true,
        data: summary[0]
      });

    } catch (error) {
      console.error('Error fetching queue summary:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue summary' 
      });
    }
});

// GET check if appointment is in queue
router.get('/check-appointment/:appointmentId', 
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      const [queue] = await pool.execute(
        `SELECT q.*, 
          (SELECT COUNT(*) + 1 
           FROM queue q2 
           WHERE DATE(q2.created_at) = CURDATE() 
             AND q2.status IN ('WAITING', 'CALLED')
             AND q2.queue_number < q.queue_number) as position
         FROM queue q
         WHERE q.appointment_id = ?
           AND DATE(q.created_at) = CURDATE()
           AND q.status IN ('WAITING', 'CALLED', 'SERVING')`,
        [appointmentId]
      );

      if (queue.length === 0) {
        return res.json({
          success: true,
          in_queue: false
        });
      }

      res.json({
        success: true,
        in_queue: true,
        data: queue[0]
      });

    } catch (error) {
      console.error('Error checking appointment in queue:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to check appointment in queue' 
      });
    }
});

// GET daily stats
router.get('/stats/daily', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      let query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
          AVG(CASE WHEN status = 'COMPLETED' 
            THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) 
            ELSE NULL END) as avg_total_time
        FROM queue
        WHERE 1=1
      `;
      
      const params = [];

      if (start_date) {
        query += ` AND DATE(created_at) >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND DATE(created_at) <= ?`;
        params.push(end_date);
      }

      query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;

      const [stats] = await pool.execute(query, params);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching daily stats:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch daily stats' 
      });
    }
});

// GET peak hours stats
router.get('/stats/peak-hours', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [peakHours] = await pool.execute(
        `SELECT 
          HOUR(created_at) as hour,
          COUNT(*) as total_count,
          AVG(COUNT(*)) OVER() as avg_count
        FROM queue
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY HOUR(created_at)
        ORDER BY total_count DESC`
      );

      res.json({
        success: true,
        data: peakHours
      });

    } catch (error) {
      console.error('Error fetching peak hours stats:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch peak hours stats' 
      });
    }
});

module.exports = router;