// backend/routes/appointments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination, validateDateRange } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { generateAppointmentNumber, formatDate, paginate } = require('../utils/helpers');

// ==================== APPOINTMENT TYPES ROUTES ====================

// GET all appointment types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const [types] = await pool.execute(
      `SELECT * FROM appointment_types 
       WHERE is_active = 1 
       ORDER BY type_name`
    );
    
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch appointment types' 
    });
  }
});

// CREATE appointment type (Admin only)
router.post('/types', 
  authenticateToken, 
  authorize('ADMIN'),
  validate('appointmentTypeCreate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { type_name, description, duration_minutes } = req.body;

      // Check if type already exists
      const [existing] = await connection.execute(
        'SELECT id FROM appointment_types WHERE type_name = ?',
        [type_name]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Appointment type already exists' 
        });
      }

      const [result] = await connection.execute(
        `INSERT INTO appointment_types (type_name, description, duration_minutes, is_active, created_at) 
         VALUES (?, ?, ?, 1, NOW())`,
        [type_name, description || null, duration_minutes]
      );

      const [newType] = await connection.execute(
        'SELECT * FROM appointment_types WHERE id = ?',
        [result.insertId]
      );

      await logAudit(
        req.user.id,
        'INSERT',
        'appointment_types',
        result.insertId,
        null,
        null,
        newType[0],
        `Created appointment type: ${type_name}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Appointment type created successfully',
        data: newType[0]
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating appointment type:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create appointment type' 
      });
    } finally {
      connection.release();
    }
});

// UPDATE appointment type (Admin only)
router.put('/types/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  validate('appointmentTypeUpdate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { type_name, description, duration_minutes, is_active } = req.body;

      // Get old values
      const [existing] = await connection.execute(
        'SELECT * FROM appointment_types WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment type not found' 
        });
      }

      // Check if new type name conflicts
      if (type_name && type_name !== existing[0].type_name) {
        const [conflict] = await connection.execute(
          'SELECT id FROM appointment_types WHERE type_name = ? AND id != ?',
          [type_name, id]
        );

        if (conflict.length > 0) {
          await connection.rollback();
          return res.status(400).json({ 
            success: false,
            error: 'Appointment type name already exists' 
          });
        }
      }

      const updateFields = [];
      const values = [];

      if (type_name !== undefined) {
        updateFields.push('type_name = ?');
        values.push(type_name);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        values.push(description);
      }
      if (duration_minutes !== undefined) {
        updateFields.push('duration_minutes = ?');
        values.push(duration_minutes);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        values.push(is_active);
      }

      if (updateFields.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'No fields to update' 
        });
      }

      values.push(id);

      await connection.execute(
        `UPDATE appointment_types SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      const [updated] = await connection.execute(
        'SELECT * FROM appointment_types WHERE id = ?',
        [id]
      );

      await logAudit(
        req.user.id,
        'UPDATE',
        'appointment_types',
        id,
        null,
        existing[0],
        updated[0],
        `Updated appointment type: ${updated[0].type_name}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Appointment type updated successfully',
        data: updated[0]
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating appointment type:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update appointment type' 
      });
    } finally {
      connection.release();
    }
});

// DELETE appointment type (Admin only)
router.delete('/types/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const { id } = req.params;

      // Check if type is used in appointments
      const [appointments] = await connection.execute(
        'SELECT id FROM appointments WHERE appointment_type_id = ? LIMIT 1',
        [id]
      );

      if (appointments.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Cannot delete appointment type that is in use' 
        });
      }

      const [type] = await connection.execute(
        'SELECT * FROM appointment_types WHERE id = ?',
        [id]
      );

      if (type.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment type not found' 
        });
      }

      await connection.execute(
        'DELETE FROM appointment_types WHERE id = ?',
        [id]
      );

      await logAudit(
        req.user.id,
        'DELETE',
        'appointment_types',
        id,
        null,
        type[0],
        null,
        `Deleted appointment type: ${type[0].type_name}`,
        req
      );

      await connection.commit();

      res.json({ 
        success: true,
        message: 'Appointment type deleted successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting appointment type:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete appointment type' 
      });
    } finally {
      connection.release();
    }
});

// ==================== CHECK AVAILABILITY ROUTE ====================
// ADD THIS ROUTE - for checking available time slots

/**
 * GET /api/appointments/check-availability
 * Check available time slots for a specific date and appointment type
 */
router.get('/check-availability', authenticateToken, async (req, res) => {
  try {
    const { date, type_id } = req.query;
    
    console.log('Checking availability for:', { date, type_id });
    
    if (!date || !type_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date and appointment type are required' 
      });
    }

    // Get appointment type duration
    const [typeResult] = await pool.execute(
      'SELECT duration_minutes FROM appointment_types WHERE id = ?',
      [type_id]
    );

    if (typeResult.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Appointment type not found' 
      });
    }

    const duration = typeResult[0].duration_minutes || 30;

    // Generate time slots (8:00 AM to 5:00 PM)
    const slots = [];
    const startHour = 8; // 8 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) { // Every 30 minutes
        // Skip 12:30 PM - 1:00 PM (lunch break)
        if (hour === 12 && minute === 30) continue;
        if (hour === 13 && minute === 0) continue;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if slot is already booked
        const [booked] = await pool.execute(
          `SELECT COUNT(*) as count FROM appointments 
           WHERE DATE(scheduled_at) = ? 
           AND HOUR(scheduled_at) = ? 
           AND MINUTE(scheduled_at) = ?
           AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
          [date, hour, minute]
        );

        // Max 3 appointments per time slot (adjust based on your clinic capacity)
        const maxPerSlot = 3;
        const isAvailable = booked[0].count < maxPerSlot;
        const bookedCount = booked[0].count;

        slots.push({
          time: timeString,
          available: isAvailable,
          bookedCount: bookedCount,
          maxCapacity: maxPerSlot,
          display: `${timeString} (${isAvailable ? `${maxPerSlot - bookedCount} slots available` : 'Fully Booked'})`
        });
      }
    }

    // Also check for already booked slots by this patient on this day
    let patientId = null;
    if (req.user.role === 'PATIENT') {
      const [patient] = await pool.execute(
        'SELECT id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      if (patient.length > 0) {
        patientId = patient[0].id;
      }
    }

    res.json({ 
      success: true, 
      data: {
        date,
        type_id,
        type_name: typeResult[0].type_name,
        duration,
        slots: slots,
        patientHasBooking: patientId ? await checkPatientBooking(pool, patientId, date) : false
      }
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check availability',
      details: error.message 
    });
  }
});

