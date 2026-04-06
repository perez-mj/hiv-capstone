// backend/controllers/queueController.js
const Queue = require('../models/Queue');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const { sendResponse } = require('../utils/responseHandler');

const queueController = {
  // Get queue display board (public)
  async getQueueDisplay(req, res, next) {
    try {
      const queue = await Queue.getQueueDisplay();
      sendResponse(res, 200, 'Queue display retrieved successfully', queue);
    } catch (error) {
      next(error);
    }
  },

  // Get current queue status
  async getCurrentQueue(req, res, next) {
    try {
      const queue = await Queue.getTodayQueue();
      
      const nowServing = queue.find(q => q.status === 'SERVING');
      const waitingCount = queue.filter(q => q.status === 'WAITING').length;
      const calledCount = queue.filter(q => q.status === 'CALLED').length;
      const estimatedWaitTime = waitingCount * 15;
      
      const grouped = {
        waiting: queue.filter(q => q.status === 'WAITING'),
        called: queue.filter(q => q.status === 'CALLED'),
        serving: queue.filter(q => q.status === 'SERVING')
      };
      
      // Return data directly without extra nesting
      sendResponse(res, 200, 'Current queue retrieved successfully', {
        waiting: grouped.waiting,
        called: grouped.called,
        serving: grouped.serving,
        now_serving: nowServing ? {
          id: nowServing.id,
          number: nowServing.queue_number,
          code: nowServing.queue_code,
          name: `${nowServing.patient_first_name} ${nowServing.patient_last_name}`,
          type: nowServing.type_name
        } : null,
        stats: {
          waiting_count: waitingCount,
          called_count: calledCount,
          serving_count: grouped.serving.length,
          total_in_queue: queue.length,
          estimated_total_wait: estimatedWaitTime
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all queue entries (Admin/Nurse only)
  async getAllQueue(req, res, next) {
    try {
      const queue = await Queue.getTodayQueue();
      
      const grouped = {
        waiting: queue.filter(q => q.status === 'WAITING'),
        called: queue.filter(q => q.status === 'CALLED'),
        serving: queue.filter(q => q.status === 'SERVING'),
        total: queue.length
      };
      
      const currentServing = queue.find(q => q.status === 'SERVING');
      
      // Calculate estimated wait times
      const avgServiceTime = 15;
      let estimatedWaitTime = 0;
      for (let i = 0; i < grouped.waiting.length; i++) {
        grouped.waiting[i].estimated_wait_minutes = estimatedWaitTime;
        estimatedWaitTime += avgServiceTime;
      }
      
      sendResponse(res, 200, 'Queue retrieved successfully', {
        waiting: grouped.waiting,
        called: grouped.called,
        serving: grouped.serving,
        current_serving: currentServing || null,
        stats: {
          waiting_count: grouped.waiting.length,
          called_count: grouped.called.length,
          serving_count: grouped.serving.length,
          total_in_queue: grouped.total,
          estimated_total_wait: estimatedWaitTime
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get queue statistics
  async getQueueStatistics(req, res, next) {
    try {
      const stats = await Queue.getQueueStatistics();
      sendResponse(res, 200, 'Queue statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  },

  // Get queue history with filters
  async getQueueHistory(req, res, next) {
    try {
      const { page = 1, limit = 20, start_date, end_date, status } = req.query;
      const offset = (page - 1) * limit;
      
      const filters = { start_date, end_date, status };
      const history = await Queue.getQueueHistory(filters, { limit, offset });
      const total = await Queue.countHistory(filters);
      const summary = await Queue.getTodaySummary();
      
      // Return data directly without extra nesting
      sendResponse(res, 200, 'Queue history retrieved successfully', {
        data: history,
        summary: {
          avg_wait_time: Math.round(summary.avg_wait_time || 0),
          avg_service_time: Math.round(summary.avg_service_time || 0),
          total_served: summary.total_served || 0,
          skipped_count: summary.skipped_count || 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get patient's queue status
  async getPatientQueue(req, res, next) {
    try {
      const { patientId } = req.params;
      const queueEntry = await Queue.getPatientCurrentQueue(patientId);
      
      if (!queueEntry) {
        return sendResponse(res, 200, 'Patient not in queue', null);
      }
      
      const position = await Queue.getPatientPositionInQueue(queueEntry.queue_number);
      queueEntry.position = position;
      queueEntry.estimated_wait_minutes = (position - 1) * 15;
      
      sendResponse(res, 200, 'Patient queue status retrieved successfully', queueEntry);
    } catch (error) {
      next(error);
    }
  },

  // Get current patient's own queue status
  async getMyQueueStatus(req, res, next) {
    try {
      if (req.user.role !== 'PATIENT') {
        return sendResponse(res, 403, 'Only patients can access their queue status');
      }
      
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) {
        return sendResponse(res, 404, 'Patient record not found');
      }
      
      const queueStatus = await Queue.getPatientCurrentQueue(patient.id);
      
      if (!queueStatus) {
        return sendResponse(res, 200, 'You are not currently in the queue', { in_queue: false });
      }
      
      const avgServiceTime = 15;
      queueStatus.estimated_wait_minutes = (queueStatus.position - 1) * avgServiceTime;
      
      sendResponse(res, 200, 'Queue status retrieved successfully', {
        in_queue: true,
        data: queueStatus
      });
    } catch (error) {
      next(error);
    }
  },

  // Confirm appointment and add to queue
  async confirmAndAddToQueue(req, res, next) {
    try {
      const { appointmentId } = req.params;
      
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return sendResponse(res, 404, 'Appointment not found');
      }
      
      if (appointment.status !== 'SCHEDULED') {
        return sendResponse(res, 400, `Cannot confirm appointment with status '${appointment.status}'`);
      }
      
      const existingQueue = await Queue.findByAppointmentId(appointmentId);
      if (existingQueue) {
        return sendResponse(res, 400, 'Appointment is already in today\'s queue');
      }
      
      // Update appointment status
      await Appointment.updateStatus(appointmentId, 'CONFIRMED', req.user.id);
      
      // Generate queue number
      const queueNumber = await Queue.getNextQueueNumber();
      const queueCode = await Queue.generateQueueCode(queueNumber);
      
      // Add to queue
      const queueId = await Queue.create({
        appointment_id: appointmentId,
        queue_number: queueNumber,
        queue_code: queueCode,
        priority: 0,
        created_by: req.user.id
      });
      
      const newQueue = await Queue.findById(queueId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'CONFIRM_AND_ADD_TO_QUEUE',
        table_name: 'queue',
        record_id: queueId,
        patient_id: appointment.patient_id,
        old_values: { status: appointment.status },
        new_values: { status: 'CONFIRMED', queue_number: queueNumber, queue_code: queueCode },
        description: `Confirmed appointment and added to queue (${queueCode})`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 201, 'Appointment confirmed and added to queue successfully', {
        appointment: {
          id: appointment.id,
          status: 'CONFIRMED'
        },
        queue: newQueue
      });
    } catch (error) {
      next(error);
    }
  },

  // Add walk-in patient to queue
  async addWalkIn(req, res, next) {
    try {
      const { patient_id, appointment_type_id, notes } = req.body;
      
      if (!patient_id || !appointment_type_id) {
        return sendResponse(res, 400, 'Patient ID and appointment type are required');
      }
      
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return sendResponse(res, 404, 'Patient not found');
      }
      
      const existingQueue = await Queue.getPatientCurrentQueue(patient_id);
      if (existingQueue) {
        return sendResponse(res, 400, 'Patient is already in today\'s queue');
      }
      
      // Create temporary appointment for walk-in
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + 5);
      
      const date = new Date();
      const datePrefix = `W${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      
      const appointmentNumber = await Appointment.generateNumber(datePrefix);
      
      const appointmentId = await Appointment.create({
        appointment_number: appointmentNumber,
        patient_id,
        appointment_type_id,
        scheduled_at: scheduledAt,
        notes: notes || 'Walk-in patient',
        status: 'CONFIRMED',
        created_by: req.user.id
      });
      
      // Generate queue number
      const queueNumber = await Queue.getNextQueueNumber();
      const queueCode = await Queue.generateQueueCode(queueNumber);
      
      // Add to queue
      const queueId = await Queue.create({
        appointment_id: appointmentId,
        queue_number: queueNumber,
        queue_code: queueCode,
        priority: 0,
        created_by: req.user.id
      });
      
      const newQueue = await Queue.findById(queueId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'WALKIN_ADD',
        table_name: 'queue',
        record_id: queueId,
        patient_id: patient_id,
        new_values: newQueue,
        description: `Added walk-in patient ${patient.first_name} ${patient.last_name} to queue (${queueCode})`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 201, 'Walk-in patient added to queue successfully', newQueue);
    } catch (error) {
      next(error);
    }
  },

  // Call patient (next or specific)
  async callPatient(req, res, next) {
    try {
      const { id } = req.params;
      let queueEntry;
      
      if (id === 'next') {
        queueEntry = await Queue.getNextWaitingPatient();
        if (!queueEntry) {
          return sendResponse(res, 404, 'No patients waiting in queue');
        }
      } else {
        queueEntry = await Queue.findById(id);
        if (!queueEntry) {
          return sendResponse(res, 404, 'Queue entry not found');
        }
        if (queueEntry.status !== 'WAITING') {
          return sendResponse(res, 400, `Cannot call patient with status '${queueEntry.status}'`);
        }
      }
      
      // Update queue status
      await Queue.updateStatus(queueEntry.id, 'CALLED', {
        called_at: new Date(),
        updated_by: req.user.id
      });
      
      // Update appointment status
      await Appointment.updateStatus(queueEntry.appointment_id, 'IN_PROGRESS', req.user.id);
      
      const updated = await Queue.findById(queueEntry.id);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: id === 'next' ? 'CALL_NEXT' : 'CALL',
        table_name: 'queue',
        record_id: queueEntry.id,
        patient_id: queueEntry.patient_id,
        old_values: { status: 'WAITING' },
        new_values: { status: 'CALLED' },
        description: `Called patient ${updated.queue_code}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Patient called successfully', updated);
    } catch (error) {
      next(error);
    }
  },

  // Start serving patient
  async startServing(req, res, next) {
    try {
      const { id } = req.params;
      const queueEntry = await Queue.findById(id);
      
      if (!queueEntry) {
        return sendResponse(res, 404, 'Queue entry not found');
      }
      
      if (queueEntry.status !== 'CALLED') {
        return sendResponse(res, 400, `Cannot start serving patient with status '${queueEntry.status}'`);
      }
      
      await Queue.updateStatus(id, 'SERVING', {
        served_at: new Date(),
        updated_by: req.user.id
      });
      
      const updated = await Queue.findById(id);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'START_SERVING',
        table_name: 'queue',
        record_id: id,
        patient_id: queueEntry.patient_id,
        old_values: { status: 'CALLED' },
        new_values: { status: 'SERVING' },
        description: `Started serving patient ${updated.queue_code}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Started serving patient', updated);
    } catch (error) {
      next(error);
    }
  },

  // Complete serving patient
  async completeService(req, res, next) {
    try {
      const { id } = req.params;
      const queueEntry = await Queue.findById(id);
      
      if (!queueEntry) {
        return sendResponse(res, 404, 'Queue entry not found');
      }
      
      if (queueEntry.status !== 'SERVING') {
        return sendResponse(res, 400, `Cannot complete service for patient with status '${queueEntry.status}'`);
      }
      
      await Queue.updateStatus(id, 'COMPLETED', {
        completed_at: new Date(),
        updated_by: req.user.id
      });
      
      await Appointment.updateStatus(queueEntry.appointment_id, 'COMPLETED', req.user.id);
      
      const updated = await Queue.findById(id);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'COMPLETE_SERVICE',
        table_name: 'queue',
        record_id: id,
        patient_id: queueEntry.patient_id,
        old_values: { status: 'SERVING' },
        new_values: { status: 'COMPLETED' },
        description: `Completed service for patient ${updated.queue_code}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Service completed successfully', updated);
    } catch (error) {
      next(error);
    }
  },

  // Skip patient
  async skipPatient(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const queueEntry = await Queue.findById(id);
      
      if (!queueEntry) {
        return sendResponse(res, 404, 'Queue entry not found');
      }
      
      if (!['WAITING', 'CALLED'].includes(queueEntry.status)) {
        return sendResponse(res, 400, `Cannot skip patient with status '${queueEntry.status}'`);
      }
      
      await Queue.updateStatus(id, 'SKIPPED', { updated_by: req.user.id });
      await Appointment.updateStatus(queueEntry.appointment_id, 'SCHEDULED', req.user.id);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'SKIP',
        table_name: 'queue',
        record_id: id,
        patient_id: queueEntry.patient_id,
        old_values: { status: queueEntry.status },
        new_values: { status: 'SKIPPED' },
        description: `Skipped patient ${queueEntry.queue_code}${reason ? ': ' + reason : ''}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Patient skipped successfully', {
        id: queueEntry.id,
        queue_number: queueEntry.queue_number,
        queue_code: queueEntry.queue_code,
        status: 'SKIPPED',
        patient_name: `${queueEntry.patient_first_name} ${queueEntry.patient_last_name}`
      });
    } catch (error) {
      next(error);
    }
  },

  // Update queue priority (reorder)
  async updatePriority(req, res, next) {
    try {
      const { queue_id, priority } = req.body;
      const queueEntry = await Queue.findById(queue_id);
      
      if (!queueEntry) {
        return sendResponse(res, 404, 'Queue entry not found');
      }
      
      const oldPriority = queueEntry.priority;
      await Queue.updatePriority(queue_id, priority, req.user.id);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'UPDATE_PRIORITY',
        table_name: 'queue',
        record_id: queue_id,
        patient_id: queueEntry.patient_id,
        old_values: { priority: oldPriority },
        new_values: { priority },
        description: `Updated queue priority from ${oldPriority} to ${priority} for ${queueEntry.queue_code}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      sendResponse(res, 200, 'Queue priority updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // Reset queue (with filters)
  async resetQueue(req, res, next) {
    try {
      const { appointment_id, date } = req.query;
      const filters = { appointment_id, date };
      
      const queueEntries = await Queue.getQueueEntriesForReset(filters);
      
      if (queueEntries.length === 0) {
        return sendResponse(res, 404, 'No queue entries found to reset');
      }
      
      // Log audit for each entry
      for (const entry of queueEntries) {
        await AuditLog.log({
          user_id: req.user.id,
          action_type: 'DELETE',
          table_name: 'queue',
          record_id: entry.id,
          patient_id: entry.patient_id,
          old_values: entry,
          description: `Reset queue entry (${entry.queue_code}) for patient ${entry.first_name} ${entry.last_name}`,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      }
      
      // Update appointments status back to SCHEDULED
      const appointmentIds = [...new Set(queueEntries.map(entry => entry.appointment_id))];
      for (const apptId of appointmentIds) {
        await Appointment.updateStatus(apptId, 'SCHEDULED', req.user.id);
      }
      
      // Delete queue entries
      const count = await Queue.deleteByFilters(filters);
      
      sendResponse(res, 200, `Successfully reset ${count} queue entries`, { count });
    } catch (error) {
      next(error);
    }
  },

  // Get queue summary
  async getQueueSummary(req, res, next) {
    try {
      const summary = await Queue.getCurrentSummary();
      sendResponse(res, 200, 'Queue summary retrieved successfully', summary);
    } catch (error) {
      next(error);
    }
  },

  // Check if appointment is in queue
  async checkAppointmentInQueue(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const queueEntry = await Queue.getCheckInStatus(appointmentId);
      
      if (!queueEntry) {
        return sendResponse(res, 200, 'Appointment not in queue', { in_queue: false });
      }
      
      sendResponse(res, 200, 'Appointment in queue', {
        in_queue: true,
        data: queueEntry
      });
    } catch (error) {
      next(error);
    }
  },

  // Get daily stats
  async getDailyStats(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const stats = await Queue.getDailyStats(start_date, end_date);
      sendResponse(res, 200, 'Daily stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  },

  // Get peak hours stats
  async getPeakHours(req, res, next) {
    try {
      const peakHours = await Queue.getPeakHours();
      sendResponse(res, 200, 'Peak hours stats retrieved successfully', peakHours);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = queueController;