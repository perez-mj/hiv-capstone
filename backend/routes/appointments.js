// backend/routes/appointments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');
const queueService = require('../services/queueService');
const schedulingService = require('../services/appointmentSchedulingService');

router.post('/', auth, async (req, res) => {
  try {
    let { patient_id, office, appointment_date, time_slot, notes, transaction_type_id } = req.body;
    
    console.log('Creating appointment with data:', { patient_id, office, appointment_date, time_slot, transaction_type_id });
    
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
    
    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    
    if (!office && transaction_type_id) {
      const transactionType = await db.TransactionType.findByPk(transaction_type_id);
      if (transactionType) {
        office = transactionType.office;
        console.log(`Office determined from transaction type: ${office}`);
      }
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
    
    if (!transaction_type_id) {
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
      transaction_type_id = defaultType.id;
    }
    
    const availability = await schedulingService.getAvailableAppointmentSlots(
      appointment_date,
      office,
      patient_id
    );
    
    if (!availability.available) {
      return res.status(400).json({ error: availability.message || 'Selected time slot is not available' });
    }
    
    const slotAvailable = availability.slots.some(slot => slot.time === time_slot && slot.available);
    if (!slotAvailable) {
      return res.status(400).json({ error: 'Selected time slot is not available' });
    }
    
    const appointment = await db.Appointment.create({
      patient_id,
      office,
      appointment_date,
      time_slot,
      status: 'pending',
      notes: notes || '',
      transaction_type_id
    });
    
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

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
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

router.put('/:id/checkin', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await db.Appointment.findByPk(id, {
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const oldData = appointment.toJSON();
    appointment.status = 'queued';
    appointment.queued_at = new Date();
    await appointment.save();
    
    try {
      const date = appointment.appointment_date;
      const office = appointment.office;
      
      await queueService.addToQueue(
        office,           
        date,             
        appointment.patient_id,  
        appointment.id   
      );
      
      console.log(`Patient ${appointment.patient_id} added to ${office} queue for ${date}`);
    } catch (queueError) {
      console.error('Error adding to queue:', queueError);
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
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

router.get('/check-availability', auth, async (req, res) => {
  try {
    const { date, timeSlot, office } = req.query;

    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'date and timeSlot are required'
      });
    }

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