// Helper function to check if patient already has a booking on this date
async function checkPatientBooking(pool, patientId, date) {
  const [result] = await pool.execute(
    `SELECT COUNT(*) as count FROM appointments 
     WHERE patient_id = ? 
     AND DATE(scheduled_at) = ?
     AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
    [patientId, date]
  );
  return result[0].count > 0;
}

// ==================== PATIENT SPECIFIC ROUTES ====================

/**
 * GET /api/appointments/patient/me/history
 * Get appointment history for the currently logged-in patient
 */
router.get('/patient/me/history', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching appointment history for patient user:', req.user.id);

    // Only PATIENT role can access this
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Patient access only.' 
      });
    }

    // Get patient_id from users table
    const [patients] = await pool.execute(
      'SELECT id, patient_facility_code, first_name, last_name FROM patients WHERE user_id = ?',
      [req.user.id]
    );

    if (patients.length === 0) {
      console.log('No patient record found for user:', req.user.id);
      return res.json({
        success: true,
        data: [],
        message: 'No patient record found'
      });
    }

    const patientId = patients[0].id;
    console.log('Patient ID found:', patientId);

    // Get all appointments for this patient
    const [appointments] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_number,
        a.scheduled_at,
        a.status,
        a.notes,
        a.created_at,
        at.id as appointment_type_id,
        at.type_name,
        at.duration_minutes,
        at.description as type_description,
        q.id as queue_id,
        q.queue_number,
        q.status as queue_status,
        q.called_at,
        q.served_at,
        q.completed_at,
        DATEDIFF(a.scheduled_at, CURDATE()) as days_from_now
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ?
      ORDER BY 
        CASE 
          WHEN a.status IN ('SCHEDULED', 'CONFIRMED') THEN 1
          WHEN a.status = 'IN_PROGRESS' THEN 2
          WHEN a.status = 'COMPLETED' THEN 3
          ELSE 4
        END,
        a.scheduled_at DESC`,
      [patientId]
    );

    console.log(`Found ${appointments.length} appointments for patient`);

    // Separate into upcoming and past
    const now = new Date();
    const upcoming = appointments.filter(a => {
      const scheduled = new Date(a.scheduled_at);
      return scheduled >= now && ['SCHEDULED', 'CONFIRMED'].includes(a.status);
    });

    const past = appointments.filter(a => {
      const scheduled = new Date(a.scheduled_at);
      return scheduled < now || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status);
    });

    res.json({
      success: true,
      data: appointments,
      summary: {
        total: appointments.length,
        upcoming: upcoming.length,
        past: past.length,
        patient_info: {
          id: patients[0].id,
          facility_code: patients[0].patient_facility_code,
          name: `${patients[0].first_name} ${patients[0].last_name}`
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patient appointment history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch appointment history' 
    });
  }
});

