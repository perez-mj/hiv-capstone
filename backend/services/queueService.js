// backend/services/queueService.js
const db = require('../models');
const { Op } = require('sequelize');

const ACTIVE_STATUSES = ['waiting', 'in-progress'];
const DEFAULT_DURATIONS = { testing: 15, treatment: 30 };

class QueueService {
  async getOrCreateQueue(office, date, transaction = null) {
    const [queue] = await db.Queue.findOrCreate({
      where: { office, date },
      defaults: {
        office,
        date,
        current_number: 0,
        completed_count: 0,
        skipped_count: 0,
        noshow_count: 0,
        total_wait_time_minutes: 0,
        average_wait_time_minutes: 0,
      },
      transaction,
    });
    return queue;
  }

  /**
   * Resolve the default transaction type for an office.
   * Prefers a type whose name matches the office (Testing/Treatment),
   * falls back to any active type for that office, and finally creates one.
   *
   * NOTE: This is the SINGLE source of truth for default transaction types.
   * kioskService delegates here instead of maintaining its own copy.
   */
  async getOrCreateDefaultTransactionType(office, transaction = null) {
    const defaultName = office === 'testing' ? 'Testing' : 'Treatment';

    let transactionType = await db.TransactionType.findOne({
      where: {
        office,
        is_active: true,
        name: { [Op.like]: `%${defaultName}%` },
      },
      transaction,
    });

    if (!transactionType) {
      transactionType = await db.TransactionType.findOne({
        where: { office, is_active: true },
        transaction,
      });
    }

    if (!transactionType) {
      transactionType = await db.TransactionType.create(
        {
          name: defaultName,
          office,
          estimated_duration_minutes:
            DEFAULT_DURATIONS[office] || DEFAULT_DURATIONS.testing,
          is_active: true,
          description: `Default ${office} transaction type`,
        },
        { transaction }
      );
    }

    return transactionType;
  }

