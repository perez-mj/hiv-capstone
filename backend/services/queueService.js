// backend/services/queueService.js
const db = require('../models');
const { Op } = require('sequelize');
const socketService = require('./socketService');

class QueueService {
  
  /**
   * Get or create queue for a specific office and date
   * Uses transaction with row lock to prevent race conditions
   */
  async getOrCreateQueue(office, date, transaction = null) {
    // Use SELECT ... FOR UPDATE to lock the row
    let queue = await db.Queue.findOne({
      where: { office, date },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    if (!queue) {
      queue = await db.Queue.create({
        office,
        date,
        current_number: 0,
        completed_count: 0,
        skipped_count: 0,
        noshow_count: 0
      }, { transaction });
    }

    return queue;
  }

  /**
   * Get next position in queue for a specific queue
   */
  async getNextPosition(queueId, transaction = null) {
    const lastEntry = await db.QueueEntry.findOne({
      where: { queue_id: queueId },
      order: [['position', 'DESC']],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    return lastEntry ? lastEntry.position + 1 : 1;
  }

  /**
   * Generate next queue number with office prefix
   * Increments the queue's current_number counter
   */
  async getNextQueueNumber(queue, transaction = null) {
    // Increment the counter
    queue.current_number += 1;
    await queue.save({ transaction });

    const prefix = queue.office === 'testing' ? 'T' : 'R';
    return `${prefix}-${String(queue.current_number).padStart(3, '0')}`;
  }

  /**
   * Add patient to queue - TRANSACTION SAFE
   * Prevents duplicate queue entries and ensures atomic operations
   */
  async addToQueue(office, date, patientId, appointmentId = null, transaction = null) {
    // Use provided transaction or create new one
    const useTransaction = transaction || await db.sequelize.transaction();
    
    try {
      // If we created the transaction, we need to manage it
      const shouldCommit = !transaction;
      
      // Get or create queue with lock
      const queue = await this.getOrCreateQueue(office, date, useTransaction);
      
      // Check if patient already in queue (waiting or in-progress)
      const existing = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          patient_id: patientId,
          status: {
            [Op.in]: ['waiting', 'in-progress']
          }
        },
        transaction: useTransaction,
        lock: useTransaction.LOCK.UPDATE
      });

      if (existing) {
        throw new Error('Patient is already in the queue.');
      }

      // Generate queue number and position
      const queueNumber = await this.getNextQueueNumber(queue, useTransaction);
      const position = await this.getNextPosition(queue.id, useTransaction);

      // Create queue entry
      const entry = await db.QueueEntry.create({
        queue_id: queue.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        queue_number: queueNumber,
        position,
        status: 'waiting'
      }, { transaction: useTransaction });

      // If appointment provided, update its status
      if (appointmentId) {
        await db.Appointment.update(
          { status: 'checked-in' },
          { 
            where: { id: appointmentId },
            transaction: useTransaction
          }
        );
      }

      // Commit if we created the transaction
      if (shouldCommit) {
        await useTransaction.commit();
      }

      // Emit socket event (outside transaction)
      socketService.emitQueueUpdated(office, {
        queue_number: queueNumber,
        patient_id: patientId,
        waiting_count: await this.getWaitingCount(office, date)
      });

      return entry;
      
    } catch (error) {
      // Rollback if we created the transaction
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /**
   * Get current queue state with optimized queries
   * FIXED: Eliminated N+1 query problem
   */
  async getQueueState(office, date) {
    // Get queue with all entries and associated patients in one query
    const queue = await db.Queue.findOne({
      where: { office, date },
      include: [
        {
          model: db.QueueEntry,
          as: 'QueueEntries',
          where: { 
            status: { [Op.in]: ['waiting', 'in-progress'] } 
          },
          required: false,
          order: [['position', 'ASC']],
          include: [
            {
              model: db.Patient,
              as: 'Patient',
              attributes: ['id', 'first_name', 'last_name']
            }
          ]
        }
      ]
    });

    if (!queue) {
      // Return empty state if no queue exists
      return {
        current_serving: null,
        waiting_count: 0,
        waiting_list: [],
        stats: {
          completed: 0,
          skipped: 0,
          noshow: 0
        }
      };
    }

    // Process queue entries
    const entries = queue.QueueEntries || [];
    
    // Find current serving (in-progress)
    const servingEntry = entries.find(e => e.status === 'in-progress');
    let currentServing = null;
    if (servingEntry && servingEntry.Patient) {
      currentServing = {
        id: servingEntry.id,
        queue_number: servingEntry.queue_number,
        patient_name: `${servingEntry.Patient.first_name} ${servingEntry.Patient.last_name}`,
        patient_id: servingEntry.patient_id
      };
    }

    // Build waiting list
    const waitingList = entries
      .filter(entry => entry.status === 'waiting' && entry.Patient)
      .map(entry => ({
        id: entry.id,
        queue_number: entry.queue_number,
        position: entry.position,
        patient_name: `${entry.Patient.first_name} ${entry.Patient.last_name}`,
        patient_id: entry.patient_id,
        appointment_type: entry.appointment_id ? 'scheduled' : 'walk-in',
        created_at: entry.created_at
      }));

    return {
      current_serving: currentServing,
      waiting_count: waitingList.length,
      waiting_list: waitingList,
      stats: {
        completed: queue.completed_count || 0,
        skipped: queue.skipped_count || 0,
        noshow: queue.noshow_count || 0
      }
    };
  }

  /**
   * Call next patient - TRANSACTION SAFE
   */
  async callNext(office, date) {
    return await db.sequelize.transaction(async (transaction) => {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!queue) {
        throw new Error('Queue not found for today');
      }

      // Find and complete current serving
      const currentServing = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'in-progress'
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (currentServing) {
        currentServing.status = 'completed';
        currentServing.completed_at = new Date();
        await currentServing.save({ transaction });
        queue.completed_count += 1;
        await queue.save({ transaction });
      }

      // Find next waiting patient
      const nextEntry = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'waiting'
        },
        order: [['position', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!nextEntry) {
        return { 
          success: false, 
          message: 'No patients waiting',
          queue_number: null 
        };
      }

      // Update to in-progress
      nextEntry.status = 'in-progress';
      nextEntry.called_at = new Date();
      await nextEntry.save({ transaction });

      // Get patient details
      const patient = await db.Patient.findByPk(nextEntry.patient_id, {
        transaction
      });

      const result = {
        success: true,
        queue_number: nextEntry.queue_number,
        patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        patient_id: nextEntry.patient_id
      };

      // Emit socket event
      socketService.emitNextCalled(office, {
        office,
        queue_number: nextEntry.queue_number,
        patient_id: nextEntry.patient_id
      });

      // Also emit queue updated to refresh the display
      socketService.emitQueueUpdated(office, {
        queue_number: nextEntry.queue_number,
        waiting_count: await this.getWaitingCount(office, date)
      });

      return result;
    });
  }

  /**
   * Skip current patient - TRANSACTION SAFE
   */
  async skipCurrent(office, date, reason = 'Skipped by staff') {
    return await db.sequelize.transaction(async (transaction) => {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!queue) {
        throw new Error('Queue not found for today');
      }

      const currentServing = await db.QueueEntry.findOne({
        where: {
          queue_id: queue.id,
          status: 'in-progress'
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!currentServing) {
        throw new Error('No patient currently being served');
      }

      currentServing.status = 'skipped';
      currentServing.skip_reason = reason;
      await currentServing.save({ transaction });

      queue.skipped_count += 1;
      await queue.save({ transaction });

      // Emit socket event
      socketService.emitQueueUpdated(office, {
        skipped: currentServing.queue_number,
        waiting_count: await this.getWaitingCount(office, date)
      });

      return { 
        success: true, 
        message: 'Patient skipped successfully',
        queue_number: currentServing.queue_number
      };
    });
  }

  /**
   * Reset queue - TRANSACTION SAFE
   */
  async resetQueue(office, date) {
    return await db.sequelize.transaction(async (transaction) => {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!queue) {
        throw new Error('Queue not found for today');
      }

      // Mark all waiting and in-progress as no-show
      const [updatedCount] = await db.QueueEntry.update(
        { 
          status: 'no-show',
          completed_at: new Date()
        },
        {
          where: {
            queue_id: queue.id,
            status: { [Op.in]: ['waiting', 'in-progress'] }
          },
          transaction
        }
      );

      // Update noshow count
      queue.noshow_count += updatedCount;
      queue.current_number = 0;
      await queue.save({ transaction });

      // Emit socket event
      socketService.emitQueueReset(office, {
        office,
        date,
        reset_count: updatedCount
      });

      return { 
        success: true, 
        message: 'Queue reset successfully',
        reset_count: updatedCount
      };
    });
  }

  /**
   * Get waiting count - optimized query
   */
  async getWaitingCount(office, date) {
    const queue = await db.Queue.findOne({
      where: { office, date }
    });

    if (!queue) {
      return 0;
    }

    return await db.QueueEntry.count({
      where: {
        queue_id: queue.id,
        status: 'waiting'
      }
    });
  }

  /**
   * Remove patient from queue (for manual intervention)
   */
  async removeFromQueue(queueEntryId, reason = 'Removed by staff') {
    return await db.sequelize.transaction(async (transaction) => {
      const entry = await db.QueueEntry.findByPk(queueEntryId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!entry) {
        throw new Error('Queue entry not found');
      }

      // Only remove if in waiting status
      if (entry.status !== 'waiting') {
        throw new Error('Can only remove waiting patients from queue');
      }

      entry.status = 'cancelled';
      entry.skip_reason = reason;
      await entry.save({ transaction });

      // Update queue stats
      const queue = await db.Queue.findByPk(entry.queue_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (queue) {
        // Decrement count for this office date
        // We track this in a separate field or just let it be
        await queue.save({ transaction });
      }

      return { success: true, message: 'Patient removed from queue' };
    });
  }

  /**
   * Get next patient in queue without changing status
   * Useful for preview/display
   */
  async getNextPatient(office, date) {
    const queue = await db.Queue.findOne({
      where: { office, date }
    });

    if (!queue) {
      return null;
    }

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

    if (!nextEntry || !nextEntry.Patient) {
      return null;
    }

    return {
      queue_number: nextEntry.queue_number,
      patient_name: `${nextEntry.Patient.first_name} ${nextEntry.Patient.last_name}`,
      patient_id: nextEntry.patient_id,
      position: nextEntry.position
    };
  }
}

module.exports = new QueueService();