/**
 * GET /api/appointments/patient/me/upcoming
 * Get upcoming appointments for the currently logged-in patient
 */
router.get('/patient/me/upcoming', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching upcoming appointments for patient user:', req.user.id);

    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Patient access only.' 
      });
    }

    const [patients] = await pool.execute(
      'SELECT id FROM patients WHERE user_id = ?',
      [req.user.id]
    );

    if (patients.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const patientId = patients[0].id;

    const [appointments] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_number,
        a.scheduled_at,
        a.status,
        a.notes,
        at.type_name,
        at.duration_minutes,
        q.queue_number,
        q.status as queue_status,
        TIMESTAMPDIFF(HOUR, NOW(), a.scheduled_at) as hours_until
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ? 
        AND a.scheduled_at >= NOW() 
        AND a.status IN ('SCHEDULED', 'CONFIRMED')
      ORDER BY a.scheduled_at ASC
      LIMIT 10`,
      [patientId]
    );

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch upcoming appointments' 
    });
  }
});

/**
 * POST /api/appointments/patient/me/book
 * Book a new appointment for the currently logged-in patient
 */
router.post('/patient/me/book', 
  authenticateToken,
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      console.log('Patient booking appointment:', req.body);

      if (req.user.role !== 'PATIENT') {
        await connection.rollback();
        return res.status(403).json({ 
          success: false,
          error: 'Access denied. Patient access only.' 
        });
      }

      // Get patient_id
      const [patients] = await connection.execute(
        'SELECT id FROM patients WHERE user_id = ?',
        [req.user.id]
      );

      if (patients.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Patient record not found' 
        });
      }

      const patientId = patients[0].id;
      const { appointment_type_id, scheduled_at, notes } = req.body;

      // Validate required fields
      if (!appointment_type_id || !scheduled_at) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Appointment type and scheduled date are required'
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
          error: 'Appointment type not found' 
        });
      }

      // Check for conflicting appointments
      const scheduledDate = new Date(scheduled_at);
      const startOfDay = new Date(scheduledDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(scheduledDate);
      endOfDay.setHours(23, 59, 59, 999);

      const [conflicts] = await connection.execute(
        `SELECT id FROM appointments 
         WHERE patient_id = ? 
           AND scheduled_at BETWEEN ? AND ?
           AND status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')`,
        [patientId, startOfDay, endOfDay]
      );

      if (conflicts.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'You already have an appointment scheduled on this day' 
        });
      }

      // Check if the specific time slot is still available
      const appointmentHour = scheduledDate.getHours();
      const appointmentMinute = scheduledDate.getMinutes();
      
      const [slotBooked] = await connection.execute(
        `SELECT COUNT(*) as count FROM appointments 
         WHERE DATE(scheduled_at) = ? 
         AND HOUR(scheduled_at) = ? 
         AND MINUTE(scheduled_at) = ?
         AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [scheduled_at.split('T')[0], appointmentHour, appointmentMinute]
      );

      const maxPerSlot = 3;
      if (slotBooked[0].count >= maxPerSlot) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'This time slot is already fully booked. Please choose another time.' 
        });
      }

      // Generate appointment number
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;
      
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

      // Create appointment
      const [result] = await connection.execute(
        `INSERT INTO appointments (
          appointment_number, patient_id, appointment_type_id, 
          scheduled_at, notes, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, NOW(), NOW())`,
        [
          appointmentNumber,
          patientId,
          appointment_type_id,
          scheduled_at,
          notes || null,
          req.user.id
        ]
      );

      const appointmentId = result.insertId;

      // Create queue entry
      await connection.execute(
        `INSERT INTO queue (appointment_id, queue_number, status, created_at)
         SELECT ?, COALESCE(MAX(queue_number), 0) + 1, 'WAITING', NOW()
         FROM queue WHERE DATE(created_at) = CURDATE()`,
        [appointmentId]
      );

      // Get created appointment
      const [newAppointment] = await connection.execute(
        `SELECT a.*, at.type_name, at.duration_minutes, q.queue_number
         FROM appointments a
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         LEFT JOIN queue q ON a.id = q.appointment_id
         WHERE a.id = ?`,
        [appointmentId]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'INSERT',
        'appointments',
        appointmentId,
        patientId,
        null,
        newAppointment[0],
        `Patient booked appointment: ${appointmentNumber}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: newAppointment[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error booking appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to book appointment' 
      });
    } finally {
      connection.release();
    }
});