  async addToQueue(
    office,
    date,
    patientId,
    appointmentId = null,
    transactionTypeId = null,
    transaction = null
  ) {
    if (!office) throw new Error('Office is required');
    if (!date) throw new Error('Date is required');
    if (!patientId) throw new Error('Patient ID is required');

    const queue = await this.getOrCreateQueue(office, date, transaction);

    const existing = await db.QueueEntry.findOne({
      where: {
        queue_id: queue.id,
        patient_id: patientId,
        status: { [Op.in]: ACTIVE_STATUSES },
      },
      transaction,
    });

    if (existing) {
      return {
        success: false,
        message: 'Patient already in queue',
        existing,
      };
    }

    // ---------- Resolve transaction type + duration ----------
    let finalTransactionTypeId = transactionTypeId;

    if (!finalTransactionTypeId && appointmentId) {
      const appointment = await db.Appointment.findByPk(appointmentId, {
        include: [
          {
            model: db.TransactionType,
            as: 'TransactionType',
            attributes: ['id', 'estimated_duration_minutes'],
          },
        ],
        transaction,
      });
      if (appointment?.TransactionType) {
        finalTransactionTypeId = appointment.TransactionType.id;
      }
    }

    if (!finalTransactionTypeId) {
      const defaultType = await this.getOrCreateDefaultTransactionType(
        office,
        transaction
      );
      finalTransactionTypeId = defaultType.id;
    }

    const transactionType = await db.TransactionType.findByPk(
      finalTransactionTypeId,
      { transaction }
    );
    if (!transactionType) {
      throw new Error(`Transaction type ${finalTransactionTypeId} not found`);
    }

    const estimatedDurationMinutes =
      transactionType.estimated_duration_minutes ||
      DEFAULT_DURATIONS[office] ||
      DEFAULT_DURATIONS.testing;

    // ---------- Assign position ----------
    const maxPosition = await db.QueueEntry.max('position', {
      where: { queue_id: queue.id },
      transaction,
    });
    const position = (maxPosition || 0) + 1;

    const paddedNumber = String(position).padStart(2, '0');
    const prefix = office === 'testing' ? 'T' : 'X';
    const queueNumber = `${prefix}-${paddedNumber}`;

    const entry = await db.QueueEntry.create(
      {
        queue_id: queue.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        transaction_type_id: finalTransactionTypeId,
        queue_number: queueNumber,
        position,
        status: 'waiting',
        estimated_duration_minutes: estimatedDurationMinutes,
      },
      { transaction }
    );

    // Fetch the fully-hydrated entry once — no need for a separate patient query.
    const fullEntry = await db.QueueEntry.findByPk(entry.id, {
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'contact_number',
            'patient_facility_code',
          ],
        },
        {
          model: db.TransactionType,
          as: 'TransactionType',
          attributes: ['id', 'name', 'estimated_duration_minutes', 'color_code'],
        },
        {
          model: db.Queue,
          as: 'Queue',
          attributes: ['id', 'office', 'date', 'current_number'],
        },
      ],
      transaction,
    });

    return {
      success: true,
      queueEntry: fullEntry.toJSON(),
    };
  }

  async getWaitingCount(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
      });
      if (!queue) return 0;

      return db.QueueEntry.count({
        where: { queue_id: queue.id, status: 'waiting' },
        transaction,
      });
    } catch (error) {
      console.error('Error getting waiting count:', error);
      return 0;
    }
  }

  async getQueueState(office, date) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        include: [
          {
            model: db.QueueEntry,
            as: 'QueueEntries',
            where: { status: { [Op.in]: ACTIVE_STATUSES } },
            required: false,
            include: [
              {
                model: db.Patient,
                as: 'Patient',
                attributes: ['id', 'patient_facility_code', 'contact_number'],
              },
              {
                model: db.TransactionType,
                as: 'TransactionType',
                attributes: [
                  'id',
                  'name',
                  'estimated_duration_minutes',
                  'color_code',
                ],
              },
            ],
          },
        ],
        // Sequelize v6 requires the order at the top level for hasMany includes.
        order: [[{ model: db.QueueEntry, as: 'QueueEntries' }, 'position', 'ASC']],
      });

      if (!queue) {
        return {
          current_serving: null,
          waiting_list: [],
          waiting_count: 0,
          stats: { completed: 0, skipped: 0, noShow: 0 },
        };
      }

      const stats = {
        completed: queue.completed_count || 0,
        skipped: queue.skipped_count || 0,
        noShow: queue.noshow_count || 0,
      };

      const entries = queue.QueueEntries || [];
      const waitingList = entries.filter((e) => e.status === 'waiting');
      const currentServing = entries.find((e) => e.status === 'in-progress');

      return {
        current_serving: currentServing || null,
        waiting_list: waitingList,
        waiting_count: waitingList.length,
        stats,
      };
    } catch (error) {
      console.error('Error getting queue state:', error);
      throw error;
    }
  }

  // ---------- Private helper: compute wait stats ----------
  _computeWaitStats(queue, completedEntry, newCompletedCount) {
    let newTotalWait = queue.total_wait_time_minutes || 0;

    if (completedEntry?.called_at) {
      const waitTime = Math.floor(
        (new Date() - new Date(completedEntry.called_at)) / 60000
      );
      newTotalWait += waitTime;
    }

    let avgWait =
      newCompletedCount > 0
        ? Math.round(newTotalWait / newCompletedCount)
        : 0;
    if (!Number.isFinite(avgWait)) avgWait = 0;

    return {
      total_wait_time_minutes: newTotalWait,
      average_wait_time_minutes: avgWait,
    };
  }

  async callNext(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
      });
      if (!queue) throw new Error('No queue found for this date');

      const currentServing = await db.QueueEntry.findOne({
        where: { queue_id: queue.id, status: 'in-progress' },
        include: [{ model: db.Appointment, as: 'Appointment', attributes: ['id'] }],
        transaction,
      });

      if (currentServing) {
        await currentServing.update(
          { status: 'completed', completed_at: new Date() },
          { transaction }
        );

        const newCompletedCount = (queue.completed_count || 0) + 1;

        if (currentServing.Appointment) {
          await db.Appointment.update(
            { status: 'completed' },
            { where: { id: currentServing.Appointment.id }, transaction }
          );
        }

        await queue.update(
          {
            completed_count: newCompletedCount,
            ...this._computeWaitStats(queue, currentServing, newCompletedCount),
          },
          { transaction }
        );
      }

      const nextEntry = await db.QueueEntry.findOne({
        where: { queue_id: queue.id, status: 'waiting' },
        order: [['position', 'ASC']],
        include: [
          {
            model: db.Patient,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name'],
          },
          { model: db.Appointment, as: 'Appointment', attributes: ['id'] },
        ],
        transaction,
      });

      if (!nextEntry) {
        return { success: false, message: 'No patients waiting in queue' };
      }

      await nextEntry.update(
        { status: 'in-progress', called_at: new Date() },
        { transaction }
      );

      await queue.update(
        { current_number: nextEntry.position },
        { transaction }
      );

      if (nextEntry.Appointment) {
        await db.Appointment.update(
          { status: 'in-progress' },
          { where: { id: nextEntry.Appointment.id }, transaction }
        );
      }

      return { success: true, queueEntry: nextEntry.toJSON() };
    } catch (error) {
      console.error('Error calling next:', error);
      throw error;
    }
  }

  async skipCurrent(office, date, reason = 'Skipped by staff', transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
      });
      if (!queue) throw new Error('No queue found for this date');

      const currentEntry = await db.QueueEntry.findOne({
        where: { queue_id: queue.id, status: 'in-progress' },
        include: [{ model: db.Appointment, as: 'Appointment', attributes: ['id'] }],
        transaction,
      });

      if (!currentEntry) {
        return { success: false, message: 'No patient currently being served' };
      }

      await currentEntry.update(
        { status: 'skipped', skip_reason: reason },
        { transaction }
      );

      await queue.increment('skipped_count', { by: 1, transaction });

      if (currentEntry.Appointment) {
        await db.Appointment.update(
          { status: 'no-show' },
          { where: { id: currentEntry.Appointment.id }, transaction }
        );
      }

      return { success: true, queueEntry: currentEntry.toJSON() };
    } catch (error) {
      console.error('Error skipping current:', error);
      throw error;
    }
  }

  async resetQueue(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
      });
      if (!queue) {
        return { success: false, message: 'No queue found for this date' };
      }

      await db.QueueEntry.update(
        { status: 'completed', completed_at: new Date() },
        {
          where: { queue_id: queue.id, status: { [Op.in]: ACTIVE_STATUSES } },
          transaction,
        }
      );

      // Reset ALL counters, not just current_number.
      await queue.update(
        {
          current_number: 0,
          completed_count: 0,
          skipped_count: 0,
          noshow_count: 0,
          total_wait_time_minutes: 0,
          average_wait_time_minutes: 0,
        },
        { transaction }
      );

      return { success: true, message: 'Queue reset successfully' };
    } catch (error) {
      console.error('Error resetting queue:', error);
      throw error;
    }
  }

  async completeCurrent(office, date, transaction = null) {
    try {
      const queue = await db.Queue.findOne({
        where: { office, date },
        transaction,
      });
      if (!queue) throw new Error('No queue found for this date');

      const currentEntry = await db.QueueEntry.findOne({
        where: { queue_id: queue.id, status: 'in-progress' },
        transaction,
      });

      if (!currentEntry) {
        return { success: false, message: 'No patient currently being served' };
      }

      await currentEntry.update(
        { status: 'completed', completed_at: new Date() },
        { transaction }
      );

      const newCompletedCount = (queue.completed_count || 0) + 1;

      await queue.update(
        {
          completed_count: newCompletedCount,
          ...this._computeWaitStats(queue, currentEntry, newCompletedCount),
        },
        { transaction }
      );

      return { success: true, queueEntry: currentEntry.toJSON() };
    } catch (error) {
      console.error('Error completing current:', error);
      throw error;
    }
  }

  async markNoShow(office, date, queueEntryId, transaction = null) {
    try {
      const entry = await db.QueueEntry.findByPk(queueEntryId, { transaction });
      if (!entry) throw new Error('Queue entry not found');

      await entry.update({ status: 'no-show' }, { transaction });

      const queue = await db.Queue.findByPk(entry.queue_id, { transaction });
      if (queue) {
        await queue.increment('noshow_count', { by: 1, transaction });
      }

      return { success: true, queueEntry: entry.toJSON() };
    } catch (error) {
      console.error('Error marking no-show:', error);
      throw error;
    }
  }

  async getEstimatedWaitTime(queueId, position, transaction = null) {
    try {
      const entries = await db.QueueEntry.findAll({
        where: {
          queue_id: queueId,
          status: 'waiting',
          position: { [Op.lte]: position },
        },
        order: [['position', 'ASC']],
        transaction,
      });

      return entries.reduce(
        (sum, e) => sum + (e.estimated_duration_minutes || 15),
        0
      );
    } catch (error) {
      console.error('Error getting estimated wait time:', error);
      return 0;
    }
  }
}

module.exports = new QueueService();