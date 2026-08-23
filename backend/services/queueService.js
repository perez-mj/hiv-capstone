// backend/services/queueService.js
const db = require('../models');
const { Op } = require('sequelize');

class QueueService {
  /**
   * Get or create a queue for a specific office and date
   */
  async getOrCreateQueue(office, date) {
    let queue = await db.Queue.findOne({
      where: {
        office,
        date
      }
    });

    if (!queue) {
      queue = await db.Queue.create({
        office,
        date,
        current_number: 0,
        completed_count: 0,
        skipped_count: 0,
        noshow_count: 0,
        total_wait_time_minutes: 0,
        average_wait_time_minutes: 0
      });
    }

    return queue;
  }

  /**
   * Add a patient to the queue
   */
  async addToQueue(office, date, patientId, appointmentId = null) {
    try {
      // Get or create the queue for this date and office
      const queue = await this.getOrCreateQueue(office, date);

      // Check if patient is already in queue for this date and office
      const existing = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          patient_id: patientId,
          status: { [Op.in]: ['waiting', 'in-progress'] }
        }
      });

      if (existing) {
        return {
          success: false,
          message: 'Patient already in queue',
          existing
        };
      }

      // Get transaction type info
      let transactionTypeId = null;
      let estimatedDurationMinutes = 30; // Default

      if (appointmentId) {
        const appointment = await db.Appointment.findByPk(appointmentId, {
          include: [
            {
              model: db.TransactionType,
              as: 'TransactionType',
              attributes: ['id', 'estimated_duration_minutes']
            }
          ]
        });

        if (appointment && appointment.TransactionType) {
          transactionTypeId = appointment.TransactionType.id;
          estimatedDurationMinutes = appointment.TransactionType.estimated_duration_minutes || 30;
        }
      }

      // If no transaction type from appointment, get default for the office
      if (!transactionTypeId) {
        const defaultType = await db.TransactionType.findOne({
          where: {
            office: office,
            is_active: true
          },
          order: [['id', 'ASC']]
        });

        if (defaultType) {
          transactionTypeId = defaultType.id;
          estimatedDurationMinutes = defaultType.estimated_duration_minutes || 30;
        } else {
          throw new Error(`No transaction type configured for ${office} office`);
        }
      }

      // Calculate next position
      const maxPosition = await db.QueueEntry.max('position', {
        where: { queue_id: queue.id }
      });

      const position = (maxPosition || 0) + 1;

      // Generate queue number (e.g., "001", "002", etc.)
      const queueNumber = String(position).padStart(3, '0');

      // Create queue entry with all required fields
      const entry = await db.QueueEntry.create({
        queue_id: queue.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        transaction_type_id: transactionTypeId,
        queue_number: queueNumber,
        position: position,
        status: 'waiting',
        estimated_duration_minutes: estimatedDurationMinutes
      });

      // Get patient info for response
      const patient = await db.Patient.findByPk(patientId, {
        attributes: ['id', 'first_name', 'last_name', 'contact_number']
      });

      // Fetch the full queue entry with associations
      const fullEntry = await db.QueueEntry.findByPk(entry.id, {
        include: [
          {
            model: db.Patient,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name', 'contact_number']
          },
          {
            model: db.TransactionType,
            as: 'TransactionType',
            attributes: ['id', 'name', 'estimated_duration_minutes', 'color_code']
          },
          {
            model: db.Queue,
            as: 'Queue',
            attributes: ['id', 'office', 'date', 'current_number']
          }
        ]
      });

      return {
        success: true,
        queueEntry: fullEntry.toJSON()
      };
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue state for an office and date
   */
  async getQueueState(office, date) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        },
        include: [
          {
            model: db.QueueEntry,
            as: 'QueueEntries',
            where: {
              status: { [Op.in]: ['waiting', 'in-progress'] }
            },
            required: false,
            include: [
              {
                model: db.Patient,
                as: 'Patient',
                attributes: ['id', 'first_name', 'last_name', 'contact_number']
              },
              {
                model: db.TransactionType,
                as: 'TransactionType',
                attributes: ['id', 'name', 'estimated_duration_minutes', 'color_code']
              }
            ],
            order: [['position', 'ASC']]
          }
        ]
      });

      if (!queue) {
        return {
          current_serving: null,
          waiting_list: [],
          waiting_count: 0,
          stats: {
            completed: 0,
            skipped: 0,
            noShow: 0
          }
        };
      }

      // Get stats from queue model
      const stats = {
        completed: queue.completed_count || 0,
        skipped: queue.skipped_count || 0,
        noShow: queue.noshow_count || 0
      };

      const waitingEntries = queue.QueueEntries || [];
      const waitingList = waitingEntries.filter(e => e.status === 'waiting');
      const currentServing = waitingEntries.find(e => e.status === 'in-progress');

      return {
        current_serving: currentServing || null,
        waiting_list: waitingList,
        waiting_count: waitingList.length,
        stats: stats
      };
    } catch (error) {
      console.error('Error getting queue state:', error);
      throw error;
    }
  }

  /**
   * Call next patient in queue
   */
  async callNext(office, date) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        }
      });

      if (!queue) {
        throw new Error('No queue found for this date');
      }

      // Find the next waiting patient
      const nextEntry = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'waiting'
        },
        order: [['position', 'ASC']],
        include: [
          {
            model: db.Patient,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });

      if (!nextEntry) {
        return {
          success: false,
          message: 'No patients waiting in queue'
        };
      }

      // Update entry status to in-progress
      await nextEntry.update({
        status: 'in-progress',
        called_at: new Date()
      });

      // Update queue current number
      await queue.update({
        current_number: nextEntry.position
      });

      return {
        success: true,
        queueEntry: nextEntry.toJSON()
      };
    } catch (error) {
      console.error('Error calling next:', error);
      throw error;
    }
  }

  /**
   * Skip current patient
   */
  async skipCurrent(office, date, reason = 'Skipped by staff') {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        }
      });

      if (!queue) {
        throw new Error('No queue found for this date');
      }

      const currentEntry = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'in-progress'
        },
        include: [
          {
            model: db.Patient,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });

      if (!currentEntry) {
        return {
          success: false,
          message: 'No patient currently being served'
        };
      }

      await currentEntry.update({
        status: 'skipped',
        skip_reason: reason
      });

      // Update queue stats
      await queue.increment('skipped_count');

      return {
        success: true,
        queueEntry: currentEntry.toJSON()
      };
    } catch (error) {
      console.error('Error skipping current:', error);
      throw error;
    }
  }

  /**
   * Reset queue (end of day)
   */
  async resetQueue(office, date) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        }
      });

      if (!queue) {
        return {
          success: false,
          message: 'No queue found for this date'
        };
      }

      // Mark all waiting and in-progress as completed
      await db.QueueEntry.update(
        { status: 'completed', completed_at: new Date() },
        {
          where: {
            queue_id: queue.id,
            status: { [Op.in]: ['waiting', 'in-progress'] }
          }
        }
      );

      // Reset queue counters
      await queue.update({
        current_number: 0,
        completed_count: queue.completed_count || 0 // Keep completed count
      });

      return {
        success: true,
        message: 'Queue reset successfully'
      };
    } catch (error) {
      console.error('Error resetting queue:', error);
      throw error;
    }
  }

  /**
   * Complete current patient
   */
  async completeCurrent(office, date) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        }
      });

      if (!queue) {
        throw new Error('No queue found for this date');
      }

      const currentEntry = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'in-progress'
        }
      });

      if (!currentEntry) {
        return {
          success: false,
          message: 'No patient currently being served'
        };
      }

      await currentEntry.update({
        status: 'completed',
        completed_at: new Date()
      });

      // Update queue stats
      await queue.increment('completed_count');

      // Update average wait time
      if (currentEntry.called_at) {
        const waitTime = Math.floor((new Date() - new Date(currentEntry.called_at)) / 60000);
        const totalWait = queue.total_wait_time_minutes || 0;
        const totalCompleted = (queue.completed_count || 0) + 1;
        const newTotalWait = totalWait + waitTime;
        const avgWait = Math.round(newTotalWait / totalCompleted);
        
        await queue.update({
          total_wait_time_minutes: newTotalWait,
          average_wait_time_minutes: avgWait
        });
      }

      return {
        success: true,
        queueEntry: currentEntry.toJSON()
      };
    } catch (error) {
      console.error('Error completing current:', error);
      throw error;
    }
  }

  /**
   * Mark patient as no-show
   */
  async markNoShow(office, date, queueEntryId) {
    try {
      const entry = await db.QueueEntry.findByPk(queueEntryId);

      if (!entry) {
        throw new Error('Queue entry not found');
      }

      await entry.update({
        status: 'no-show'
      });

      // Update queue stats
      const queue = await db.Queue.findByPk(entry.queue_id);
      if (queue) {
        await queue.increment('noshow_count');
      }

      return {
        success: true,
        queueEntry: entry.toJSON()
      };
    } catch (error) {
      console.error('Error marking no-show:', error);
      throw error;
    }
  }
}

module.exports = new QueueService();