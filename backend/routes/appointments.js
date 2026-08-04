// backend/routes/appointments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck, officeCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');
const queueService = require('../services/queueService');

// Book new appointment
router.post('/', auth, async (req, res) => {
  try {
    let { patient_id, office, appointment_date, time_slot, type, notes } = req.body;
    
    console.log('Creating appointment with data:', { patient_id, office, appointment_date, time_slot, type });
    
    // If user is patient, get their patient_id from the authenticated user
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      
      patient_id = patient.id;
      console.log(`Found patient ID: ${patient_id} for user ${req.user.id}`);
    }
    
    // Validate required fields
    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    
    if (!office) {
      return res.status(400).json({ error: 'Office is required' });
    }
    
    if (!appointment_date) {
      return res.status(400).json({ error: 'Appointment date is required' });
    }
    
    if (!time_slot) {
      return res.status(400).json({ error: 'Time slot is required' });
    }
    
    // Check for existing appointment
    const existing = await db.Appointment.findOne({
      where: {
        patient_id,
        appointment_date,
        time_slot,
        status: { [Op.notIn]: ['cancelled', 'no-show'] }
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'You already have an appointment at this time' });
    }
    
    // Check if time slot is already booked for this office
    const slotBooked = await db.Appointment.findOne({
      where: {
        office,
        appointment_date,
        time_slot,
        status: { [Op.notIn]: ['cancelled', 'no-show'] }
      }
    });
    
    if (slotBooked) {
      return res.status(400).json({ error: 'This time slot is already booked' });
    }
    
    // Create appointment
    const appointment = await db.Appointment.create({
      patient_id,
      office,
      appointment_date,
      time_slot,
      type: type || 'scheduled',
      status: 'pending',
      notes: notes || ''
    });
    
    // Generate queue number (don't fail if this doesn't work)
    try {
      const queueNumber = await queueService.generateQueueNumber(office, appointment_date);
      appointment.queue_number = queueNumber;
      await appointment.save();
      console.log(`Generated queue number: ${queueNumber} for appointment ${appointment.id}`);
    } catch (queueError) {
      console.error('Error generating queue number:', queueError);
      // Continue without queue number
    }
    
    // Create audit log
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    console.log(`Appointment created successfully: ${appointment.id}`);
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's appointments
router.get('/my', auth, async (req, res) => {
  try {
    let patientId;
    console.log('Getting appointments for user:', req.user.id, 'role:', req.user.role);
    
    if (req.user.role === 'patient') {
      // Patient: find their patient record
      const patient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      
      patientId = patient.id;
      console.log(`Found patient ID: ${patientId}`);
    } else if (req.user.role === 'staff' || req.user.role === 'admin') {
      // Staff/Admin: can filter by patient_id query param
      if (req.query.patient_id) {
        patientId = req.query.patient_id;
      } else {
        // Staff viewing their own appointments? Return empty array
        return res.json([]);
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!patientId) {
      return res.json([]);
    }
    
    const appointments = await db.Appointment.findAll({
      where: { patient_id: patientId },
      order: [['appointment_date', 'DESC'], ['time_slot', 'ASC']]
    });
    
    console.log(`Found ${appointments.length} appointments for patient ${patientId}`);
    res.json(appointments);
  } catch (error) {
    console.error('Get my appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update appointment
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, type } = req.body;
    
    const appointment = await db.Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Check permissions
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== appointment.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const oldData = appointment.toJSON();
    
    // Update only allowed fields
    if (notes !== undefined) appointment.notes = notes;
    if (type !== undefined) appointment.type = type;
    
    await appointment.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    // Return updated appointment with patient
    const updatedAppointment = await db.Appointment.findByPk(id, {
      include: [{
        model: db.Patient,
        attributes: ['id', 'first_name', 'last_name', 'contact_number']
      }]
    });
    
    res.json(updatedAppointment);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get appointment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await db.Appointment.findByPk(id, {
      include: [{
        model: db.Patient,
        attributes: ['id', 'first_name', 'last_name', 'contact_number', 'status', 'birth_date', 'gender']
      }]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Check permissions
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== appointment.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    if (req.user.role === 'staff' && req.user.office !== appointment.office) {
      return res.status(403).json({ error: 'Access denied to this office' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get appointments for specific date (staff only)
router.get('/date/:date', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { date } = req.params;
    const { office } = req.query;
    
    const where = { appointment_date: date };
    if (office) where.office = office;
    if (req.user.role !== 'admin' && req.user.role === 'staff') {
      where.office = req.user.office;
    }
    
    const appointments = await db.Appointment.findAll({
      where,
      include: [{
        model: db.Patient,
        attributes: ['id', 'first_name', 'last_name', 'contact_number']
      }],
      order: [['time_slot', 'ASC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments by date error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel appointment
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const appointment = await db.Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== appointment.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const oldData = appointment.toJSON();
    appointment.status = 'cancelled';
    appointment.cancellation_reason = reason || 'Cancelled by patient';
    await appointment.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reschedule appointment
router.put('/:id/reschedule', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, time_slot } = req.body;
    
    const appointment = await db.Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== appointment.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const oldData = appointment.toJSON();
    appointment.appointment_date = appointment_date;
    appointment.time_slot = time_slot;
    appointment.status = 'pending';
    await appointment.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(appointment);
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check-in patient (staff only)
router.put('/:id/checkin', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await db.Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const oldData = appointment.toJSON();
    appointment.status = 'checked-in';
    await appointment.save();
    
    // Add to queue
    try {
      await queueService.addToQueue(
        appointment.office,
        appointment.appointment_date,
        appointment.patient_id,
        appointment.id
      );
    } catch (queueError) {
      console.error('Error adding to queue:', queueError);
      // Continue even if queue fails
    }
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(appointment);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;