/**
 * GET /api/appointments/patient/me/next
 * Get next upcoming appointment for the currently logged-in patient
 */
router.get('/patient/me/next', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Patient access only.' 
      });
    }

    const [patients] = await pool.execute(
      'SELECT id FROM patients WHERE user_id = ?',
      [req.user.id]
    );

    if (patients.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const patientId = patients[0].id;

    const [appointments] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_number,
        a.scheduled_at,
        a.status,
        at.type_name,
        at.duration_minutes,
        q.queue_number,
        q.status as queue_status,
        TIMESTAMPDIFF(MINUTE, NOW(), a.scheduled_at) as minutes_until
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ? 
        AND a.scheduled_at >= NOW() 
        AND a.status IN ('SCHEDULED', 'CONFIRMED')
      ORDER BY a.scheduled_at ASC
      LIMIT 1`,
      [patientId]
    );

    res.json({
      success: true,
      data: appointments[0] || null
    });

  } catch (error) {
    console.error('Error fetching next appointment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch next appointment' 
    });
  }
});

/**
 * DELETE /api/appointments/patient/me/cancel/:id
 * Cancel an appointment for the currently logged-in patient
 */
router.delete('/patient/me/cancel/:id', 
  authenticateToken,
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      if (req.user.role !== 'PATIENT') {
        await connection.rollback();
        return res.status(403).json({ 
          success: false,
          error: 'Access denied. Patient access only.' 
        });
      }

      // Get patient_id
      const [patients] = await connection.execute(
        'SELECT id FROM patients WHERE user_id = ?',
        [req.user.id]
      );

      if (patients.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Patient record not found' 
        });
      }

      const patientId = patients[0].id;
      const appointmentId = req.params.id;

      // Check if appointment belongs to patient and can be cancelled
      const [appointment] = await connection.execute(
        `SELECT * FROM appointments 
         WHERE id = ? AND patient_id = ? AND status IN ('SCHEDULED', 'CONFIRMED')`,
        [appointmentId, patientId]
      );

      if (appointment.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found or cannot be cancelled' 
        });
      }

      // Update appointment status
      await connection.execute(
        `UPDATE appointments SET status = 'CANCELLED', updated_by = ?, updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, appointmentId]
      );

      // Update queue if exists
      await connection.execute(
        `UPDATE queue SET status = 'SKIPPED', updated_at = NOW() 
         WHERE appointment_id = ?`,
        [appointmentId]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'CANCEL',
        'appointments',
        appointmentId,
        patientId,
        { status: appointment[0].status },
        { status: 'CANCELLED' },
        `Patient cancelled appointment: ${appointment[0].appointment_number}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Appointment cancelled successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error cancelling appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to cancel appointment' 
      });
    } finally {
      connection.release();
    }
});

// ==================== REGULAR APPOINTMENTS ROUTES ====================

// GET all appointments with filters
router.get('/', 
  authenticateToken, 
  validatePagination,
  validateDateRange,
  async (req, res) => {
    try {
      const { page, limit, offset } = req.pagination;
      const { dateRange } = req;
      
      // Convert to integers for safe concatenation
      const limitNum = parseInt(limit) || 100;
      const offsetNum = parseInt(offset) || 0;
      
      const {
        status,
        patient_id,
        type_id,
        search
      } = req.query;

      console.log('Fetching appointments with params:', { 
        page, limit, offset, 
        status, patient_id, type_id, search,
        dateRange 
      });

      let query = `
        SELECT 
          a.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.contact_number as patient_contact,
          at.type_name,
          at.duration_minutes,
          at.description as type_description,
          u.username as created_by_username,
          q.id as queue_id,
          q.queue_number,
          q.status as queue_status
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE 1=1
      `;
      
      const queryParams = [];

      if (status) {
        query += ` AND a.status = ?`;
        queryParams.push(status);
      }

      if (patient_id) {
        query += ` AND a.patient_id = ?`;
        queryParams.push(patient_id);
      }

      if (type_id) {
        query += ` AND a.appointment_type_id = ?`;
        queryParams.push(type_id);
      }

      if (dateRange?.start_date) {
        query += ` AND DATE(a.scheduled_at) >= ?`;
        queryParams.push(dateRange.start_date);
      }

      if (dateRange?.end_date) {
        query += ` AND DATE(a.scheduled_at) <= ?`;
        queryParams.push(dateRange.end_date);
      }

      if (search) {
        query += ` AND (
          a.appointment_number LIKE ? OR
          p.first_name LIKE ? OR
          p.last_name LIKE ? OR
          p.patient_facility_code LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Patient users can only see their own appointments
      if (req.user.role === 'PATIENT') {
        const [patient] = await pool.execute(
          'SELECT id FROM patients WHERE user_id = ?',
          [req.user.id]
        );
        
        if (patient.length > 0) {
          query += ` AND a.patient_id = ?`;
          queryParams.push(patient[0].id);
        } else {
          return res.json({ 
            success: true,
            data: [], 
            pagination: { page, limit, total: 0, total_pages: 0 }
          });
        }
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM appointments a/,
        'SELECT COUNT(*) as total FROM appointments a'
      );
      
      console.log('Count query:', countQuery);
      console.log('Count params:', queryParams);

      let countResult;
      try {
        if (queryParams.length > 0) {
          [countResult] = await pool.execute(countQuery, queryParams);
        } else {
          [countResult] = await pool.query(countQuery);
        }
        
        console.log('Count result:', countResult);
      } catch (countError) {
        console.error('Error executing count query:', countError);
        // Fallback to a simple count without filters if complex query fails
        const [simpleCount] = await pool.execute(
          'SELECT COUNT(*) as total FROM appointments'
        );
        countResult = simpleCount;
      }

      // Ensure countResult exists and has the expected structure
      if (!countResult || !Array.isArray(countResult) || countResult.length === 0) {
        console.error('Invalid count result:', countResult);
        countResult = [{ total: 0 }];
      }

      const total = countResult[0]?.total || 0;

      // Add sorting and pagination
      query += ` ORDER BY a.scheduled_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      console.log('Main query:', query);
      console.log('Main params:', queryParams);

      // Execute the main query
      let appointments = [];
      try {
        if (queryParams.length > 0) {
          [appointments] = await pool.execute(query, queryParams);
        } else {
          [appointments] = await pool.query(query);
        }
        console.log(`Found ${appointments.length} appointments`);
      } catch (mainError) {
        console.error('Error executing main query:', mainError);
        appointments = [];
      }

      // Add status counts for filters
      let statusCounts = [];
      try {
        const [statusResult] = await pool.execute(
          `SELECT status, COUNT(*) as count 
           FROM appointments 
           WHERE DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY status`
        );
        statusCounts = statusResult || [];
      } catch (statusError) {
        console.error('Error fetching status counts:', statusError);
      }

      res.json({
        success: true,
        data: appointments,
        filters: {
          status_counts: statusCounts
        },
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Error fetching appointments:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch appointments',
        details: error.message 
      });
    }
});

// GET today's appointments
router.get('/today', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [appointments] = await pool.execute(
        `SELECT 
          a.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          at.type_name,
          at.duration_minutes,
          q.id as queue_id,
          q.queue_number,
          q.status as queue_status,
          TIMESTAMPDIFF(MINUTE, NOW(), a.scheduled_at) as minutes_until
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE DATE(a.scheduled_at) = CURDATE()
        ORDER BY 
          CASE 
            WHEN a.status = 'IN_PROGRESS' THEN 1
            WHEN a.status = 'CONFIRMED' THEN 2
            WHEN a.status = 'SCHEDULED' THEN 3
            ELSE 4
          END,
          a.scheduled_at ASC`
      );

      // Group by status
      const grouped = {
        scheduled: appointments.filter(a => a.status === 'SCHEDULED'),
        confirmed: appointments.filter(a => a.status === 'CONFIRMED'),
        in_progress: appointments.filter(a => a.status === 'IN_PROGRESS'),
        completed: appointments.filter(a => a.status === 'COMPLETED'),
        cancelled: appointments.filter(a => a.status === 'CANCELLED'),
        no_show: appointments.filter(a => a.status === 'NO_SHOW'),
        total: appointments.length
      };

      // Calculate statistics
      const stats = {
        total_patients: appointments.length,
        completed: grouped.completed.length,
        pending: grouped.scheduled.length + grouped.confirmed.length,
        in_progress: grouped.in_progress.length,
        no_show: grouped.no_show.length,
        cancelled: grouped.cancelled.length,
        completion_rate: appointments.length > 0 
          ? ((grouped.completed.length / appointments.length) * 100).toFixed(1)
          : 0
      };

      res.json({
        success: true,
        data: grouped,
        stats
      });

    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch today\'s appointments' 
      });
    }
});

// GET appointment statistics
router.get('/stats/overview', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      // Today's counts
      const [today] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
          SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
        FROM appointments 
        WHERE DATE(scheduled_at) = CURDATE()`
      );

      // Weekly trends (last 7 days)
      const [weekly] = await pool.execute(
        `SELECT 
          DATE(scheduled_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
        FROM appointments
        WHERE scheduled_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(scheduled_at)
        ORDER BY date DESC`
      );

      // By type this month
      const [byType] = await pool.execute(
        `SELECT 
          at.type_name,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(MINUTE, scheduled_at, updated_at)) as avg_duration_minutes
        FROM appointments a
        JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE MONTH(a.scheduled_at) = MONTH(CURDATE())
          AND YEAR(a.scheduled_at) = YEAR(CURDATE())
          AND a.status = 'COMPLETED'
        GROUP BY at.type_name`
      );

      // Upcoming appointments (next 7 days)
      const [upcoming] = await pool.execute(
        `SELECT 
          COUNT(*) as count,
          DATE(scheduled_at) as date
        FROM appointments
        WHERE scheduled_at BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          AND status IN ('SCHEDULED', 'CONFIRMED')
        GROUP BY DATE(scheduled_at)
        ORDER BY date`
      );

      // Peak hours analysis
      const [peakHours] = await pool.execute(
        `SELECT 
          HOUR(scheduled_at) as hour,
          COUNT(*) as count
        FROM appointments
        WHERE scheduled_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY HOUR(scheduled_at)
        ORDER BY count DESC
        LIMIT 5`
      );

      res.json({
        success: true,
        stats: {
          today: today[0],
          weekly_trends: weekly,
          by_type: byType,
          upcoming_week: {
            total: upcoming.reduce((sum, day) => sum + day.count, 0),
            by_day: upcoming
          },
          peak_hours: peakHours,
          summary: {
            total_this_month: await getTotalThisMonth(pool),
            completion_rate: await getCompletionRate(pool),
            average_wait_time: await getAverageWaitTime(pool)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching appointment statistics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch statistics' 
      });
    }
});

