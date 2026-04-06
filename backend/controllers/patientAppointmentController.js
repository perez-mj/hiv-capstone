// backend/controllers/patientAppointmentController.js
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AppointmentType = require('../models/AppointmentType');
const Queue = require('../models/Queue');
const AuditLog = require('../models/AuditLog');
const { generateAppointmentNumber } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginated } = require('../utils/responseHandler');

const patientAppointmentController = {
  async getPatientAppointments(req, res, next) {
  try {
    const patientId = req.params.id;
    const { page = 1, limit = 100, status } = req.query;
    const offset = (page - 1) * limit;
    
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return sendNotFound(res, 'Patient not found');
    }
    
    const filters = { patient_id: patientId, status };
    const appointments = await Appointment.findAll(filters, { limit, offset });
    const total = await Appointment.count(filters);
    
    // FIX: Ensure appointments is an array
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    
    sendPaginated(res, safeAppointments, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total || 0,
      total_pages: Math.ceil((total || 0) / parseInt(limit))
    }, 'Patient appointments retrieved successfully');
  } catch (error) {
    next(error);
  }
},

async getMyHistory(req, res, next) {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    
    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) {
      return sendNotFound(res, 'Patient record not found');
    }
    
    const filters = { 
      patient_id: patient.id,
      status: ['COMPLETED', 'CANCELLED', 'NO_SHOW']
    };
    
    const appointments = await Appointment.findAll(filters, { limit, offset });
    const total = await Appointment.count(filters);
    
    // FIX: Ensure appointments is an array
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    
    sendPaginated(res, safeAppointments, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total || 0,
      total_pages: Math.ceil((total || 0) / parseInt(limit))
    }, 'Appointment history retrieved successfully');
  } catch (error) {
    next(error);
  }
},
  
  async getPatientLabResults(req, res, next) {
    try {
      const patientId = req.params.id;
      const { page = 1, limit = 100, test_type } = req.query;
      const offset = (page - 1) * limit;
      
      const LabResult = require('../models/LabResult');
      const filters = { patient_id: patientId, test_type };
      const labResults = await LabResult.findAll(filters, { limit, offset });
      const total = await LabResult.count(filters);
      
      sendPaginated(res, labResults, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Patient lab results retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
  
  async getPatientEncounters(req, res, next) {
    try {
      const patientId = req.params.id;
      const { page = 1, limit = 100, type } = req.query;
      const offset = (page - 1) * limit;
      
      const Encounter = require('../models/Encounter');
      const filters = { patient_id: patientId, type };
      const encounters = await Encounter.findAll(filters, { limit, offset });
      const total = await Encounter.count(filters);
      
      sendPaginated(res, encounters, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Patient encounters retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
  
  async getPatientQueueHistory(req, res, next) {
    try {
      const patientId = req.params.id;
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;
      
      const Queue = require('../models/Queue');
      const queueHistory = await Queue.findByPatientId(patientId, { limit, offset });
      const total = await Queue.countByPatientId(patientId);
      
      sendPaginated(res, queueHistory, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Patient queue history retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
  
  async getMyUpcoming(req, res, next) {
    try {
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;
      
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found');
      }
      
      const filters = { 
        patient_id: patient.id,
        status: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      };
      
      const appointments = await Appointment.findAll(filters, { limit, offset });
      const total = await Appointment.count(filters);
      
      sendPaginated(res, appointments, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Upcoming appointments retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
  
  async getMyNext(req, res, next) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found');
      }
      
      const filters = { 
        patient_id: patient.id,
        status: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      };
      
      const appointments = await Appointment.findAll(filters, { limit: 1, offset: 0 });
      const nextAppointment = appointments.length > 0 ? appointments[0] : null;
      
      sendSuccess(res, 'Next appointment retrieved successfully', nextAppointment);
    } catch (error) {
      next(error);
    }
  },
  
  async bookAppointment(req, res, next) {
    try {
      const {
        appointment_type_id,
        scheduled_at,
        notes
      } = req.body;
      
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found');
      }
      
      const appointmentType = await AppointmentType.findById(appointment_type_id);
      if (!appointmentType || !appointmentType.is_active) {
        return sendNotFound(res, 'Appointment type not found or inactive');
      }
      
      const conflicts = await Appointment.checkConflicts(patient.id, scheduled_at);
      if (conflicts.length > 0) {
        return sendBadRequest(res, 'You already have an appointment scheduled around this time', {
          conflicting_appointment: conflicts[0]
        });
      }
      
      const scheduledDate = new Date(scheduled_at);
      const slotCount = await Appointment.checkSlotAvailability(
        scheduled_at.split('T')[0],
        scheduledDate.getHours(),
        scheduledDate.getMinutes()
      );
      
      if (slotCount >= 10) {
        return sendBadRequest(res, 'Clinic is fully booked for this time slot. Please choose another time.');
      }
      
      const appointmentNumber = await generateAppointmentNumber();
      
      const appointmentId = await Appointment.create({
        appointment_number: appointmentNumber,
        patient_id: patient.id,
        appointment_type_id,
        scheduled_at,
        notes,
        created_by: req.user.id
      });
      
      await Queue.createForAppointment(appointmentId);
      const newAppointment = await Appointment.findById(appointmentId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'INSERT',
        table_name: 'appointments',
        record_id: appointmentId,
        patient_id: patient.id,
        new_values: newAppointment,
        description: `Patient ${patient.first_name} ${patient.last_name} booked an appointment`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendCreated(res, 'Appointment booked successfully', newAppointment);
    } catch (error) {
      next(error);
    }
  },
  
  async cancelMyAppointment(req, res, next) {
    try {
      const appointmentId = req.params.id;
      
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found');
      }
      
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return sendNotFound(res, 'Appointment not found');
      }
      
      if (appointment.patient_id !== patient.id) {
        return sendBadRequest(res, 'You can only cancel your own appointments');
      }
      
      if (appointment.status === 'COMPLETED') {
        return sendBadRequest(res, 'Cannot cancel a completed appointment');
      }
      
      if (appointment.status === 'CANCELLED') {
        return sendBadRequest(res, 'Appointment is already cancelled');
      }
      
      const scheduledTime = new Date(appointment.scheduled_at);
      const now = new Date();
      const hoursUntil = (scheduledTime - now) / (1000 * 60 * 60);
      
      if (hoursUntil < 1 && hoursUntil > 0) {
        return sendBadRequest(res, 'Cannot cancel appointments less than 1 hour before scheduled time');
      }
      
      await Appointment.updateStatus(appointmentId, 'CANCELLED', req.user.id);
      await Queue.updateStatusByAppointment(appointmentId, 'SKIPPED');
      
      const updatedAppointment = await Appointment.findById(appointmentId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'UPDATE_STATUS',
        table_name: 'appointments',
        record_id: appointmentId,
        patient_id: patient.id,
        old_values: { status: appointment.status },
        new_values: { status: 'CANCELLED' },
        description: `Patient cancelled appointment ${appointment.appointment_number}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendSuccess(res, 'Appointment cancelled successfully', updatedAppointment);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientAppointmentController;