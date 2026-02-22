// backend/routes/appointments.js
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

// Helper function to generate appointment number
const generateAppointmentNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const prefix = `APT${year}${month}${day}`;
  
  // Get the last appointment number for today
  const [rows] = await pool.execute(
    `SELECT appointment_number FROM appointments 
     WHERE appointment_number LIKE ? 
     ORDER BY appointment_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  
  let sequence = 1;
  if (rows.length > 0) {
    const lastNumber = rows[0].appointment_number;
    const lastSequence = parseInt(lastNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Move these SPECIFIC routes BEFORE the /:id route
// GET /api/appointments/check-availability - Check availability for a time slot
router.get('/check-availability', authenticateToken, async (req, res) => {
  try {
    const { date, type_id } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Get appointment type duration
    let duration = 30; // default
    if (type_id) {
      const [typeRows] = await pool.execute(
        'SELECT duration_minutes FROM appointment_types WHERE id = ?',
        [type_id]
      );
      if (typeRows.length > 0) {
        duration = typeRows[0].duration_minutes;
      }
    }
    
    // Get appointments for the date - using DATE() function to compare just the date part
    const [appointments] = await pool.execute(
      `SELECT 
        a.scheduled_at,
        at.duration_minutes
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(a.scheduled_at) = ?
      AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
      ORDER BY a.scheduled_at`,
      [date]
    );
    
    // Generate time slots (8 AM to 5 PM, 30-min intervals)
    const slots = [];
    const startHour = 8;
    const endHour = 17;
    
    // Parse the date parts
    const [year, month, day] = date.split('-').map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Create datetime string in MySQL format
        const slotDateTimeStr = `${date} ${timeStr}:00`;
        
        // Check if slot is available
        let isAvailable = true;
        
        for (const apt of appointments) {
          // Parse appointment time
          const aptTime = new Date(apt.scheduled_at);
          if (isNaN(aptTime.getTime())) {
            console.warn('Invalid appointment time:', apt.scheduled_at);
            continue;
          }
          
          // Create slot datetime
          const slotDateTime = new Date(slotDateTimeStr);
          if (isNaN(slotDateTime.getTime())) {
            console.warn('Invalid slot datetime:', slotDateTimeStr);
            continue;
          }
          
          const aptEnd = new Date(aptTime.getTime() + apt.duration_minutes * 60000);
          const slotEnd = new Date(slotDateTime.getTime() + duration * 60000);
          
          // Check for overlap
          if (slotDateTime < aptEnd && slotEnd > aptTime) {
            isAvailable = false;
            break;
          }
        }
        
        slots.push({
          time: timeStr,
          datetime: slotDateTimeStr,
          available: isAvailable,
          duration_minutes: duration
        });
      }
    }
    
    res.json({
      date,
      slots,
      appointment_count: appointments.length
    });
    
  } catch (err) {
    console.error('Error checking availability:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message 
    });
  }
});

// ==================== APPOINTMENT TYPES ENDPOINTS ====================

// GET /api/appointments/types - Get all appointment types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, type_name, description, duration_minutes, is_active FROM appointment_types WHERE is_active = 1 ORDER BY type_name'
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching appointment types:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/types/:id - Get appointment type by ID
router.get('/types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT id, type_name, description, duration_minutes, is_active FROM appointment_types WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching appointment type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/appointments/types - Create new appointment type (Admin only)
router.post('/types', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { type_name, description, duration_minutes } = req.body;
    
    if (!type_name || !duration_minutes) {
      return res.status(400).json({ error: 'Type name and duration minutes are required' });
    }
    
    // Check if type already exists
    const [existing] = await pool.execute(
      'SELECT id FROM appointment_types WHERE type_name = ?',
      [type_name]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Appointment type with this name already exists' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO appointment_types (type_name, description, duration_minutes) VALUES (?, ?, ?)',
      [type_name, description || null, duration_minutes]
    );
    
    // Log to audit
    await pool.execute(
      `INSERT INTO audit_logs (action_type, user_id, table_name, record_id, description) 
       VALUES (?, ?, ?, ?, ?)`,
      ['CREATE', req.user.id, 'appointment_types', result.insertId, `Created appointment type: ${type_name}`]
    );
    
    res.status(201).json({
      message: 'Appointment type created successfully',
      id: result.insertId,
      type_name,
      description,
      duration_minutes
    });
  } catch (err) {
    console.error('Error creating appointment type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/appointments/types/:id - Update appointment type (Admin only)
router.put('/types/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type_name, description, duration_minutes, is_active } = req.body;
    
    // Check if type exists
    const [existing] = await pool.execute(
      'SELECT * FROM appointment_types WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (type_name !== undefined) {
      // Check if new name conflicts with existing type
      if (type_name !== existing[0].type_name) {
        const [nameCheck] = await pool.execute(
          'SELECT id FROM appointment_types WHERE type_name = ? AND id != ?',
          [type_name, id]
        );
        if (nameCheck.length > 0) {
          return res.status(400).json({ error: 'Appointment type with this name already exists' });
        }
      }
      updates.push('type_name = ?');
      values.push(type_name);
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    if (duration_minutes !== undefined) {
      updates.push('duration_minutes = ?');
      values.push(duration_minutes);
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    await pool.execute(
      `UPDATE appointment_types SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Log to audit
    await pool.execute(
      `INSERT INTO audit_logs (action_type, user_id, table_name, record_id, old_values, new_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'UPDATE', 
        req.user.id, 
        'appointment_types', 
        id, 
        JSON.stringify(existing[0]), 
        JSON.stringify(req.body),
        `Updated appointment type ID: ${id}`
      ]
    );
    
    res.json({ message: 'Appointment type updated successfully' });
  } catch (err) {
    console.error('Error updating appointment type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/appointments/types/:id - Delete appointment type (Admin only)
router.delete('/types/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if type is being used in appointments
    const [appointmentCheck] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE appointment_type_id = ?',
      [id]
    );
    
    if (appointmentCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete appointment type that is in use. Consider deactivating it instead.' 
      });
    }
    
    const [existing] = await pool.execute(
      'SELECT * FROM appointment_types WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    await pool.execute('DELETE FROM appointment_types WHERE id = ?', [id]);
    
    // Log to audit
    await pool.execute(
      `INSERT INTO audit_logs (action_type, user_id, table_name, record_id, old_values, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['DELETE', req.user.id, 'appointment_types', id, JSON.stringify(existing[0]), `Deleted appointment type: ${existing[0].type_name}`]
    );
    
    res.json({ message: 'Appointment type deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointment type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== APPOINTMENTS ENDPOINTS ====================

// GET /api/appointments - Get appointments with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      patient_id, 
      date_from, 
      date_to, 
      type_id,
      limit = 100,
      offset = 0
    } = req.query;
    
    // Convert to integers with defaults
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    
    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        a.patient_id,
        a.appointment_type_id,
        a.scheduled_at,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        at.type_name,
        at.duration_minutes,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.contact_number as patient_contact,
        u.username as created_by_username
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    const countParams = [];
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
      countParams.push(status);
    }
    
    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
      countParams.push(patient_id);
    }
    
    if (type_id) {
      query += ' AND a.appointment_type_id = ?';
      params.push(type_id);
      countParams.push(type_id);
    }
    
    if (date_from) {
      query += ' AND DATE(a.scheduled_at) >= ?';
      params.push(date_from);
      countParams.push(date_from);
    }
    
    if (date_to) {
      query += ' AND DATE(a.scheduled_at) <= ?';
      params.push(date_to);
      countParams.push(date_to);
    }
    
    // Apply role-based filtering
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length === 0) {
        return res.status(404).json({ error: 'Patient record not found' });
      }
      
      query += ' AND a.patient_id = ?';
      params.push(patientRows[0].patient_id);
      countParams.push(patientRows[0].patient_id);
    }
    
    // Add ORDER BY and then add LIMIT and OFFSET as string concatenation (not parameterized)
    query += ' ORDER BY a.scheduled_at DESC';
    
    // Execute the main query with params for the WHERE conditions only
    let rows;
    if (params.length > 0) {
      // If we have WHERE parameters, use them
      [rows] = await pool.execute(query + ` LIMIT ${limitNum} OFFSET ${offsetNum}`, params);
    } else {
      // If no WHERE parameters, execute without params
      [rows] = await pool.execute(query + ` LIMIT ${limitNum} OFFSET ${offsetNum}`);
    }
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a
      WHERE 1=1
    `;
    
    if (status) {
      countQuery += ' AND a.status = ?';
    }
    
    if (patient_id) {
      countQuery += ' AND a.patient_id = ?';
    }
    
    if (type_id) {
      countQuery += ' AND a.appointment_type_id = ?';
    }
    
    if (date_from) {
      countQuery += ' AND DATE(a.scheduled_at) >= ?';
    }
    
    if (date_to) {
      countQuery += ' AND DATE(a.scheduled_at) <= ?';
    }
    
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length > 0) {
        countQuery += ' AND a.patient_id = ?';
      }
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    
    res.json({
      appointments: rows,
      pagination: {
        total: countResult[0].total,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/appointments/today - Get today's appointments
router.get('/today', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        a.patient_id,
        a.appointment_type_id,
        a.scheduled_at,
        a.status,
        a.notes,
        at.type_name,
        at.duration_minutes,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.contact_number as patient_contact,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as patient_age,
        q.id as queue_id,
        q.queue_number,
        q.status as queue_status
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE DATE(a.scheduled_at) = CURDATE()
    `;
    
    const params = [];
    
    // Role-based filtering
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length === 0) {
        return res.status(404).json({ error: 'Patient record not found' });
      }
      
      query += ' AND a.patient_id = ?';
      params.push(patientRows[0].patient_id);
    }
    
    query += ' ORDER BY a.scheduled_at ASC';
    
    const [rows] = await pool.execute(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching today\'s appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/upcoming - Get upcoming appointments
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    let query = `
      SELECT 
        a.id,
        a.appointment_number,
        a.patient_id,
        a.appointment_type_id,
        a.scheduled_at,
        a.status,
        a.notes,
        at.type_name,
        at.duration_minutes,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.contact_number as patient_contact,
        DATEDIFF(a.scheduled_at, NOW()) as days_until
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.scheduled_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
      AND a.status IN ('SCHEDULED', 'CONFIRMED')
    `;
    
    const params = [parseInt(days)];
    
    // Role-based filtering
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length === 0) {
        return res.status(404).json({ error: 'Patient record not found' });
      }
      
      query += ' AND a.patient_id = ?';
      params.push(patientRows[0].patient_id);
    }
    
    query += ' ORDER BY a.scheduled_at ASC';
    
    const [rows] = await pool.execute(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching upcoming appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/calendar - Get appointments for calendar view
router.get('/calendar', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    const [rows] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_number as title,
        a.scheduled_at as start,
        DATE_ADD(a.scheduled_at, INTERVAL at.duration_minutes MINUTE) as end,
        a.status,
        a.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        at.type_name,
        at.duration_minutes,
        CASE 
          WHEN a.status = 'SCHEDULED' THEN '#3498db'
          WHEN a.status = 'CONFIRMED' THEN '#2ecc71'
          WHEN a.status = 'IN_PROGRESS' THEN '#f39c12'
          WHEN a.status = 'COMPLETED' THEN '#27ae60'
          WHEN a.status = 'CANCELLED' THEN '#e74c3c'
          WHEN a.status = 'NO_SHOW' THEN '#95a5a6'
          ELSE '#bdc3c7'
        END as color
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.scheduled_at BETWEEN ? AND ?
      ORDER BY a.scheduled_at`,
      [start, end]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching calendar appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/patient/:patientId - Get appointments for specific patient
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Check if patient exists
    const [patientCheck] = await pool.execute(
      'SELECT patient_id, user_id FROM patients WHERE patient_id = ?',
      [patientId]
    );
    
    if (patientCheck.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // If user is patient, verify they're accessing their own records
    if (req.user.role === 'PATIENT') {
      const [userPatient] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (userPatient.length === 0 || userPatient[0].patient_id !== patientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const [rows] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_number,
        a.appointment_type_id,
        a.scheduled_at,
        a.status,
        a.notes,
        a.created_at,
        at.type_name,
        at.duration_minutes,
        q.queue_number,
        q.status as queue_status
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ?
      ORDER BY a.scheduled_at DESC
      LIMIT ? OFFSET ?`,
      [patientId, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM appointments WHERE patient_id = ?',
      [patientId]
    );
    
    res.json({
      appointments: rows,
      patient: {
        patient_id: patientCheck[0].patient_id
      },
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('Error fetching patient appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_number,
        a.patient_id,
        a.appointment_type_id,
        a.scheduled_at,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        a.created_by,
        at.type_name,
        at.description as type_description,
        at.duration_minutes,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.middle_name as patient_middle_name,
        p.date_of_birth,
        p.gender,
        p.contact_number as patient_contact,
        p.address,
        p.hiv_status,
        u.username as created_by_username,
        q.id as queue_id,
        q.queue_number,
        q.status as queue_status,
        q.called_at,
        q.served_at,
        q.completed_at
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = rows[0];
    
    // Check access for patient role
    if (req.user.role === 'PATIENT') {
      const [patientRows] = await pool.execute(
        'SELECT patient_id FROM patients WHERE user_id = ?',
        [req.user.id]
      );
      
      if (patientRows.length === 0 || patientRows[0].patient_id !== appointment.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Get associated lab results if any
    const [labResults] = await pool.execute(
      `SELECT id, test_type, test_date, result_value, result_unit
       FROM lab_results
       WHERE appointment_id = ?
       ORDER BY test_date DESC`,
      [id]
    );
    
    // Get associated prescriptions if any
    const [prescriptions] = await pool.execute(
      `SELECT p.id, p.medication_id, m.medication_name, p.dosage_instructions, 
              p.quantity_prescribed, p.refills_remaining, p.status
       FROM prescriptions p
       JOIN medications m ON p.medication_id = m.id
       WHERE p.appointment_id = ?`,
      [id]
    );
    
    appointment.lab_results = labResults;
    appointment.prescriptions = prescriptions;
    
    res.json(appointment);
  } catch (err) {
    console.error('Error fetching appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/appointments - Create new appointment
router.post('/', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      patient_id, 
      appointment_type_id, 
      scheduled_at, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!patient_id || !appointment_type_id || !scheduled_at) {
      return res.status(400).json({ 
        error: 'Patient ID, appointment type ID, and scheduled date/time are required' 
      });
    }
    
    // Check if patient exists
    const [patientCheck] = await connection.execute(
      'SELECT patient_id, first_name, last_name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    
    if (patientCheck.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Check if appointment type exists
    const [typeCheck] = await connection.execute(
      'SELECT id, type_name, duration_minutes FROM appointment_types WHERE id = ? AND is_active = 1',
      [appointment_type_id]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Appointment type not found or inactive' });
    }
    
    // FIX: Convert ISO string to MySQL datetime format
    // Remove the 'Z' and replace with space, MySQL expects 'YYYY-MM-DD HH:MM:SS'
    const mysqlDateTime = scheduled_at.replace('T', ' ').replace('Z', '');
    
    // Check for scheduling conflicts (same time slot for same patient)
    const scheduledDateTime = new Date(scheduled_at);
    const conflictStart = new Date(scheduledDateTime.getTime() - 15 * 60000); // 15 minutes before
    const conflictEnd = new Date(scheduledDateTime.getTime() + typeCheck[0].duration_minutes * 60000 + 15 * 60000); // Duration + 15 mins after
    
    // Format conflict times for MySQL
    const conflictStartStr = conflictStart.toISOString().slice(0, 19).replace('T', ' ');
    const conflictEndStr = conflictEnd.toISOString().slice(0, 19).replace('T', ' ');
    
    const [conflictCheck] = await connection.execute(
      `SELECT id, scheduled_at FROM appointments 
       WHERE patient_id = ? 
       AND status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
       AND scheduled_at BETWEEN ? AND ?`,
      [patient_id, conflictStartStr, conflictEndStr]
    );
    
    if (conflictCheck.length > 0) {
      return res.status(400).json({ 
        error: 'Scheduling conflict: Patient already has an appointment around this time',
        conflictingAppointment: conflictCheck[0]
      });
    }
    
    // Generate appointment number
    const appointmentNumber = await generateAppointmentNumber();
    
    // Insert appointment - use the formatted MySQL datetime
    const [result] = await connection.execute(
      `INSERT INTO appointments 
       (appointment_number, patient_id, appointment_type_id, scheduled_at, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [appointmentNumber, patient_id, appointment_type_id, mysqlDateTime, notes || null, req.user.id]
    );
    
    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, new_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'CREATE', 
        req.user.id, 
        'appointments', 
        result.insertId, 
        patient_id,
        JSON.stringify({ appointment_number: appointmentNumber, patient_id, appointment_type_id, scheduled_at }),
        `Created appointment ${appointmentNumber} for patient ${patientCheck[0].first_name} ${patientCheck[0].last_name}`
      ]
    );
    
    await connection.commit();
    
    // Fetch the created appointment
    const [newAppointment] = await connection.execute(
      `SELECT 
        a.id, a.appointment_number, a.patient_id, a.appointment_type_id, 
        a.scheduled_at, a.status, a.notes, a.created_at,
        at.type_name
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: newAppointment[0]
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('Error creating appointment:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message,
      sqlMessage: err.sqlMessage // This will help debug SQL errors
    });
  } finally {
    connection.release();
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { appointment_type_id, scheduled_at, status, notes } = req.body;
    
    // Check if appointment exists
    const [existing] = await connection.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = existing[0];
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (appointment_type_id !== undefined) {
      // Check if appointment type exists
      const [typeCheck] = await connection.execute(
        'SELECT id, duration_minutes FROM appointment_types WHERE id = ? AND is_active = 1',
        [appointment_type_id]
      );
      
      if (typeCheck.length === 0) {
        return res.status(404).json({ error: 'Appointment type not found or inactive' });
      }
      
      updates.push('appointment_type_id = ?');
      values.push(appointment_type_id);
    }
    
    if (scheduled_at !== undefined) {
      // Check for scheduling conflicts (excluding this appointment)
      const scheduledDateTime = new Date(scheduled_at);
      const duration = appointment_type_id ? 
        (await connection.execute('SELECT duration_minutes FROM appointment_types WHERE id = ?', [appointment_type_id]))[0][0]?.duration_minutes : 
        30; // default
      
      const conflictStart = new Date(scheduledDateTime.getTime() - 15 * 60000);
      const conflictEnd = new Date(scheduledDateTime.getTime() + duration * 60000 + 15 * 60000);
      
      const [conflictCheck] = await connection.execute(
        `SELECT id FROM appointments 
         WHERE patient_id = ? 
         AND id != ?
         AND status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
         AND scheduled_at BETWEEN ? AND ?`,
        [appointment.patient_id, id, conflictStart.toISOString().slice(0, 19).replace('T', ' '), conflictEnd.toISOString().slice(0, 19).replace('T', ' ')]
      );
      
      if (conflictCheck.length > 0) {
        return res.status(400).json({ error: 'Scheduling conflict with another appointment' });
      }
      
      updates.push('scheduled_at = ?');
      values.push(scheduled_at);
    }
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    await connection.execute(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Log to audit
    await connection.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, old_values, new_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'UPDATE', 
        req.user.id, 
        'appointments', 
        id, 
        appointment.patient_id,
        JSON.stringify(appointment), 
        JSON.stringify(req.body),
        `Updated appointment ID: ${id}`
      ]
    );
    
    await connection.commit();
    
    res.json({ message: 'Appointment updated successfully' });
    
  } catch (err) {
    await connection.rollback();
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// PATCH /api/appointments/:id/status - Update appointment status
router.patch('/:id/status', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    // Check if appointment exists
    const [existing] = await pool.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    await pool.execute(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // If status is COMPLETED or CANCELLED, update queue if exists
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      await pool.execute(
        `UPDATE queue SET status = ? 
         WHERE appointment_id = ? AND status IN ('WAITING', 'CALLED', 'SERVING')`,
        [status === 'COMPLETED' ? 'COMPLETED' : 'SKIPPED', id]
      );
    }
    
    // Log to audit
    await pool.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, old_values, new_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'UPDATE_STATUS', 
        req.user.id, 
        'appointments', 
        id, 
        existing[0].patient_id,
        JSON.stringify({ status: existing[0].status }), 
        JSON.stringify({ status }),
        `Changed appointment status from ${existing[0].status} to ${status}`
      ]
    );
    
    res.json({ 
      message: 'Appointment status updated successfully',
      previousStatus: existing[0].status,
      newStatus: status
    });
    
  } catch (err) {
    console.error('Error updating appointment status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/appointments/:id - Delete appointment (Admin only, soft delete via status)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if appointment exists
    const [existing] = await pool.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Check if appointment has associated records
    const [queueCheck] = await pool.execute(
      'SELECT COUNT(*) as count FROM queue WHERE appointment_id = ?',
      [id]
    );
    
    const [labCheck] = await pool.execute(
      'SELECT COUNT(*) as count FROM lab_results WHERE appointment_id = ?',
      [id]
    );
    
    const [prescriptionCheck] = await pool.execute(
      'SELECT COUNT(*) as count FROM prescriptions WHERE appointment_id = ?',
      [id]
    );
    
    if (queueCheck[0].count > 0 || labCheck[0].count > 0 || prescriptionCheck[0].count > 0) {
      // Instead of deleting, mark as cancelled
      await pool.execute(
        'UPDATE appointments SET status = ? WHERE id = ?',
        ['CANCELLED', id]
      );
      
      return res.json({ 
        message: 'Appointment has associated records. It has been marked as CANCELLED instead of deleted.' 
      });
    }
    
    // If no associated records, hard delete
    await pool.execute('DELETE FROM appointments WHERE id = ?', [id]);
    
    // Log to audit
    await pool.execute(
      `INSERT INTO audit_logs 
       (action_type, user_id, table_name, record_id, patient_id, old_values, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'DELETE', 
        req.user.id, 
        'appointments', 
        id, 
        existing[0].patient_id,
        JSON.stringify(existing[0]),
        `Deleted appointment ID: ${id}`
      ]
    );
    
    res.json({ message: 'Appointment deleted successfully' });
    
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== STATISTICS ENDPOINTS ====================

// GET /api/appointments/stats/summary - Get appointment statistics
router.get('/stats/summary', authenticateToken, authorize('ADMIN', 'NURSE'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(scheduled_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else {
      // Default to current month
      dateFilter = 'WHERE MONTH(scheduled_at) = MONTH(CURDATE()) AND YEAR(scheduled_at) = YEAR(CURDATE())';
    }
    
    // Total appointments by status
    const [statusStats] = await pool.execute(
      `SELECT 
        status,
        COUNT(*) as count
      FROM appointments
      ${dateFilter}
      GROUP BY status`,
      params
    );
    
    // Appointments by type
    const [typeStats] = await pool.execute(
      `SELECT 
        at.type_name,
        COUNT(*) as count
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      ${dateFilter ? dateFilter.replace('WHERE', 'WHERE') : ''}
      GROUP BY at.type_name, at.id
      ORDER BY count DESC`,
      params
    );
    
    // Daily appointments for chart
    const [dailyStats] = await pool.execute(
      `SELECT 
        DATE(scheduled_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      ${dateFilter}
      GROUP BY DATE(scheduled_at)
      ORDER BY date`,
      params
    );
    
    // Peak hours
    const [peakHours] = await pool.execute(
      `SELECT 
        HOUR(scheduled_at) as hour,
        COUNT(*) as count
      FROM appointments
      ${dateFilter}
      GROUP BY HOUR(scheduled_at)
      ORDER BY count DESC
      LIMIT 5`,
      params
    );
    
    res.json({
      by_status: statusStats,
      by_type: typeStats,
      daily: dailyStats,
      peak_hours: peakHours,
      period: {
        start_date: start_date || 'current month',
        end_date: end_date || 'current month'
      }
    });
    
  } catch (err) {
    console.error('Error fetching appointment statistics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/patient/:patientId/next - Get next appointment for patient
router.get('/patient/:patientId/next', authenticateToken, async (req, res) => {
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
        a.id,
        a.appointment_number,
        a.scheduled_at,
        a.status,
        at.type_name,
        DATEDIFF(a.scheduled_at, NOW()) as days_until
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.patient_id = ?
      AND a.scheduled_at > NOW()
      AND a.status IN ('SCHEDULED', 'CONFIRMED')
      ORDER BY a.scheduled_at ASC
      LIMIT 1`,
      [patientId]
    );
    
    if (rows.length === 0) {
      return res.json({ message: 'No upcoming appointments' });
    }
    
    res.json(rows[0]);
    
  } catch (err) {
    console.error('Error fetching next appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/patient/:patientId/history - Get appointment history for patient
router.get('/patient/:patientId/history', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
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
        a.id,
        a.appointment_number,
        a.scheduled_at,
        a.status,
        a.notes,
        at.type_name,
        q.queue_number,
        (SELECT COUNT(*) FROM lab_results WHERE appointment_id = a.id) as lab_count,
        (SELECT COUNT(*) FROM prescriptions WHERE appointment_id = a.id) as prescription_count
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ?
      AND a.scheduled_at <= NOW()
      ORDER BY a.scheduled_at DESC
      LIMIT ? OFFSET ?`,
      [patientId, parseInt(limit), parseInt(offset)]
    );
    
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM appointments WHERE patient_id = ? AND scheduled_at <= NOW()',
      [patientId]
    );
    
    res.json({
      appointments: rows,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (err) {
    console.error('Error fetching appointment history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;