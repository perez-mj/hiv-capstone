// backend/services/kioskService.js
const db = require('../models');
const queueService = require('./queueService');
const patientCodeService = require('./patientCodeService');
const { hmac } = require('../utils/crypto');
const { Op } = require('sequelize');

const DEFAULT_TESTING_TRANSACTION_TYPE_ID = 1;

// Placeholders used when a walk-in patient is created from the kiosk with
// only a phone number. Staff replace these during consultation.
const WALKIN_PLACEHOLDERS = Object.freeze({
  first_name: 'Walk-in',
  last_name: 'Patient',
  middle_name: '',
  gender: 'other',
  birth_date: '1900-01-01',
  sitio_street: 'To be updated by staff',
  status: 'active',
  purpose: 'testing',
});

class KioskService {
  async _findPatientByPhone(phone) {
    const normalized = String(phone).trim();
    return db.Patient.findOne({
      where: { contact_number_hash: hmac(normalized) },
    });
  }

  async joinQueueWithAppointment(phone) {
    const normalizedPhone = String(phone).trim();
    const today = new Date().toISOString().split('T')[0];

    const patient = await this._findPatientByPhone(normalizedPhone);
    if (!patient) {
      throw new Error('Patient not found. Please register first.');
    }

    const appointment = await db.Appointment.findOne({
      where: {
        patient_id: patient.id,
        appointment_date: today,
        status: 'pending',
      },
      order: [['time_slot', 'ASC']],
    });

    if (!appointment) {
      throw new Error('No pending appointment found for today.');
    }

    const existingQueue = await db.QueueEntry.findOne({
      where: {
        patient_id: patient.id,
        status: { [Op.in]: ['waiting', 'in-progress'] },
      },
      include: [
        {
          model: db.Queue,
          as: 'Queue',
          where: { office: appointment.office, date: today },
        },
      ],
    });

    if (existingQueue) {
      throw new Error('Patient is already in queue.');
    }

    return db.sequelize.transaction(async (transaction) => {
      // Resolve transaction type: prefer the appointment's, else office default.
      let transactionTypeId = appointment.transaction_type_id;

      if (transactionTypeId) {
        const tt = await db.TransactionType.findByPk(transactionTypeId, {
          transaction,
        });
        if (!tt) transactionTypeId = null;
      }

      if (!transactionTypeId) {
        const defaultType = await queueService.getOrCreateDefaultTransactionType(
          appointment.office,
          transaction
        );
        transactionTypeId = defaultType.id;
        await appointment.update(
          { transaction_type_id: transactionTypeId },
          { transaction }
        );
      }

      const result = await queueService.addToQueue(
        appointment.office,
        today,
        patient.id,
        appointment.id,
        transactionTypeId,
        transaction
      );

      // addToQueue returns { success: false } for duplicates instead of throwing.
      if (!result.success) {
        throw new Error(result.message || 'Failed to add patient to queue.');
      }

      const queueEntry = result.queueEntry;
      const waitingCount = await queueService.getWaitingCount(
        appointment.office,
        today,
        transaction
      );

      await appointment.update(
        {
          queue_number: queueEntry.queue_number,
          status: 'queued',
          queued_at: new Date(),
        },
        { transaction }
      );

      return {
        success: true,
        patient: {
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          facility_code: patient.patient_facility_code,
        },
        appointment: {
          id: appointment.id,
          office: appointment.office,
          date: appointment.appointment_date,
          time: appointment.time_slot,
        },
        ticket: {
          queue_number: queueEntry.queue_number,
          office: appointment.office,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          patient_facility_code: patient.patient_facility_code,
          waiting_position: waitingCount,
          check_in_time: new Date().toLocaleTimeString(),
        },
      };
    });
  }

