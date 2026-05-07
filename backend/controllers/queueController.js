// backend/controllers/queueController.js
const Queue = require('../models/Queue');
const Appointment = require('../models/Appointment');
const AppointmentType = require('../models/AppointmentType');
const Patient = require('../models/Patient');
const { sendResponse } = require('../utils/responseHandler');
const blockchainAuditService = require('../services/blockchainAuditService');

const queueController = {
  // ==================== PUBLIC ROUTES ====================
  
  // OPTIMIZED: Get queue display board (public) - Legacy
  async getQueueDisplay(req, res, next) {
    try {
      const queue = await Queue.getQueueDisplay();
      sendResponse(res, 200, 'Queue display retrieved successfully', queue);
    } catch (error) {
      next(error);
    }
  },

  // ==================== STREAM-BASED PUBLIC METHODS ====================
  
  // NEW: Get queue display by stream (for kiosk/TV screens)
  async getQueueDisplayByStream(req, res, next) {
    try {
      const queueData = await Queue.getCurrentQueueByStream();
      
      // Format for public display (hide sensitive patient names if needed)
      const displayData = {
        testing: {
          now_serving: queueData.testing.now_serving ? {
            queue_code: queueData.testing.now_serving.queue_code,
            // Optionally hide full names for public display
            display_name: queueData.testing.now_serving.patient_first_name ? 
              `${queueData.testing.now_serving.patient_first_name.charAt(0)}. ${queueData.testing.now_serving.patient_last_name}` : 
              queueData.testing.now_serving.queue_code,
            type_name: queueData.testing.now_serving.type_name || 'Testing'
          } : null,
          waiting: queueData.testing.waiting.map(w => ({
            queue_code: w.queue_code,
            display_name: w.patient_first_name ? 
              `${w.patient_first_name.charAt(0)}. ${w.patient_last_name}` : 
              w.queue_code,
            type_name: w.type_name || 'Testing',
            wait_time: w.wait_time
          })),
          count: queueData.testing.waiting.length,
          estimated_wait: queueData.testing.estimated_wait,
          status: queueData.testing.serving.length > 0 ? 'BUSY' : 'AVAILABLE'
        },
        consultation: {
          now_serving: queueData.consultation.now_serving ? {
            queue_code: queueData.consultation.now_serving.queue_code,
            display_name: queueData.consultation.now_serving.patient_first_name ? 
              `${queueData.consultation.now_serving.patient_first_name.charAt(0)}. ${queueData.consultation.now_serving.patient_last_name}` : 
              queueData.consultation.now_serving.queue_code,
            type_name: queueData.consultation.now_serving.type_name || 'Consultation'
          } : null,
          waiting: queueData.consultation.waiting.map(w => ({
            queue_code: w.queue_code,
            display_name: w.patient_first_name ? 
              `${w.patient_first_name.charAt(0)}. ${w.patient_last_name}` : 
              w.queue_code,
            type_name: w.type_name || 'Consultation',
            wait_time: w.wait_time
          })),
          count: queueData.consultation.waiting.length,
          estimated_wait: queueData.consultation.estimated_wait,
          status: queueData.consultation.serving.length > 0 ? 'BUSY' : 'AVAILABLE'
        },
        stats: {
          total_waiting: queueData.stats.total_waiting,
          total_serving: queueData.stats.total_serving,
          testing_serving: queueData.stats.testing_serving,
          consultation_serving: queueData.stats.consultation_serving
        },
        last_updated: new Date().toISOString()
      };
      
      sendResponse(res, 200, 'Queue display retrieved successfully', displayData);
    } catch (error) {
      next(error);
    }
  },

  // NEW: Get stream statistics (quick overview)
  async getStreamStats(req, res, next) {
    try {
      const queueData = await Queue.getCurrentQueueByStream();
      
      sendResponse(res, 200, 'Stream statistics retrieved successfully', {
        testing: {
          active: queueData.testing.serving.length > 0,
          now_serving: queueData.testing.now_serving ? {
            queue_code: queueData.testing.now_serving.queue_code,
            started_at: queueData.testing.now_serving.served_at
          } : null,
          waiting_count: queueData.testing.waiting.length,
          estimated_wait_minutes: queueData.testing.estimated_wait,
          status: queueData.testing.serving.length > 0 ? 'BUSY' : 'AVAILABLE'
        },
        consultation: {
          active: queueData.consultation.serving.length > 0,
          now_serving: queueData.consultation.now_serving ? {
            queue_code: queueData.consultation.now_serving.queue_code,
            started_at: queueData.consultation.now_serving.served_at
          } : null,
          waiting_count: queueData.consultation.waiting.length,
          estimated_wait_minutes: queueData.consultation.estimated_wait,
          status: queueData.consultation.serving.length > 0 ? 'BUSY' : 'AVAILABLE'
        },
        summary: {
          total_waiting: queueData.stats.total_waiting,
          total_serving: queueData.stats.total_serving,
          can_call_testing: queueData.testing.serving.length === 0 && queueData.testing.waiting.length > 0,
          can_call_consultation: queueData.consultation.serving.length === 0 && queueData.consultation.waiting.length > 0
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // NEW: Get current queue by stream (for admin/nurse dashboard)
  async getCurrentQueueByStream(req, res, next) {
    try {
      const queueData = await Queue.getCurrentQueueByStream();
      sendResponse(res, 200, 'Queue by stream retrieved successfully', queueData);
    } catch (error) {
      next(error);
    }
  },

  // ==================== LEGACY QUEUE METHODS ====================

  // OPTIMIZED: Get current queue status using optimized method
  async getCurrentQueue(req, res, next) {
    try {
      const queueData = await Queue.getCurrentQueueOptimized();
      sendResponse(res, 200, 'Current queue retrieved successfully', queueData);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Get all queue entries (Admin/Nurse only)
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
      
      let estimatedWaitTime = 0;
      for (let i = 0; i < grouped.waiting.length; i++) {
        grouped.waiting[i].estimated_wait_minutes = estimatedWaitTime;
        estimatedWaitTime += 15;
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

  // OPTIMIZED: Get queue statistics
  async getQueueStatistics(req, res, next) {
    try {
      const stats = await Queue.getQueueStatistics();
      sendResponse(res, 200, 'Queue statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Get queue history with filters
  async getQueueHistory(req, res, next) {
    try {
      const { page = 1, limit = 20, start_date, end_date, status, stream } = req.query;
      const offset = (page - 1) * limit;
      
      const filters = { start_date, end_date, status, stream };
      const history = await Queue.getQueueHistory(filters, { limit, offset });
      const total = await Queue.countHistory(filters);
      const summary = await Queue.getTodaySummary();
      
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

  // OPTIMIZED: Get patient's queue status
  async getPatientQueue(req, res, next) {
    try {
      const { patientId } = req.params;
      const queueEntry = await Queue.getPatientCurrentQueue(patientId);
      
      if (!queueEntry) {
        return sendResponse(res, 200, 'Patient not in queue', null);
      }
      
      const position = await Queue.getPatientPositionInStream(queueEntry.stream_queue_number, queueEntry.queue_stream);
      queueEntry.position = position;
      queueEntry.estimated_wait_minutes = (position - 1) * 15;
      
      sendResponse(res, 200, 'Patient queue status retrieved successfully', queueEntry);
    } catch (error) {
      next(error);
    }
  },

  // ==================== SERVICE TYPE METHODS (Legacy) ====================

  // NEW: Get current queue organized by service type (for multi-room support)
  async getCurrentQueueByServiceType(req, res, next) {
    try {
      const queueData = await Queue.getCurrentQueueByServiceType();
      sendResponse(res, 200, 'Queue by service type retrieved successfully', queueData);
    } catch (error) {
      next(error);
    }
  },

  // NEW: Call patient to specific service type room
  async callPatientByType(req, res, next) {
    try {
      const { serviceTypeId } = req.params;
      
      const queueEntry = await Queue.getNextWaitingPatientForType(serviceTypeId);
      
      if (!queueEntry) {
        return sendResponse(res, 404, `No patients waiting for service type ${serviceTypeId}`);
      }
      
      await Queue.updateStatus(queueEntry.id, 'CALLED', {
        called_at: new Date(),
        updated_by: req.user.id
      });
      
      await Appointment.updateStatus(queueEntry.appointment_id, 'IN_PROGRESS', req.user.id);
      
      const updated = await Queue.findById(queueEntry.id);
      
      sendResponse(res, 200, `Patient called for ${updated.type_name} service`, updated);
    } catch (error) {
      next(error);
    }
  },

  // NEW: Get waiting time by service type
  async getWaitingTimeByType(req, res, next) {
    try {
      const waitingTimes = await Queue.getWaitingTimeByType();
      sendResponse(res, 200, 'Waiting time by service type retrieved', waitingTimes);
    } catch (error) {
      next(error);
    }
  },

  // ==================== PATIENT SELF-SERVICE ====================

  // OPTIMIZED: Get current patient's own queue status
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

  // ==================== QUEUE MANAGEMENT ====================

  // OPTIMIZED: Confirm appointment and add to queue
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
      
      const queueEntry = await Queue.confirmAppointment(appointmentId, req.user.id);
      
      blockchainAuditService.logAction(
        'CONFIRM_AND_ADD_TO_QUEUE',
        'queue',
        queueEntry.id,
        appointment.patient_id,
        { status: appointment.status },
        { status: 'CONFIRMED', queue_number: queueEntry.queue_number, queue_code: queueEntry.queue_code, queue_stream: queueEntry.queue_stream },
        `Confirmed appointment and added to ${queueEntry.queue_stream} queue (${queueEntry.queue_code})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 201, 'Appointment confirmed and added to queue successfully', {
        appointment: {
          id: appointment.id,
          status: 'CONFIRMED'
        },
        queue: queueEntry
      });
    } catch (error) {
      next(error);
    }
  },

  // Add walk-in patient
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
    
    // Get appointment type to determine stream
    const appointmentType = await AppointmentType.findById(appointment_type_id);
    const typeName = appointmentType?.type_name?.toLowerCase() || '';
    const queueStream = typeName === 'testing' ? 'TESTING' : 'CONSULTATION';
    
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
    
    // Generate queue numbers
    const streamQueueNumber = await Queue.getNextStreamQueueNumber(queueStream);
    const globalQueueNumber = await Queue.getNextQueueNumber();
    const queueCode = await Queue.generateQueueCode(streamQueueNumber, queueStream);
    
    // Add to queue
    const queueId = await Queue.create({
      appointment_id: appointmentId,
      queue_number: globalQueueNumber,
      queue_code: queueCode,
      priority: 0,
      created_by: req.user.id,
      queue_stream: queueStream,
      stream_queue_number: streamQueueNumber
    });
    
    const newQueue = await Queue.findById(queueId);
    
    sendResponse(res, 201, 'Walk-in patient added to queue successfully', newQueue);
  } catch (error) {
    next(error);
  }
},

  // NEW: Call patient by stream (Testing or Consultation)
  async callPatientByStream(req, res, next) {
    try {
      const { stream } = req.params;
      
      // Validate stream
      if (!['TESTING', 'CONSULTATION'].includes(stream)) {
        return sendResponse(res, 400, 'Invalid stream. Must be TESTING or CONSULTATION');
      }
      
      // Check if stream is already serving a patient
      const queueData = await Queue.getCurrentQueueByStream();
      const streamData = stream === 'TESTING' ? queueData.testing : queueData.consultation;
      
      if (streamData.serving.length > 0) {
        return sendResponse(res, 400, `Cannot call new patient. ${stream} stream is already serving ${streamData.serving[0].queue_code}`);
      }
      
      // Get next waiting patient for this stream
      const queueEntry = await Queue.getNextWaitingPatientForStream(stream);
      
      if (!queueEntry) {
        return sendResponse(res, 404, `No patients waiting in ${stream} stream`);
      }
      
      // Update queue status
      await Queue.updateStatus(queueEntry.id, 'CALLED', {
        called_at: new Date(),
        updated_by: req.user.id
      });
      
      // Update appointment status
      await Appointment.updateStatus(queueEntry.appointment_id, 'IN_PROGRESS', req.user.id);
      
      const updated = await Queue.findById(queueEntry.id);
      
      blockchainAuditService.logAction(
        'CALL_BY_STREAM',
        'queue',
        queueEntry.id,
        queueEntry.patient_id,
        { status: 'WAITING', stream: stream },
        { status: 'CALLED', stream: stream },
        `Called patient ${updated.queue_code} for ${stream} service`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 200, `Patient called for ${stream} service`, updated);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Call patient (next or specific) - Legacy
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
      
      await Queue.updateStatus(queueEntry.id, 'CALLED', {
        called_at: new Date(),
        updated_by: req.user.id
      });
      
      await Appointment.updateStatus(queueEntry.appointment_id, 'IN_PROGRESS', req.user.id);
      
      const updated = await Queue.findById(queueEntry.id);
      
      blockchainAuditService.logAction(
        id === 'next' ? 'CALL_NEXT' : 'CALL',
        'queue',
        queueEntry.id,
        queueEntry.patient_id,
        { status: 'WAITING' },
        { status: 'CALLED' },
        `Called patient ${updated.queue_code} (${updated.patient_first_name} ${updated.patient_last_name})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 200, 'Patient called successfully', updated);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Start serving patient
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
      
      blockchainAuditService.logAction(
        'START_SERVING',
        'queue',
        id,
        queueEntry.patient_id,
        { status: 'CALLED' },
        { status: 'SERVING' },
        `Started serving patient ${updated.queue_code} in ${updated.queue_stream} stream`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 200, 'Started serving patient', updated);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Complete serving patient
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
      
      blockchainAuditService.logAction(
        'COMPLETE_SERVICE',
        'queue',
        id,
        queueEntry.patient_id,
        { status: 'SERVING' },
        { status: 'COMPLETED' },
        `Completed service for patient ${updated.queue_code}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 200, 'Service completed successfully', updated);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Skip patient
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
      
      blockchainAuditService.logAction(
        'SKIP',
        'queue',
        id,
        queueEntry.patient_id,
        { status: queueEntry.status },
        { status: 'SKIPPED' },
        `Skipped patient ${queueEntry.queue_code}${reason ? ': ' + reason : ''}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
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

  // OPTIMIZED: Update queue priority (reorder)
  async updatePriority(req, res, next) {
    try {
      const { queue_id, priority } = req.body;
      const queueEntry = await Queue.findById(queue_id);
      
      if (!queueEntry) {
        return sendResponse(res, 404, 'Queue entry not found');
      }
      
      const oldPriority = queueEntry.priority;
      await Queue.updatePriority(queue_id, priority, req.user.id);
      
      blockchainAuditService.logAction(
        'UPDATE_PRIORITY',
        'queue',
        queue_id,
        queueEntry.patient_id,
        { priority: oldPriority },
        { priority: priority },
        `Updated queue priority from ${oldPriority} to ${priority} for ${queueEntry.queue_code}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendResponse(res, 200, 'Queue priority updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Reset queue (with filters)
  async resetQueue(req, res, next) {
    try {
      const { appointment_id, date } = req.query;
      const filters = { appointment_id, date };
      
      const queueEntries = await Queue.getQueueEntriesForReset(filters);
      
      if (queueEntries.length === 0) {
        return sendResponse(res, 404, 'No queue entries found to reset');
      }
      
      for (const entry of queueEntries) {
        blockchainAuditService.logAction(
          'DELETE',
          'queue',
          entry.id,
          entry.patient_id,
          entry,
          null,
          `Reset queue entry (${entry.queue_code}) for patient ${entry.first_name} ${entry.last_name}`,
          req
        ).catch(err => console.error('Blockchain audit log failed:', err));
      }
      
      const appointmentIds = [...new Set(queueEntries.map(entry => entry.appointment_id))];
      for (const apptId of appointmentIds) {
        await Appointment.updateStatus(apptId, 'SCHEDULED', req.user.id);
      }
      
      const count = await Queue.deleteByFilters(filters);
      
      sendResponse(res, 200, `Successfully reset ${count} queue entries`, { count });
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Get queue summary
  async getQueueSummary(req, res, next) {
    try {
      const summary = await Queue.getCurrentSummary();
      sendResponse(res, 200, 'Queue summary retrieved successfully', summary);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Check if appointment is in queue
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

  // OPTIMIZED: Get daily stats
  async getDailyStats(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const stats = await Queue.getDailyStats(start_date, end_date);
      sendResponse(res, 200, 'Daily stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Get peak hours stats
  async getPeakHours(req, res, next) {
    try {
      const peakHours = await Queue.getPeakHours();
      sendResponse(res, 200, 'Peak hours stats retrieved successfully', peakHours);
    } catch (error) {
      next(error);
    }
  },

  // OPTIMIZED: Batch update multiple queue statuses
  async batchUpdateStatus(req, res, next) {
    try {
      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return sendResponse(res, 400, 'Updates array is required');
      }
      
      for (const update of updates) {
        if (!update.id || !update.status) {
          return sendResponse(res, 400, 'Each update must have id and status');
        }
        if (!['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED'].includes(update.status)) {
          return sendResponse(res, 400, `Invalid status: ${update.status}`);
        }
      }
      
      const updatesWithUser = updates.map(update => ({
        ...update,
        updated_by: req.user.id
      }));
      
      const result = await Queue.batchUpdateStatus(updatesWithUser);
      
      if (result) {
        sendResponse(res, 200, `Successfully updated ${updates.length} queue entries`);
      } else {
        sendResponse(res, 500, 'Failed to update queue entries');
      }
    } catch (error) {
      next(error);
    }
  },

  // ==================== ENHANCED WAITING TIME ESTIMATION ====================
  
  // ENHANCED: Get waiting time estimation with stream support
  async getWaitingTimeEstimation(req, res, next) {
    try {
      const queueData = await Queue.getCurrentQueueByStream();
      
      sendResponse(res, 200, 'Waiting time estimation retrieved', {
        testing: {
          current_waiting: queueData.testing.waiting.length,
          estimated_wait_minutes: queueData.testing.estimated_wait,
          estimated_wait_formatted: queueData.testing.estimated_wait < 60 ? 
            `${queueData.testing.estimated_wait} minutes` : 
            `${Math.floor(queueData.testing.estimated_wait / 60)}h ${queueData.testing.estimated_wait % 60}m`,
          now_serving: queueData.testing.now_serving ? {
            queue_code: queueData.testing.now_serving.queue_code,
            patient_name: `${queueData.testing.now_serving.patient_first_name} ${queueData.testing.now_serving.patient_last_name}`
          } : null,
          next: queueData.testing.waiting[0] ? {
            queue_code: queueData.testing.waiting[0].queue_code,
            patient_name: `${queueData.testing.waiting[0].patient_first_name} ${queueData.testing.waiting[0].patient_last_name}`
          } : null
        },
        consultation: {
          current_waiting: queueData.consultation.waiting.length,
          estimated_wait_minutes: queueData.consultation.estimated_wait,
          estimated_wait_formatted: queueData.consultation.estimated_wait < 60 ? 
            `${queueData.consultation.estimated_wait} minutes` : 
            `${Math.floor(queueData.consultation.estimated_wait / 60)}h ${queueData.consultation.estimated_wait % 60}m`,
          now_serving: queueData.consultation.now_serving ? {
            queue_code: queueData.consultation.now_serving.queue_code,
            patient_name: `${queueData.consultation.now_serving.patient_first_name} ${queueData.consultation.now_serving.patient_last_name}`
          } : null,
          next: queueData.consultation.waiting[0] ? {
            queue_code: queueData.consultation.waiting[0].queue_code,
            patient_name: `${queueData.consultation.waiting[0].patient_first_name} ${queueData.consultation.waiting[0].patient_last_name}`
          } : null
        },
        overall: {
          total_waiting: queueData.stats.total_waiting,
          peak_stream: queueData.testing.waiting.length > queueData.consultation.waiting.length ? 'TESTING' : 'CONSULTATION'
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = queueController;