// Helper functions for statistics
async function getTotalThisMonth(pool) {
  const [result] = await pool.execute(
    `SELECT COUNT(*) as count 
     FROM appointments 
     WHERE MONTH(scheduled_at) = MONTH(CURDATE()) 
       AND YEAR(scheduled_at) = YEAR(CURDATE())`
  );
  return result[0].count;
}

async function getCompletionRate(pool) {
  const [result] = await pool.execute(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
     FROM appointments 
     WHERE scheduled_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );
  
  if (result[0].total === 0) return 0;
  return ((result[0].completed / result[0].total) * 100).toFixed(1);
}

async function getAverageWaitTime(pool) {
  const [result] = await pool.execute(
    `SELECT AVG(TIMESTAMPDIFF(MINUTE, scheduled_at, updated_at)) as avg_wait
     FROM appointments 
     WHERE status = 'COMPLETED' 
       AND scheduled_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );
  return Math.round(result[0].avg_wait || 0);
}

// GET single appointment
router.get('/:id', 
  authenticateToken, 
  async (req, res) => {
    try {
      const [appointments] = await pool.execute(
        `SELECT 
          a.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.date_of_birth,
          p.sex,
          p.contact_number,
          p.address,
          p.hiv_status,
          at.type_name,
          at.duration_minutes,
          at.description as type_description,
          u.username as created_by_username,
          creator.username as creator_name,
          updater.username as updater_name,
          q.id as queue_id,
          q.queue_number,
          q.status as queue_status,
          q.called_at,
          q.served_at,
          q.completed_at
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN users creator ON a.created_by = creator.id
        LEFT JOIN users updater ON a.updated_by = updater.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE a.id = ?`,
        [req.params.id]
      );

      if (appointments.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found' 
        });
      }

      const appointment = appointments[0];

      // Check if patient user can access this appointment
      if (req.user.role === 'PATIENT') {
        const [patient] = await pool.execute(
          'SELECT id FROM patients WHERE user_id = ?',
          [req.user.id]
        );
        
        if (patient.length === 0 || patient[0].id !== appointment.patient_id) {
          return res.status(403).json({ 
            success: false,
            error: 'Access denied' 
          });
        }
      }

      // Get related lab results if any
      if (appointment.status === 'COMPLETED') {
        const [labResults] = await pool.execute(
          `SELECT * FROM lab_results 
           WHERE appointment_id = ? 
           ORDER BY test_date DESC`,
          [appointment.id]
        );
        appointment.lab_results = labResults;
      }

      res.json({
        success: true,
        data: appointment
      });

    } catch (error) {
      console.error('Error fetching appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch appointment' 
      });
    }
});

// CREATE new appointment (for staff/admin)
router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('appointmentCreate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        patient_id,
        appointment_type_id,
        scheduled_at,
        notes
      } = req.body;

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

      // Check if appointment type exists and is active
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

      // Check for conflicting appointments
      const scheduledTime = new Date(scheduled_at);
      const bufferMinutes = 15;
      const startBuffer = new Date(scheduledTime.getTime() - bufferMinutes * 60000);
      const endBuffer = new Date(scheduledTime.getTime() + appType[0].duration_minutes * 60000 + bufferMinutes * 60000);

      const [conflicts] = await connection.execute(
        `SELECT a.*, p.first_name, p.last_name 
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.patient_id = ? 
           AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
           AND a.scheduled_at BETWEEN ? AND ?`,
        [patient_id, startBuffer, endBuffer]
      );

      if (conflicts.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Patient already has an appointment scheduled around this time',
          conflicting_appointment: conflicts[0]
        });
      }

      // Check clinic capacity for this time slot
      const [clinicLoad] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM appointments 
         WHERE DATE(scheduled_at) = DATE(?)
           AND HOUR(scheduled_at) = HOUR(?)
           AND status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')`,
        [scheduled_at, scheduled_at]
      );

      if (clinicLoad[0].count >= 10) { // Max 10 appointments per hour
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Clinic is fully booked for this time slot. Please choose another time.' 
        });
      }

      // Generate appointment number
      const appointment_number = await generateAppointmentNumber(connection);

      // Create appointment
      const [result] = await connection.execute(
        `INSERT INTO appointments (
          appointment_number, patient_id, appointment_type_id, 
          scheduled_at, notes, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, NOW(), NOW())`,
        [
          appointment_number,
          patient_id,
          appointment_type_id,
          scheduled_at,
          notes || null,
          req.user.id
        ]
      );

      const appointment_id = result.insertId;

      // Get created appointment
      const [newAppointment] = await connection.execute(
        `SELECT a.*, at.type_name 
         FROM appointments a
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.id = ?`,
        [appointment_id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'INSERT',
        'appointments',
        appointment_id,
        patient_id,
        null,
        newAppointment[0],
        `Created appointment for ${patient[0].first_name} ${patient[0].last_name}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: newAppointment[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create appointment' 
      });
    } finally {
      connection.release();
    }
});

// UPDATE appointment
router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('appointmentUpdate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if appointment exists
      const [existing] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [req.params.id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found' 
        });
      }

      const oldValues = existing[0];
      const {
        appointment_type_id,
        scheduled_at,
        notes,
        status
      } = req.body;

      // Check if appointment is in queue
      if (status) {
        const [queue] = await connection.execute(
          'SELECT id FROM queue WHERE appointment_id = ?',
          [req.params.id]
        );

        if (queue.length > 0 && ['CANCELLED', 'NO_SHOW'].includes(status)) {
          // Update queue status if cancelling or no-show
          await connection.execute(
            `UPDATE queue SET status = 'SKIPPED', updated_at = NOW() 
             WHERE appointment_id = ?`,
            [req.params.id]
          );
        }
      }

      // Build update query
      const updateFields = [];
      const values = [];

      if (appointment_type_id) {
        updateFields.push('appointment_type_id = ?');
        values.push(appointment_type_id);
      }
      if (scheduled_at) {
        updateFields.push('scheduled_at = ?');
        values.push(scheduled_at);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(notes);
      }
      if (status) {
        updateFields.push('status = ?');
        values.push(status);
      }

      updateFields.push('updated_by = ?');
      values.push(req.user.id);
      updateFields.push('updated_at = NOW()');

      values.push(req.params.id);

      await connection.execute(
        `UPDATE appointments SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated appointment
      const [updated] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [req.params.id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'UPDATE',
        'appointments',
        req.params.id,
        oldValues.patient_id,
        oldValues,
        updated[0],
        'Updated appointment',
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update appointment' 
      });
    } finally {
      connection.release();
    }
});

