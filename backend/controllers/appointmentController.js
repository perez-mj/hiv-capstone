// backend/controllers/appointmentController.js
const Appointment = require('../models/Appointment');
const AppointmentType = require('../models/AppointmentType');
const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const { generateAppointmentNumber } = require('../utils/helpers');
const { 
  sendSuccess, 
  sendCreated, 
  sendNotFound, 
  sendBadRequest,
  sendPaginated,
  sendServerError 
} = require('../utils/responseHandler');
const blockchainAuditService = require('../services/blockchainAuditService');

/**
 * Convert UTC datetime to Philippines timezone (UTC+8)
 * @param {string} utcDateTime - UTC datetime string (e.g., "2026-04-07T00:30:00.000Z")
 * @returns {string} MySQL datetime in PH timezone (YYYY-MM-DD HH:MM:SS)
 */
const convertUTCToPH = (utcDateTime) => {
  if (!utcDateTime) return null;
  
  try {
    // Parse the UTC string
    const utcDate = new Date(utcDateTime);
    
    // Check if valid date
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date format:', utcDateTime);
      return utcDateTime;
    }
    
    // Add 8 hours for Philippines time (UTC+8)
    const phDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    
    // Format for MySQL: YYYY-MM-DD HH:MM:SS
    const year = phDate.getUTCFullYear();
    const month = String(phDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(phDate.getUTCDate()).padStart(2, '0');
    const hours = String(phDate.getUTCHours()).padStart(2, '0');
    const minutes = String(phDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(phDate.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error converting UTC to PH time:', error);
    return utcDateTime;
  }
};

const appointmentController = {
  // Get all appointments with filters
  async getAllAppointments(req, res, next) {
    try {
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

      const filters = {
        status: req.query.status,
        patient_id: req.query.patient_id,
        type_id: req.query.type_id,
        search: req.query.search,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      // Patient users can only see their own appointments
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findByUserId(req.user.id);
        if (patient) {
          filters.patient_id = patient.id;
        } else {
          return sendPaginated(res, [], {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            total_pages: 0
          }, 'No appointments found');
        }
      }

      const appointments = await Appointment.findAll(filters, { limit, offset });
      const total = await Appointment.count(filters);
      
      const safeAppointments = Array.isArray(appointments) ? appointments : [];
      
      sendPaginated(res, safeAppointments, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        total_pages: Math.ceil((total || 0) / parseInt(limit))
      }, 'Appointments retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get appointments by patient
  async getAppointmentsByPatient(req, res, next) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

      const appointments = await Appointment.findByPatientId(patientId, { limit, offset });
      const total = await Appointment.count({ patient_id: patientId });
      
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

  // Get today's appointments
  async getTodayAppointments(req, res, next) {
    try {
      const appointments = await Appointment.getTodayAppointments();

      const grouped = {
        scheduled: appointments.filter(a => a.status === 'SCHEDULED'),
        confirmed: appointments.filter(a => a.status === 'CONFIRMED'),
        in_progress: appointments.filter(a => a.status === 'IN_PROGRESS'),
        completed: appointments.filter(a => a.status === 'COMPLETED'),
        cancelled: appointments.filter(a => a.status === 'CANCELLED'),
        no_show: appointments.filter(a => a.status === 'NO_SHOW'),
        total: appointments.length
      };

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

      return sendSuccess(res, 'Today\'s appointments retrieved successfully', {
        appointments: grouped,
        stats
      });
    } catch (error) {
      next(error);
    }
  },

  // Get single appointment
  async getAppointmentById(req, res, next) {
    try {
      const appointment = await Appointment.findById(req.params.id);

      if (!appointment) {
        return sendNotFound(res, 'Appointment not found');
      }

      // Check if patient user can access this appointment
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findByUserId(req.user.id);
        if (!patient || patient.id !== appointment.patient_id) {
          return sendBadRequest(res, 'Access denied');
        }
      }

      // Get lab results if appointment is completed
      if (appointment.status === 'COMPLETED') {
        const LabResult = require('../models/LabResult');
        appointment.lab_results = await LabResult.findByAppointmentId(appointment.id);
      }

      return sendSuccess(res, 'Appointment retrieved successfully', appointment);
    } catch (error) {
      next(error);
    }
  },

  // Create new appointment - WITH UTC TO PH CONVERSION
  async createAppointment(req, res, next) {
    try {
      const {
        patient_id,
        appointment_type_id,
        scheduled_at,
        notes
      } = req.body;

      // CONVERT UTC TO PHILIPPINES TIMEZONE
      const phDateTime = convertUTCToPH(scheduled_at);
      
      // Debug logging
      console.log('=== Appointment Creation Debug ===');
      console.log('Original UTC datetime:', scheduled_at);
      console.log('Converted PH datetime:', phDateTime);
      console.log('Current server time:', new Date().toString());
      console.log('================================');

      // Validate datetime conversion
      if (!phDateTime) {
        return sendBadRequest(res, 'Invalid scheduled_at date format. Use ISO format (e.g., "2026-04-07T00:30:00.000Z")');
      }

      // Check if patient exists
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return sendNotFound(res, 'Patient not found');
      }

      // Check if appointment type exists and is active
      const appointmentType = await AppointmentType.findById(appointment_type_id);
      if (!appointmentType || !appointmentType.is_active) {
        return sendNotFound(res, 'Appointment type not found or inactive');
      }

      // Check for conflicting appointments (using PH time)
      const conflicts = await Appointment.checkConflicts(patient_id, phDateTime);
      if (conflicts.length > 0) {
        return sendBadRequest(res, 'Patient already has an appointment scheduled around this time', {
          conflicting_appointment: conflicts[0]
        });
      }

      // Check clinic capacity
      const scheduledDate = new Date(phDateTime);
      const dateStr = phDateTime.split(' ')[0];
      const slotCount = await Appointment.checkSlotAvailability(
        dateStr,
        scheduledDate.getHours(),
        scheduledDate.getMinutes()
      );

      if (slotCount >= 10) {
        return sendBadRequest(res, 'Clinic is fully booked for this time slot. Please choose another time.');
      }

      // Generate appointment number
      const appointmentNumber = await generateAppointmentNumber();
      console.log('Generated appointment number:', appointmentNumber);

      // Create appointment with PH time
      const appointmentId = await Appointment.create({
        appointment_number: appointmentNumber,
        patient_id,
        appointment_type_id,
        scheduled_at: phDateTime, // Use converted PH time
        notes,
        created_by: req.user.id
      });

      // Get created appointment
      const newAppointment = await Appointment.findById(appointmentId);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'CREATE',
        'appointments',
        appointmentId,
        patient_id,
        null,
        newAppointment,
        `Created appointment ${appointmentNumber} for patient ${patient.first_name} ${patient.last_name} at ${phDateTime}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store appointment snapshot on blockchain
      blockchainAuditService.storeAppointmentSnapshot(
        newAppointment,
        'CREATE',
        req
      ).catch(err => console.error('Appointment snapshot storage failed:', err));

      return sendCreated(res, 'Appointment created successfully', newAppointment);
    } catch (error) {
      console.error('Error in createAppointment:', error);
      next(error);
    }
  },

  // Update appointment
  async updateAppointment(req, res, next) {
    try {
      const existing = await Appointment.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Appointment not found');
      }

      // Extract only allowed fields for update (exclude patient_id)
      const {
        appointment_type_id,
        scheduled_at,
        notes,
        status
      } = req.body;

      // Remove patient_id if it exists in the request body
      // This prevents changing the patient for an existing appointment
      let updateData = {};
      
      if (appointment_type_id !== undefined) {
        updateData.appointment_type_id = appointment_type_id;
      }
      
      if (scheduled_at !== undefined) {
        // Convert to PH time if provided
        let phDateTime = scheduled_at;
        if (scheduled_at && typeof scheduled_at === 'string') {
          // Check if it's UTC format
          if (scheduled_at.includes('Z') || scheduled_at.includes('T')) {
            phDateTime = convertUTCToPH(scheduled_at);
            console.log('Update - Original UTC:', scheduled_at, '-> PH:', phDateTime);
          } else {
            phDateTime = scheduled_at;
          }
        }
        updateData.scheduled_at = phDateTime;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      if (status !== undefined) {
        updateData.status = status;
      }

      // If no valid fields to update
      if (Object.keys(updateData).length === 0) {
        return sendBadRequest(res, 'No valid fields to update');
      }

      // If status is being changed to cancelled/no-show and there's a queue entry, update it
      if (status && ['CANCELLED', 'NO_SHOW'].includes(status)) {
        await Queue.updateStatusByAppointment(req.params.id, 'SKIPPED');
      }

      // If status is being changed to completed, update queue
      if (status === 'COMPLETED') {
        await Queue.updateStatusByAppointment(req.params.id, 'COMPLETED', { completed_at: new Date() });
      }

      // Update appointment
      const updated = await Appointment.update(req.params.id, updateData);

      if (!updated) {
        return sendBadRequest(res, 'No changes made');
      }

      const updatedAppointment = await Appointment.findById(req.params.id);

      // Track changes for blockchain
      const changedFields = {};
      if (appointment_type_id !== undefined && appointment_type_id !== existing.appointment_type_id) {
        changedFields.appointment_type_id = { old: existing.appointment_type_id, new: appointment_type_id };
      }
      if (scheduled_at !== undefined && scheduled_at !== existing.scheduled_at) {
        changedFields.scheduled_at = { old: existing.scheduled_at, new: scheduled_at };
      }
      if (status !== undefined && status !== existing.status) {
        changedFields.status = { old: existing.status, new: status };
      }
      if (notes !== undefined && notes !== existing.notes) {
        changedFields.notes = { old: existing.notes, new: notes };
      }

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'UPDATE',
        'appointments',
        req.params.id,
        existing.patient_id,
        existing,
        updatedAppointment,
        `Updated appointment ${existing.appointment_number} - Changes: ${Object.keys(changedFields).join(', ')}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store appointment snapshot on blockchain for significant changes
      const significantChanges = ['status', 'scheduled_at', 'appointment_type_id'];
      const hasSignificantChanges = Object.keys(changedFields).some(field => significantChanges.includes(field));
      
      if (hasSignificantChanges) {
        blockchainAuditService.storeAppointmentSnapshot(
          updatedAppointment,
          'UPDATE',
          req
        ).catch(err => console.error('Appointment snapshot storage failed:', err));
      }

      return sendSuccess(res, 'Appointment updated successfully', updatedAppointment);
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      next(error);
    }
  },

  // Update appointment status
  async updateAppointmentStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

      if (!status || !validStatuses.includes(status)) {
        return sendBadRequest(res, 'Valid status is required', { valid_statuses: validStatuses });
      }

      const existing = await Appointment.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Appointment not found');
      }

      // Validate status transition
      const validTransitions = {
        'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'NO_SHOW': []
      };

      if (!validTransitions[existing.status].includes(status) && existing.status !== status) {
        return sendBadRequest(res, `Cannot transition from ${existing.status} to ${status}`, {
          allowed_transitions: validTransitions[existing.status]
        });
      }

      // Update status
      await Appointment.updateStatus(req.params.id, status, req.user.id);

      // Handle queue status changes
      if (['CANCELLED', 'NO_SHOW'].includes(status)) {
        await Queue.updateStatusByAppointment(req.params.id, 'SKIPPED');
      } else if (status === 'COMPLETED') {
        await Queue.updateStatusByAppointment(req.params.id, 'COMPLETED', { completed_at: new Date() });
      }

      const updatedAppointment = await Appointment.findById(req.params.id);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'STATUS_CHANGE',
        'appointments',
        req.params.id,
        existing.patient_id,
        { status: existing.status },
        { status: status },
        `Changed appointment ${existing.appointment_number} status from ${existing.status} to ${status}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store appointment snapshot on blockchain for status change
      blockchainAuditService.storeAppointmentSnapshot(
        updatedAppointment,
        'STATUS_CHANGE',
        req
      ).catch(err => console.error('Appointment snapshot storage failed:', err));

      return sendSuccess(res, 'Appointment status updated successfully', updatedAppointment);
    } catch (error) {
      next(error);
    }
  },

  // Delete appointment
  async deleteAppointment(req, res, next) {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        return sendNotFound(res, 'Appointment not found');
      }

      // Check if there are related lab results
      const LabResult = require('../models/LabResult');
      const hasLabResults = await LabResult.hasForAppointment(req.params.id);

      if (hasLabResults) {
        return sendBadRequest(res, 'Cannot delete appointment with lab results');
      }

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'DELETE',
        'appointments',
        req.params.id,
        appointment.patient_id,
        appointment,
        null,
        `Deleted appointment ${appointment.appointment_number}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store deletion record on blockchain
      blockchainAuditService.storeAppointmentSnapshot(
        appointment,
        'DELETE',
        req
      ).catch(err => console.error('Appointment snapshot storage failed:', err));

      // Delete queue entry if exists
      await Queue.deleteByAppointment(req.params.id);

      // Delete appointment
      await Appointment.delete(req.params.id);

      return sendSuccess(res, 'Appointment deleted successfully', {
        deleted_appointment: {
          id: appointment.id,
          appointment_number: appointment.appointment_number
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Check availability
  async checkAvailability(req, res, next) {
    try {
      const { date, type_id } = req.query;

      if (!date || !type_id) {
        return sendBadRequest(res, 'Date and appointment type are required');
      }

      const appointmentType = await AppointmentType.findById(type_id);
      if (!appointmentType) {
        return sendNotFound(res, 'Appointment type not found');
      }

      const duration = appointmentType.duration_minutes || 30;

      // Generate time slots (8:00 AM to 5:00 PM PH time)
      const slots = [];
      const startHour = 8;
      const endHour = 17;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of [0, 30]) {
          // Skip lunch break
          if (hour === 12 && minute === 30) continue;
          if (hour === 13 && minute === 0) continue;

          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const bookedCount = await Appointment.checkSlotAvailability(date, hour, minute);

          const maxPerSlot = 3;
          const isAvailable = bookedCount < maxPerSlot;

          slots.push({
            time: timeString,
            available: isAvailable,
            bookedCount: bookedCount,
            maxCapacity: maxPerSlot,
            display: `${timeString} (${isAvailable ? `${maxPerSlot - bookedCount} slots available` : 'Fully Booked'})`
          });
        }
      }

      // Check if patient already has a booking
      let patientHasBooking = false;
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findByUserId(req.user.id);
        if (patient) {
          const existingAppointments = await Appointment.findAll({
            patient_id: patient.id,
            start_date: date,
            end_date: date
          });
          patientHasBooking = existingAppointments.length > 0;
        }
      }

      return sendSuccess(res, 'Availability checked successfully', {
        date,
        type_id,
        type_name: appointmentType.type_name,
        duration,
        slots,
        patientHasBooking
      });
    } catch (error) {
      next(error);
    }
  },

  // Get statistics
  async getStatistics(req, res, next) {
    try {
      const { period = 'week' } = req.query;

      const validPeriods = ['week', 'month', 'year'];
      if (!validPeriods.includes(period)) {
        return sendBadRequest(res, 'Invalid period. Use: week, month, or year');
      }

      const statistics = await Appointment.getStatistics(period);
      return sendSuccess(res, 'Statistics retrieved successfully', statistics);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = appointmentController;