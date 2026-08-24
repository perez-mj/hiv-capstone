// backend/services/queueService.js
const db = require('../models');
const { Op } = require('sequelize');

class QueueService {
  /**
   * Get or create a queue for a specific office and date
   */
  async getOrCreateQueue(office, date, transaction = null) {
    let queue = await db.Queue.findOne({
      where: {
        office,
        date
      },
      transaction
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
      }, { transaction });
    }

    return queue;
  }

  /**
   * Get or create a default transaction type for an office
   */
  async getOrCreateDefaultTransactionType(office, transaction = null) {
    let transactionType = await db.TransactionType.findOne({
      where: {
        office: office,
        is_active: true,
        name: { [Op.like]: '%walk-in%' }
      },
      transaction
    });

    if (!transactionType) {
      // Try to get any active transaction type for this office
      transactionType = await db.TransactionType.findOne({
        where: {
          office: office,
          is_active: true
        },
        transaction
      });
    }

    // If still none, create a default one
    if (!transactionType) {
      transactionType = await db.TransactionType.create({
        name: `Walk-in (${office})`,
        office: office,
        estimated_duration_minutes: office === 'testing' ? 15 : 30,
        is_active: true,
        description: `Default walk-in transaction type for ${office}`
      }, { transaction });
    }

    return transactionType;
  }

  /**
   * Add a patient to the queue with transaction support
   * @param {string} office - Office name (testing/treatment)
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {number} patientId - Patient ID
   * @param {number} appointmentId - Appointment ID (optional)
   * @param {number} transactionTypeId - Transaction type ID (optional, will auto-fetch if not provided)
   * @param {object} transaction - Sequelize transaction object
   */
  async addToQueue(office, date, patientId, appointmentId = null, transactionTypeId = null, transaction = null) {
    try {
      // Validate required parameters
      if (!office) throw new Error('Office is required');
      if (!date) throw new Error('Date is required');
      if (!patientId) throw new Error('Patient ID is required');

      // Get or create the queue for this date and office
      const queue = await this.getOrCreateQueue(office, date, transaction);

      // Check if patient is already in queue for this date and office
      const existing = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          patient_id: patientId,
          status: { [Op.in]: ['waiting', 'in-progress'] }
        },
        transaction
      });

      if (existing) {
        return {
          success: false,
          message: 'Patient already in queue',
          existing
        };
      }

      // Get transaction type info
      let finalTransactionTypeId = transactionTypeId;
      let estimatedDurationMinutes = 30; // Default

      // If transactionTypeId not provided, try to get from appointment
      if (!finalTransactionTypeId && appointmentId) {
        const appointment = await db.Appointment.findByPk(appointmentId, {
          include: [
            {
              model: db.TransactionType,
              as: 'TransactionType',
              attributes: ['id', 'estimated_duration_minutes']
            }
          ],
          transaction
        });

        if (appointment && appointment.TransactionType) {
          finalTransactionTypeId = appointment.TransactionType.id;
          estimatedDurationMinutes = appointment.TransactionType.estimated_duration_minutes || 30;
        }
      }

      // If still no transaction type, get or create default for the office
      if (!finalTransactionTypeId) {
        const defaultType = await this.getOrCreateDefaultTransactionType(office, transaction);
        finalTransactionTypeId = defaultType.id;
        estimatedDurationMinutes = defaultType.estimated_duration_minutes || 30;
      }

      // Verify the transaction type exists
      const transactionType = await db.TransactionType.findByPk(finalTransactionTypeId, { transaction });
      if (!transactionType) {
        throw new Error(`Transaction type ${finalTransactionTypeId} not found`);
      }

      // Update estimated duration from transaction type if available
      if (transactionType.estimated_duration_minutes) {
        estimatedDurationMinutes = transactionType.estimated_duration_minutes;
      }

      // Calculate next position
      const maxPosition = await db.QueueEntry.max('position', {
        where: { queue_id: queue.id },
        transaction
      });

      const position = (maxPosition || 0) + 1;

      // Generate queue number with prefix (e.g., "T-001", "X-015")
      const paddedNumber = String(position).padStart(3, '0');
      const prefix = office === 'testing' ? 'T' : 'X';
      const queueNumber = `${prefix}-${paddedNumber}`;

      // Create queue entry with all required fields
      const entry = await db.QueueEntry.create({
        queue_id: queue.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        transaction_type_id: finalTransactionTypeId,
        queue_number: queueNumber,
        position: position,
        status: 'waiting',
        estimated_duration_minutes: estimatedDurationMinutes
      }, { transaction });

      // Update queue current number
      await queue.update({
        current_number: position
      }, { transaction });

      // Get patient info for response
      const patient = await db.Patient.findByPk(patientId, {
        attributes: ['id', 'first_name', 'last_name', 'contact_number', 'patient_facility_code'],
        transaction
      });

      // Fetch the full queue entry with associations
      const fullEntry = await db.QueueEntry.findByPk(entry.id, {
        include: [
          {
            model: db.Patient,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name', 'contact_number', 'patient_facility_code']
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
        ],
        transaction
      });

      // If we're in a transaction, the fullEntry might not have all associations loaded
      // due to transaction isolation, so we build the response manually
      const response = {
        success: true,
        queueEntry: {
          id: entry.id,
          queue_number: entry.queue_number,
          position: entry.position,
          status: entry.status,
          estimated_duration_minutes: entry.estimated_duration_minutes,
          created_at: entry.created_at,
          Patient: patient ? {
            id: patient.id,
            first_name: patient.first_name,
            last_name: patient.last_name,
            contact_number: patient.contact_number,
            patient_facility_code: patient.patient_facility_code
          } : null,
          TransactionType: transactionType ? {
            id: transactionType.id,
            name: transactionType.name,
            estimated_duration_minutes: transactionType.estimated_duration_minutes,
            color_code: transactionType.color_code
          } : null,
          Queue: queue ? {
            id: queue.id,
            office: queue.office,
            date: queue.date,
            current_number: queue.current_number
          } : null
        }
      };

      return response;
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }

  /**
   * Get waiting count for a specific office and date
   */
  async getWaitingCount(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction
      });

      if (!queue) {
        return 0;
      }

      const count = await db.QueueEntry.count({
        where: {
          queue_id: queue.id,
          status: 'waiting'
        },
        transaction
      });

      return count;
    } catch (error) {
      console.error('Error getting waiting count:', error);
      return 0;
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
                attributes: ['id', 'patient_facility_code', 'contact_number']
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
  async callNext(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        },
        transaction
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
        ],
        transaction
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
      }, { transaction });

      // Update queue current number
      await queue.update({
        current_number: nextEntry.position
      }, { transaction });

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
  async skipCurrent(office, date, reason = 'Skipped by staff', transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        },
        transaction
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
        ],
        transaction
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
      }, { transaction });

      // Update queue stats
      await queue.increment('skipped_count', { by: 1, transaction });

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
  async resetQueue(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        },
        transaction
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
          },
          transaction
        }
      );

      // Reset queue counters
      await queue.update({
        current_number: 0,
        completed_count: queue.completed_count || 0 // Keep completed count
      }, { transaction });

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
  async completeCurrent(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: {
          office,
          date
        },
        transaction
      });

      if (!queue) {
        throw new Error('No queue found for this date');
      }

      const currentEntry = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'in-progress'
        },
        transaction
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
      }, { transaction });

      // Update queue stats
      await queue.increment('completed_count', { by: 1, transaction });

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
        }, { transaction });
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
  async markNoShow(office, date, queueEntryId, transaction = null) {
    try {
      const entry = await db.QueueEntry.findByPk(queueEntryId, { transaction });

      if (!entry) {
        throw new Error('Queue entry not found');
      }

      await entry.update({
        status: 'no-show'
      }, { transaction });

      // Update queue stats
      const queue = await db.Queue.findByPk(entry.queue_id, { transaction });
      if (queue) {
        await queue.increment('noshow_count', { by: 1, transaction });
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

  /**
   * Get estimated wait time for a patient
   */
  async getEstimatedWaitTime(queueId, position, transaction = null) {
    try {
      const entries = await db.QueueEntry.findAll({
        where: {
          queue_id: queueId,
          status: 'waiting',
          position: {
            [Op.lte]: position
          }
        },
        order: [['position', 'ASC']],
        transaction
      });

      let totalWaitTime = 0;
      for (const entry of entries) {
        totalWaitTime += entry.estimated_duration_minutes || 15;
      }

      return totalWaitTime;
    } catch (error) {
      console.error('Error getting estimated wait time:', error);
      return 0;
    }
  }
}

module.exports = new QueueService();