// UPDATE appointment status
router.patch('/:id/status', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { status } = req.body;
      const validStatuses = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

      if (!status || !validStatuses.includes(status)) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Valid status is required',
          valid_statuses: validStatuses
        });
      }

      // Check if appointment exists
      const [existing] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [req.params.id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found' 
        });
      }

      const oldValues = existing[0];

      // Validate status transition
      const validTransitions = {
        'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'NO_SHOW': []
      };

      if (!validTransitions[oldValues.status].includes(status) && oldValues.status !== status) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Cannot transition from ${oldValues.status} to ${status}`,
          allowed_transitions: validTransitions[oldValues.status]
        });
      }

      // Update status
      await connection.execute(
        `UPDATE appointments SET status = ?, updated_by = ?, updated_at = NOW() 
         WHERE id = ?`,
        [status, req.user.id, req.params.id]
      );

      // If status is CANCELLED or NO_SHOW and there's a queue entry, update it
      if (['CANCELLED', 'NO_SHOW'].includes(status)) {
        await connection.execute(
          `UPDATE queue SET status = 'SKIPPED', updated_at = NOW() 
           WHERE appointment_id = ?`,
          [req.params.id]
        );
      }

      // If status is COMPLETED and there's a queue entry, update it
      if (status === 'COMPLETED') {
        await connection.execute(
          `UPDATE queue SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
           WHERE appointment_id = ?`,
          [req.params.id]
        );
      }

      // Get updated appointment
      const [updated] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [req.params.id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'UPDATE_STATUS',
        'appointments',
        req.params.id,
        oldValues.patient_id,
        { status: oldValues.status },
        { status: updated[0].status },
        `Changed appointment status from ${oldValues.status} to ${status}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Appointment status updated successfully',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating appointment status:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update appointment status' 
      });
    } finally {
      connection.release();
    }
});

