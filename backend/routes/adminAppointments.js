// backend/routes/adminAppointments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

router.use(auth);

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// GET /api/admin/appointments - Get all appointments with filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      patient_id, 
      status, 
      appointment_type, 
      date_from, 
      date_to,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        a.id,
        a.patient_id,
        p.name as patient_name,
        a.appointment_date,
        a.appointment_type,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        DATE(a.appointment_date) as date,
        TIME(a.appointment_date) as time
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE 1=1
    `;
    
    const params = [];

    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (appointment_type) {
      query += ' AND a.appointment_type = ?';
      params.push(appointment_type);
    }

    if (date_from) {
      query += ' AND DATE(a.appointment_date) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(a.appointment_date) <= ?';
      params.push(date_to);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.patient_id LIKE ? OR a.notes LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY a.appointment_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE 1=1
    `;
    const countParams = [...params.slice(0, -2)]; // Remove limit and offset

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    // Format appointments for frontend
    const appointments = rows.map(appointment => ({
      ...appointment,
      date: appointment.date.toISOString().split('T')[0],
      time: appointment.time.substring(0, 5), // Format time as HH:MM
      doctor_name: 'Dr. Smith' // You can modify this based on your data structure
    }));

    res.json({
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/admin/appointments/calendar - Get appointments for calendar view
router.get('/calendar', async (req, res) => {
  try {
    const { start_date, end_date, patient_id } = req.query;

    let query = `
      SELECT 
        a.id,
        a.patient_id,
        p.name as patient_name,
        a.appointment_date,
        a.appointment_type,
        a.status,
        a.notes,
        DATE(a.appointment_date) as date,
        TIME(a.appointment_date) as time
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      WHERE 1=1
    `;
    
    const params = [];

    if (start_date && end_date) {
      query += ' AND DATE(a.appointment_date) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    query += ' ORDER BY a.appointment_date ASC';

    const [rows] = await pool.execute(query, params);

    const appointments = rows.map(appointment => ({
      ...appointment,
      date: appointment.date.toISOString().split('T')[0],
      time: appointment.time.substring(0, 5),
      title: `${appointment.patient_name} - ${appointment.appointment_type}`,
      doctor_name: 'Dr. Smith'
    }));

    res.json({ appointments });

  } catch (err) {
    console.error('Error fetching calendar appointments:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/admin/appointments - Create new appointment
router.post('/', async (req, res) => {
  try {
    const { patient_id, appointment_date, appointment_type, notes, status = 'scheduled' } = req.body;

    if (!patient_id || !appointment_date || !appointment_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: patient_id, appointment_date, and appointment_type are required' 
      });
    }

    // Verify patient exists
    const [patientRows] = await pool.execute(
      'SELECT name FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const appointmentDateTime = new Date(appointment_date);

    const [result] = await pool.execute(
      `INSERT INTO appointments 
       (patient_id, appointment_date, appointment_type, status, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [patient_id, appointmentDateTime, appointment_type, status, notes || '']
    );

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'APPOINTMENT_CREATED',
      patient_id: patient_id,
      description: `Appointment created for patient ${patientRows[0].name}`,
      ip_address: userInfo.ip_address
    });

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: {
        id: result.insertId,
        patient_id,
        appointment_date: appointmentDateTime,
        appointment_type,
        status,
        notes: notes || '',
        patient_name: patientRows[0].name
      }
    });

  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// PUT /api/admin/appointments/:id - Update appointment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, appointment_type, status, notes } = req.body;

    // Check if appointment exists
    const [appointmentRows] = await pool.execute(
      `SELECT a.*, p.name as patient_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.patient_id 
       WHERE a.id = ?`,
      [id]
    );

    if (appointmentRows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointmentDateTime = appointment_date ? new Date(appointment_date) : appointmentRows[0].appointment_date;

    const [result] = await pool.execute(
      `UPDATE appointments 
       SET appointment_date = ?, appointment_type = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        appointmentDateTime,
        appointment_type || appointmentRows[0].appointment_type,
        status || appointmentRows[0].status,
        notes || appointmentRows[0].notes,
        id
      ]
    );

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'APPOINTMENT_UPDATED',
      patient_id: appointmentRows[0].patient_id,
      description: `Appointment updated for patient ${appointmentRows[0].patient_name}`,
      ip_address: userInfo.ip_address
    });

    res.json({ message: 'Appointment updated successfully' });

  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// PUT /api/admin/appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const [appointmentRows] = await pool.execute(
      `SELECT a.*, p.name as patient_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.patient_id 
       WHERE a.id = ?`,
      [id]
    );

    if (appointmentRows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const [result] = await pool.execute(
      'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', id]
    );

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'APPOINTMENT_CANCELLED',
      patient_id: appointmentRows[0].patient_id,
      description: `Appointment cancelled for patient ${appointmentRows[0].patient_name}`,
      ip_address: userInfo.ip_address
    });

    res.json({ message: 'Appointment cancelled successfully' });

  } catch (err) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/admin/appointments/stats - Get appointment statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year

    // Get total appointments count
    const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM appointments');
    const total = totalResult[0].total;

    // Get status breakdown
    const [statusResults] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM appointments
      GROUP BY status
    `);

    // Get appointment type breakdown
    const [typeResults] = await pool.execute(`
      SELECT 
        appointment_type,
        COUNT(*) as count
      FROM appointments
      GROUP BY appointment_type
    `);

    // Get daily appointments for the last 30 days
    const [dailyResults] = await pool.execute(`
      SELECT 
        DATE(appointment_date) as date,
        COUNT(*) as count
      FROM appointments
      WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(appointment_date)
      ORDER BY date DESC
    `);

    // Get upcoming appointments (next 7 days)
    const [upcomingResults] = await pool.execute(`
      SELECT COUNT(*) as upcoming
      FROM appointments
      WHERE appointment_date >= NOW() 
      AND appointment_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
      AND status = 'scheduled'
    `);

    const stats = {
      total: parseInt(total),
      status_breakdown: statusResults,
      type_breakdown: typeResults,
      daily_trends: dailyResults,
      upcoming: parseInt(upcomingResults[0].upcoming),
      today: 0 // You can calculate this based on current date
    };

    res.json(stats);

  } catch (err) {
    console.error('Error fetching appointment stats:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;