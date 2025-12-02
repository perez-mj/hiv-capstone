// backend/routes/patientAppointments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticatePatient = require('../middleware/patientAuth');
const { parse } = require('dotenv');

// Apply middleware to all routes in this file
router.use(authenticatePatient);

// GET /api/patient/appointments - Get patient's appointments
router.get('/', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    console.log('Fetching appointments for patient:', patient_id);
    
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id,
        patient_id,
        appointment_date,
        appointment_type,
        status,
        notes,
        created_at,
        updated_at
      FROM appointments 
      WHERE patient_id = ?
    `;
    
    const params = [patient_id]; // Initialize params array

    if (status) {
      query += ` AND status = ${status}`;
    }

    query += ` ORDER BY appointment_date DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM appointments WHERE patient_id = ?';
    const countParams = [patient_id];

    if (status) {
      countQuery += ` AND status = ${status}`;
    }

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    // Format dates for frontend
    const appointments = rows.map(appointment => ({
      ...appointment,
      date: appointment.appointment_date.toISOString().split('T')[0],
      time: appointment.appointment_date.toTimeString().split(' ')[0].substring(0, 5),
      doctor_name: 'Dr. Smith',
      location: 'Main Clinic' // Add default location
    }));

    console.log(`Found ${appointments.length} appointments for patient ${patient_id}`);

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
    console.error('Error fetching patient appointments:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// POST /api/patient/appointments - Book new appointment
router.post('/', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    const { date, time, doctor_name, location, notes } = req.body;

    console.log('Booking appointment for patient:', patient_id, req.body);

    if (!date || !time || !doctor_name || !location) {
      return res.status(400).json({ 
        error: 'Missing required fields: date, time, doctor_name, and location are required' 
      });
    }

    const appointment_date = new Date(`${date}T${time}`);

    // Validate date
    if (isNaN(appointment_date.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const [result] = await pool.execute(
      `INSERT INTO appointments 
       (patient_id, appointment_date, appointment_type, status, notes) 
       VALUES (?, ?, 'Consultation', 'scheduled', ?)`,
      [patient_id, appointment_date, notes || '']
    );

    console.log('Appointment booked successfully with ID:', result.insertId);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: result.insertId,
        patient_id,
        appointment_date,
        appointment_type: 'Consultation',
        status: 'scheduled',
        notes: notes || '',
        date,
        time,
        doctor_name,
        location
      }
    });

  } catch (err) {
    console.error('Error booking appointment:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// PUT /api/patient/appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    const { id } = req.params;

    console.log(`Cancelling appointment ${id} for patient ${patient_id}`);

    const [result] = await pool.execute(
      'UPDATE appointments SET status = ? WHERE id = ? AND patient_id = ?',
      ['cancelled', id, patient_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    console.log('Appointment cancelled successfully');

    res.json({ 
      message: 'Appointment cancelled successfully',
      appointmentId: id 
    });

  } catch (err) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;