// DELETE appointment
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if appointment exists
      const [appointment] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [req.params.id]
      );

      if (appointment.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Appointment not found' 
        });
      }

      // Check if there are related records
      const [labResults] = await connection.execute(
        'SELECT id FROM lab_results WHERE appointment_id = ? LIMIT 1',
        [req.params.id]
      );

      if (labResults.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Cannot delete appointment with lab results' 
        });
      }

      const [queue] = await connection.execute(
        'SELECT id FROM queue WHERE appointment_id = ?',
        [req.params.id]
      );

      // Delete queue entry if exists
      if (queue.length > 0) {
        await connection.execute(
          'DELETE FROM queue WHERE appointment_id = ?',
          [req.params.id]
        );
      }

      // Log audit before deletion
      await logAudit(
        req.user.id,
        'DELETE',
        'appointments',
        req.params.id,
        appointment[0].patient_id,
        appointment[0],
        null,
        `Deleted appointment ${appointment[0].appointment_number}`,
        req
      );

      // Delete appointment
      await connection.execute(
        'DELETE FROM appointments WHERE id = ?',
        [req.params.id]
      );

      await connection.commit();

      res.json({ 
        success: true,
        message: 'Appointment deleted successfully',
        deleted_appointment: {
          id: appointment[0].id,
          appointment_number: appointment[0].appointment_number
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting appointment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete appointment' 
      });
    } finally {
      connection.release();
    }
});

// GET appointments by patient (for staff/admin)
router.get('/patient/:patientId', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validatePagination,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { page, limit, offset } = req.pagination;

      const [appointments] = await pool.execute(
        `SELECT 
          a.*,
          at.type_name,
          at.duration_minutes,
          q.queue_number,
          q.status as queue_status
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE a.patient_id = ?
        ORDER BY a.scheduled_at DESC
        LIMIT ? OFFSET ?`,
        [patientId, limit, offset]
      );

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM appointments WHERE patient_id = ?',
        [patientId]
      );

      res.json({
        success: true,
        data: appointments,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch appointments' 
      });
    }
});

module.exports = router;