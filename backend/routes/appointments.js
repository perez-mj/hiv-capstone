// backend/routes/appointments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');
const queueService = require('../services/queueService');
const schedulingService = require('../services/appointmentSchedulingService');

// Book new appointment
router.post('/', auth, async (req, res) => {
  try {
    let { patient_id, office, appointment_date, time_slot, notes, transaction_type_id } = req.body;
    
    console.log('Creating appointment with data:', { patient_id, office, appointment_date, time_slot });
    
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
    
    // Validate that the time slot is available
    const availability = await schedulingService.getAvailableAppointmentSlots(
      appointment_date,
      office,
      patient_id
    );
    
    if (!availability.available) {
      return res.status(400).json({ error: availability.message || 'Selected time slot is not available' });
    }
    
    // Check if the specific time slot is in the available slots
    const slotAvailable = availability.slots.some(slot => slot.time === time_slot && slot.available);
    if (!slotAvailable) {
      return res.status(400).json({ error: 'Selected time slot is not available' });
    }
    
    // If no transaction_type_id provided, get default for the office
    let finalTransactionTypeId = transaction_type_id;
    if (!finalTransactionTypeId) {
      const defaultType = await db.TransactionType.findOne({
        where: { 
          office: office,
          is_active: true 
        },
        order: [['id', 'ASC']]
      });
      
      if (!defaultType) {
        return res.status(400).json({ error: 'No transaction type configured for this office' });
      }
      finalTransactionTypeId = defaultType.id;
    }
    
    // Create appointment
    const appointment = await db.Appointment.create({
      patient_id,
      office,
      appointment_date,
      time_slot,
      status: 'pending',
      notes: notes || '',
      transaction_type_id: finalTransactionTypeId
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
      const patient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      
      patientId = patient.id;
      console.log(`Found patient ID: ${patientId}`);
    } else if (req.user.role === 'staff' || req.user.role === 'admin') {
      if (req.query.patient_id) {
        patientId = req.query.patient_id;
      } else {
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
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          attributes: ['id', 'first_name', 'last_name', 'contact_number']
        },
        {
          model: db.TransactionType,
          as: 'TransactionType',
          attributes: ['id', 'name', 'office', 'estimated_duration_minutes', 'color_code']
        }
      ],
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
    const { notes } = req.body;
    
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
    
    const updatedAppointment = await db.Appointment.findByPk(id, {
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          attributes: ['id', 'first_name', 'last_name', 'contact_number']
        },
        {
          model: db.TransactionType,
          as: 'TransactionType',
          attributes: ['id', 'name', 'office', 'estimated_duration_minutes', 'color_code']
        }
      ]
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
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          attributes: ['id', 'first_name', 'last_name', 'contact_number', 'status', 'birth_date', 'gender']
        },
        {
          model: db.TransactionType,
          as: 'TransactionType',
          attributes: ['id', 'name', 'office', 'estimated_duration_minutes', 'color_code']
        }
      ]
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
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          attributes: ['id', 'first_name', 'last_name', 'contact_number']
        },
        {
          model: db.TransactionType,
          as: 'TransactionType',
          attributes: ['id', 'name', 'office', 'estimated_duration_minutes', 'color_code', 'description']
        }
      ],
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
    
    // Validate new slot is available
    const availability = await schedulingService.getAvailableAppointmentSlots(
      appointment_date,
      appointment.office,
      appointment.patient_id
    );
    
    if (!availability.available) {
      return res.status(400).json({ error: availability.message || 'Selected time slot is not available' });
    }
    
    const slotAvailable = availability.slots.some(slot => slot.time === time_slot && slot.available);
    if (!slotAvailable) {
      return res.status(400).json({ error: 'Selected time slot is not available' });
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
    appointment.checked_in_at = new Date();
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

// Generate time slots for a specific date (staff only)
router.get('/generate-slots/:date', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { date } = req.params;
    const { office } = req.query;

    const slots = await schedulingService.generateTimeSlots(date, office);
    
    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Error generating time slots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check if a specific date and time is available
router.get('/check-availability', auth, async (req, res) => {
  try {
    const { date, timeSlot, office } = req.query;

    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'date and timeSlot are required'
      });
    }

    // Check if date is available
    const dateObj = new Date(date);
    const isDateAvailable = await schedulingService.isDateAvailable(dateObj);
    if (!isDateAvailable) {
      return res.json({
        success: true,
        data: {
          available: false,
          reason: 'Date is not available (holiday or non-working day)'
        }
      });
    }

    // Check if time slot is available
    const isAvailable = await schedulingService.isTimeSlotAvailable(
      date,
      timeSlot,
      office
    );

    res.json({
      success: true,
      data: {
        available: isAvailable
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;