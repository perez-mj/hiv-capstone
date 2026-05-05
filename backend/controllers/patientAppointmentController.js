// backend/controllers/patientAppointmentController.js
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AppointmentType = require('../models/AppointmentType');
const Queue = require('../models/Queue');
const { generateAppointmentNumber } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginated } = require('../utils/responseHandler');
const blockchainAuditService = require('../services/blockchainAuditService');

// Helper function to get patient by user ID
async function getPatientFromUser(userId) {
  try {
    // First try to find by user_id using the model method
    let patient = await Patient.findByUserId(userId);

    if (!patient) {
      // If not found, try direct database query as fallback
      const pool = require('../db');
      const [rows] = await pool.execute(
        'SELECT * FROM patients WHERE user_id = ?',
        [userId]
      );
      patient = rows[0];

      if (patient) {
        const { calculateAge } = require('../utils/helpers');
        patient.age = calculateAge(patient.date_of_birth);
      }
    }

    return patient;
  } catch (error) {
    console.error('Error in getPatientFromUser:', error);
    return null;
  }
}

const patientAppointmentController = {
  // Get appointments for a specific patient (admin/staff use)
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

  // Get patient's appointment history (self-service)
  async getMyHistory(req, res, next) {
  try {
    const { page = 1, limit = 100 } = req.query;
    
    // Convert to integers
    const limitNum = parseInt(limit) || 100;
    const offsetNum = (parseInt(page) - 1) * limitNum;
    const currentPage = parseInt(page) || 1;

    const patient = await getPatientFromUser(req.user.id);
    if (!patient) {
      return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
    }

    // Get database connection
    const db = await Appointment.getConnection();
    
    // Query for past appointments
    let query = `
      SELECT 
        a.*,
        at.type_name,
        at.duration_minutes,
        q.queue_number,
        q.status as queue_status
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ? 
        AND a.status IN ('COMPLETED', 'CANCELLED', 'NO_SHOW')
      ORDER BY a.scheduled_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    
    const [appointments] = await db.execute(query, [patient.id]);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a
      WHERE a.patient_id = ? 
        AND a.status IN ('COMPLETED', 'CANCELLED', 'NO_SHOW')
    `;
    
    const [totalResult] = await db.execute(countQuery, [patient.id]);
    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limitNum) || 1;
    
    sendPaginated(res, appointments, {
      page: currentPage,
      limit: limitNum,
      total: total,
      total_pages: totalPages
    }, 'Appointment history retrieved successfully');
    
  } catch (error) {
    console.error('Error in getMyHistory:', error);
    next(error);
  }
},

  // Get patient's lab results (admin/staff use)
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

  // Get patient's own lab results (self-service)
  async getMyLabResults(req, res, next) {
    try {
      const { page = 1, limit = 100, test_type } = req.query;
      const offset = (page - 1) * limit;

      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
      }

      const LabResult = require('../models/LabResult');
      const filters = { patient_id: patient.id, test_type };
      const labResults = await LabResult.findAll(filters, { limit, offset });
      const total = await LabResult.count(filters);

      sendPaginated(res, labResults, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Your lab results retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get patient's encounters (admin/staff use)
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

  // Get patient's own encounters (self-service)
  async getMyEncounters(req, res, next) {
    try {
      const { page = 1, limit = 100, type } = req.query;
      const offset = (page - 1) * limit;

      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
      }

      const Encounter = require('../models/Encounter');
      const filters = { patient_id: patient.id, type };
      const encounters = await Encounter.findAll(filters, { limit, offset });
      const total = await Encounter.count(filters);

      sendPaginated(res, encounters, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Your encounters retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get patient's queue history (admin/staff use)
  async getPatientQueueHistory(req, res, next) {
    try {
      const patientId = req.params.id;
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

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

  // Get patient's own queue status (self-service)
  async getMyQueueStatus(req, res, next) {
    try {
      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found');
      }

      // Only get queue for CONFIRMED or IN_PROGRESS appointments
      const queue = await Queue.getPatientCurrentQueue(patient.id);

      // Optional: Also check appointment status
      if (queue && queue.appointment_id) {
        const appointment = await Appointment.findById(queue.appointment_id);
        if (appointment && !['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status)) {
          return sendSuccess(res, 'No active queue status', null);
        }
      }

      sendSuccess(res, 'Your queue status retrieved successfully', queue);
    } catch (error) {
      next(error);
    }
  },

  // Get patient's upcoming appointments (self-service)
  async getMyUpcoming(req, res, next) {
    try {
      const { page = 1, limit = 100 } = req.query;

      // Convert to integers
      const limitNum = parseInt(limit) || 100;
      const offsetNum = (parseInt(page) - 1) * limitNum;
      const currentPage = parseInt(page) || 1;

      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
      }

      // Get current PH time for comparison
      const now = new Date();
      const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const phNowStr = phNow.toISOString().slice(0, 19).replace('T', ' ');

      // Get database connection
      const db = await Appointment.getConnection();

      // Build query with parameterized WHERE clause but concatenated LIMIT/OFFSET
      let query = `
      SELECT 
        a.*,
        at.type_name,
        at.duration_minutes,
        q.queue_number,
        q.status as queue_status
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = ? 
        AND a.status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
        AND a.scheduled_at >= ?
      ORDER BY a.scheduled_at ASC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

      // Execute with parameters
      const [appointments] = await db.execute(query, [patient.id, phNowStr]);

      // Get total count with same conditions
      const countQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a
      WHERE a.patient_id = ? 
        AND a.status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
        AND a.scheduled_at >= ?
    `;

      const [totalResult] = await db.execute(countQuery, [patient.id, phNowStr]);
      const total = totalResult[0].total;
      const totalPages = Math.ceil(total / limitNum) || 1;

      // Use sendPaginated with the correct structure
      sendPaginated(res, appointments, {
        page: currentPage,
        limit: limitNum,
        total: total,
        total_pages: totalPages
      }, 'Upcoming appointments retrieved successfully');

    } catch (error) {
      console.error('Error in getMyUpcoming:', error);
      next(error);
    }
  },

  // Get patient's next appointment (self-service)
  async getMyNext(req, res, next) {
    try {
      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
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

  // Get patient's statistics (self-service)
  async getMyStatistics(req, res, next) {
    try {
      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
      }

      const stats = await Patient.getPatientStatistics(patient.id);
      sendSuccess(res, 'Your statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  },

  // Book an appointment (self-service)
  async bookAppointment(req, res, next) {
    try {
      const {
        appointment_type_id,
        scheduled_at,
        notes
      } = req.body;

      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
      }

      const appointmentType = await AppointmentType.findById(appointment_type_id);
      if (!appointmentType || !appointmentType.is_active) {
        return sendNotFound(res, 'Appointment type not found or inactive');
      }

      // Convert to Date object safely
      const scheduledDate = new Date(scheduled_at);

      // Validate the date is valid
      if (isNaN(scheduledDate.getTime())) {
        return sendBadRequest(res, 'Invalid scheduled_at date format');
      }

      // Format date for MySQL (YYYY-MM-DD)
      const dateStr = scheduledDate.toISOString().split('T')[0];

      // Check for conflicts
      const conflicts = await Appointment.checkConflicts(patient.id, scheduledDate);
      if (conflicts.length > 0) {
        return sendBadRequest(res, 'You already have an appointment scheduled around this time', {
          conflicting_appointment: conflicts[0]
        });
      }

      // Check slot availability
      const slotCount = await Appointment.checkSlotAvailability(
        dateStr,
        scheduledDate.getHours(),
        scheduledDate.getMinutes()
      );

      if (slotCount >= 10) {
        return sendBadRequest(res, 'Clinic is fully booked for this time slot. Please choose another time.');
      }

      // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const hours = String(scheduledDate.getHours()).padStart(2, '0');
      const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
      const seconds = String(scheduledDate.getSeconds()).padStart(2, '0');
      const mysqlDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const appointmentNumber = await generateAppointmentNumber();

      const appointmentId = await Appointment.create({
        appointment_number: appointmentNumber,
        patient_id: patient.id,
        appointment_type_id,
        scheduled_at: mysqlDateTime,
        notes,
        created_by: req.user.id
      });

      const newAppointment = await Appointment.findById(appointmentId);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'BOOK_APPOINTMENT',
        'appointments',
        appointmentId,
        patient.id,
        null,
        newAppointment,
        `Patient ${patient.first_name} ${patient.last_name} (${patient.patient_facility_code}) booked appointment ${appointmentNumber}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store appointment snapshot on blockchain for patient self-booking
      blockchainAuditService.storeAppointmentSnapshot(
        newAppointment,
        'PATIENT_BOOKED',
        req
      ).catch(err => console.error('Appointment snapshot storage failed:', err));

      sendCreated(res, 'Appointment booked successfully', newAppointment);
    } catch (error) {
      console.error('Error in bookAppointment:', error);
      next(error);
    }
  },

  // Cancel patient's own appointment (self-service)
  async cancelMyAppointment(req, res, next) {
    try {
      const appointmentId = req.params.id;

      const patient = await getPatientFromUser(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient record not found for this user. Please contact administrator.');
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

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'CANCEL_APPOINTMENT',
        'appointments',
        appointmentId,
        patient.id,
        { status: appointment.status, scheduled_at: appointment.scheduled_at },
        { status: 'CANCELLED', cancelled_by_patient: true },
        `Patient ${patient.first_name} ${patient.last_name} cancelled appointment ${appointment.appointment_number} (${hoursUntil.toFixed(1)} hours before scheduled time)`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store appointment snapshot for patient cancellation
      blockchainAuditService.storeAppointmentSnapshot(
        updatedAppointment,
        'PATIENT_CANCELLED',
        req
      ).catch(err => console.error('Appointment snapshot storage failed:', err));

      sendSuccess(res, 'Appointment cancelled successfully', updatedAppointment);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientAppointmentController;