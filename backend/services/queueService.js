// backend/services/queueService.js
const db = require('../models');
const { Op } = require('sequelize');
const socketService = require('./socketService');

class QueueService {
  async getOrCreateQueue(office, date, transaction = null) {

    let queue = await db.Queue.findOne({
        where: {
            office,
            date
        },
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
        }, {
            transaction
        });

    }

    return queue;

}

  async getNextPosition(queueId, transaction = null) {

    const lastEntry = await db.QueueEntry.findOne({
        where: {
            queue_id: queueId
        },
        order: [['position', 'DESC']],
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    return lastEntry ? lastEntry.position + 1 : 1;

}

  async getNextQueueNumber(queue, transaction = null) {

    queue.current_number += 1;

    await queue.save({
        transaction
    });

    const prefix = queue.office === 'testing'
        ? 'T'
        : 'R';

    return `${prefix}-${String(queue.current_number).padStart(3, '0')}`;

}

  async getQueueState(office, date) {
    // Get or create queue for today
    let queue = await db.Queue.findOne({
      where: { office, date },
      include: [{
        model: db.QueueEntry,
        as: 'QueueEntries',
        where: { status: { [Op.in]: ['waiting', 'in-progress'] } },
        required: false,
        order: [['position', 'ASC']]
      }]
    });

    if (!queue) {
      queue = await db.Queue.create({
        office,
        date,
        current_number: 0,
        completed_count: 0,
        skipped_count: 0,
        noshow_count: 0
      });
      queue.QueueEntries = [];
    }

    // Get waiting list with patient names
    const waitingList = await Promise.all(
      (queue.QueueEntries || [])
        .filter(entry => entry.status === 'waiting')
        .map(async (entry) => {
          const patient = await db.Patient.findByPk(entry.patient_id);
          return {
            id: entry.id,
            queue_number: entry.queue_number,
            position: entry.position,
            patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
            patient_id: entry.patient_id,
            appointment_type: entry.appointment_id ? 'scheduled' : 'walk-in',
            created_at: entry.created_at
          };
        })
    );

    // Get current serving
    let currentServing = null;
    const servingEntry = (queue.QueueEntries || []).find(e => e.status === 'in-progress');
    if (servingEntry) {
      const patient = await db.Patient.findByPk(servingEntry.patient_id);
      currentServing = {
        id: servingEntry.id,
        queue_number: servingEntry.queue_number,
        patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        patient_id: servingEntry.patient_id
      };
    }

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

  async addToQueue(
    office,
    date,
    patientId,
    appointmentId = null
) {

    return await db.sequelize.transaction(async (transaction) => {

        const queue = await this.getOrCreateQueue(
            office,
            date,
            transaction
        );

        const existing = await db.QueueEntry.findOne({

            where: {
                queue_id: queue.id,
                patient_id: patientId,
                status: {
                    [Op.in]: [
                        'waiting',
                        'in-progress'
                    ]
                }
            },

            transaction,
            lock: transaction.LOCK.UPDATE

        });

        if (existing) {
            throw new Error('Patient is already in queue.');
        }

        const queueNumber = await this.getNextQueueNumber(
            queue,
            transaction
        );

        const position = await this.getNextPosition(
            queue.id,
            transaction
        );

        const entry = await db.QueueEntry.create({

            queue_id: queue.id,

            patient_id: patientId,

            appointment_id: appointmentId,

            queue_number: queueNumber,

            position,

            status: 'waiting'

        }, {
            transaction
        });

        socketService.emitQueueUpdated(office, {
            queue_number: queueNumber
        });

        return entry;

    });

}

  async callNext(office, date) {
    const queue = await db.Queue.findOne({
      where: { office, date }
    });

    if (!queue) {
      throw new Error('Queue not found');
    }

    // Find current serving entry
    const currentServing = await db.QueueEntry.findOne({
      where: {
        queue_id: queue.id,
        status: 'in-progress'
      }
    });

    // Complete current serving if exists
    if (currentServing) {
      currentServing.status = 'completed';
      currentServing.completed_at = new Date();
      await currentServing.save();
      queue.completed_count += 1;
      await queue.save();
    }

    // Find next waiting entry
    const nextEntry = await db.QueueEntry.findOne({
      where: {
        queue_id: queue.id,
        status: 'waiting'
      },
      order: [['position', 'ASC']]
    });

    if (!nextEntry) {
      return { message: 'No patients waiting' };
    }

    nextEntry.status = 'in-progress';
    nextEntry.called_at = new Date();
    await nextEntry.save();

    const patient = await db.Patient.findByPk(nextEntry.patient_id);
    const result = {
      queue_number: nextEntry.queue_number,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
      patient_id: nextEntry.patient_id
    };

    // Emit socket event
    const socketService = require('./socketService');
    if (io) {
      socketService.emitNextCalled(office, {
        office,
        queue_number: nextEntry.queue_number,
        patient_id: nextEntry.patient_id
      });
    }

    return result;
  }

  async skipCurrent(office, date, reason = 'Skipped') {
    const queue = await db.Queue.findOne({
      where: { office, date }
    });

    if (!queue) {
      throw new Error('Queue not found');
    }

    const currentServing = await db.QueueEntry.findOne({
      where: {
        queue_id: queue.id,
        status: 'in-progress'
      }
    });

    if (!currentServing) {
      throw new Error('No patient currently being served');
    }

    currentServing.status = 'skipped';
    currentServing.skip_reason = reason;
    await currentServing.save();

    queue.skipped_count += 1;
    await queue.save();

    const socketService = require('./socketService');
    if (io) {
      socketService.emitQueueUpdated(office, {
        office,
        skipped: currentServing.queue_number
      });
    }

    return { message: 'Patient skipped successfully' };
  }

  async resetQueue(office, date) {
    const queue = await db.Queue.findOne({
      where: { office, date }
    });

    if (!queue) {
      throw new Error('Queue not found');
    }

    // Mark all waiting as no-show
    await db.QueueEntry.update(
      { status: 'no-show' },
      {
        where: {
          queue_id: queue.id,
          status: { [Op.in]: ['waiting', 'in-progress'] }
        }
      }
    );

    // Reset stats
    queue.current_number = 0;
    await queue.save();

    const socketService = require('./socketService');
    if (io) {
      socketService.emitQueueReset(office, {
        office,
        date
      });
    }

    return { message: 'Queue reset successfully' };
  }

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
}

module.exports = new QueueService();