  /**
   * Walk-in registration from the kiosk.
   *
   * The kiosk only collects a phone number. If the patient already exists,
   * we reuse the record. Otherwise we create a patient with placeholder
   * values that staff replace during consultation.
   *
   * @param {object} patientData - Must contain `contact_number`.
   *   Optional: `transaction_type_id`. Legacy fields are ignored.
   * @param {string} office - Fallback office if no transaction type is given.
   */
  async registerWalkIn(patientData, office = 'testing') {
    const contactNumber = String(patientData?.contact_number || '').trim();
    if (!contactNumber) {
      throw new Error('contact_number is required.');
    }
    if (contactNumber.length < 10) {
      throw new Error('contact_number must be at least 10 digits.');
    }

    // Resolve transaction type + office up-front. Prefer the caller's
    // transaction_type_id; otherwise default to the office default
    // (which for 'testing' resolves to id 1).
    const { transactionTypeId, resolvedOffice } =
      await this._resolveTransactionType(
        patientData.transaction_type_id,
        office
      );

    const existingPatient = await this._findPatientByPhone(contactNumber);

    if (existingPatient) {
      if (!existingPatient.patient_facility_code) {
        const facilityCode = await this._safeGenerateCode(existingPatient);
        await existingPatient.update({ patient_facility_code: facilityCode });
      }

      return db.sequelize.transaction((transaction) =>
        this._createWalkInQueueEntry(
          existingPatient,
          transactionTypeId,
          resolvedOffice,
          transaction
        )
      );
    }

    // New patient — create with placeholders, then enqueue.
    return db.sequelize.transaction(async (transaction) => {
      const facilityCode = await this._safeGenerateCode({
        first_name: WALKIN_PLACEHOLDERS.first_name,
        middle_name: WALKIN_PLACEHOLDERS.middle_name,
        last_name: WALKIN_PLACEHOLDERS.last_name,
      });

      const patient = await db.Patient.create(
        {
          first_name: WALKIN_PLACEHOLDERS.first_name,
          last_name: WALKIN_PLACEHOLDERS.last_name,
          middle_name: WALKIN_PLACEHOLDERS.middle_name,
          gender: WALKIN_PLACEHOLDERS.gender,
          birth_date: WALKIN_PLACEHOLDERS.birth_date,
          contact_number: contactNumber,
          sitio_street: WALKIN_PLACEHOLDERS.sitio_street,
          status: WALKIN_PLACEHOLDERS.status,
          purpose: WALKIN_PLACEHOLDERS.purpose,
          patient_facility_code: facilityCode,
          enrollment_date: new Date().toISOString().split('T')[0],
        },
        { transaction }
      );

      return this._createWalkInQueueEntry(
        patient,
        transactionTypeId,
        resolvedOffice,
        transaction
      );
    });
  }

  /**
   * Resolve a transaction type id and its office.
   * If `transactionTypeId` is provided, look it up and derive the office.
   * Otherwise fall back to the office's default transaction type.
   */
  async _resolveTransactionType(transactionTypeId, fallbackOffice) {
    if (transactionTypeId) {
      const tt = await db.TransactionType.findByPk(transactionTypeId);
      if (!tt) {
        throw new Error(`Transaction type ${transactionTypeId} not found`);
      }
      return { transactionTypeId: tt.id, resolvedOffice: tt.office };
    }

    const tt = await queueService.getOrCreateDefaultTransactionType(
      fallbackOffice
    );
    return { transactionTypeId: tt.id, resolvedOffice: tt.office };
  }

  async _safeGenerateCode(patientData) {
    try {
      return await patientCodeService.generateFacilityCode({
        first_name: patientData.first_name,
        middle_name: patientData.middle_name || '',
        last_name: patientData.last_name,
        status: 'testing',
        enrollment_date: new Date().toISOString().split('T')[0],
        treatment_transition_date: null,
      });
    } catch (error) {
      console.error('Error generating facility code:', error);
      const timestamp = Date.now().toString().slice(-6);
      const rand = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      const initials =
        `${patientData.first_name.charAt(0)}${patientData.last_name.charAt(0)}`.toUpperCase();
      return `P${new Date().getFullYear().toString().slice(-2)}-${initials}${timestamp}${rand}`;
    }
  }

  async _createWalkInQueueEntry(
    patient,
    transactionTypeId,
    office,
    transaction
  ) {
    const today = new Date().toISOString().split('T')[0];

    const result = await queueService.addToQueue(
      office,
      today,
      patient.id,
      null,
      transactionTypeId,
      transaction
    );

    // addToQueue returns { success: false } for duplicates.
    if (!result.success) {
      throw new Error(result.message || 'Failed to add patient to queue.');
    }

    const queueEntry = result.queueEntry;
    const waitingCount = await queueService.getWaitingCount(
      office,
      today,
      transaction
    );

    return {
      success: true,
      patient: {
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        facility_code: patient.patient_facility_code,
      },
      ticket: {
        queue_number: queueEntry.queue_number,
        office,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_facility_code: patient.patient_facility_code,
        waiting_position: waitingCount,
        check_in_time: new Date().toLocaleTimeString(),
        is_walk_in: true,
      },
    };
  }

  async getDisplayState(office) {
    const today = new Date().toISOString().split('T')[0];
    const queueState = await queueService.getQueueState(office, today);

    const waitingList = queueState.waiting_list.map((entry) => ({
      queue_number: entry.queue_number,
      position: entry.position,
    }));

    return {
      office,
      current_serving: queueState.current_serving
        ? { queue_number: queueState.current_serving.queue_number }
        : null,
      waiting_count: queueState.waiting_count,
      waiting_list: waitingList,
      stats: queueState.stats,
      last_updated: new Date().toISOString(),
    };
  }

  async patientExists(phone) {
    const patient = await this._findPatientByPhone(phone);
    if (!patient) return { exists: false, patient: null };

    return {
      exists: true,
      patient: {
        id: patient.id,
        patient_facility_code: patient.patient_facility_code,
        first_name: patient.first_name,
        last_name: patient.last_name,
      },
    };
  }
}

module.exports = new KioskService();