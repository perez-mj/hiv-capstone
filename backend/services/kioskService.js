// backend/services/kioskService.js
const db = require('../models');
const queueService = require('./queueService');
const patientCodeService = require('./patientCodeService');
const { hmac } = require('../utils/crypto');
const { Op } = require('sequelize');

class KioskService {

  /**
   * Find patient by phone using the HMAC hash (encrypted column can't be queried).
   */
  async _findPatientByPhone(phone) {
    const phoneHash = hmac(phone.trim());
    return db.Patient.findOne({ where: { contact_number_hash: phoneHash } });
  }

  /**
   * Check in patient with appointment
   */
  async joinQueueWithAppointment(phone) {
    phone = phone.trim();
    const today = new Date().toISOString().split('T')[0];

    const patient = await this._findPatientByPhone(phone);
    if (!patient) {
      throw new Error('Patient not found. Please register first.');
    }

    const appointment = await db.Appointment.findOne({
      where: {
        patient_id: patient.id,
        appointment_date: today,
        status: 'pending'
      },
      order: [['time_slot', 'ASC']]
    });

    if (!appointment) {
      throw new Error('No pending appointment found for today.');
    }

    const existingQueue = await db.QueueEntry.findOne({
      where: {
        patient_id: patient.id,
        status: { [Op.in]: ['waiting', 'in-progress'] }
      },
      include: [{
        model: db.Queue,
        as: 'Queue',
        where: { office: appointment.office, date: today }
      }]
    });

    if (existingQueue) {
      throw new Error('Patient is already in queue.');
    }

    return await db.sequelize.transaction(async (transaction) => {
      let transactionTypeId = appointment.transaction_type_id;

      if (!transactionTypeId) {
        let transactionType = await db.TransactionType.findOne({
          where: { office: appointment.office, is_active: true },
          transaction
        });

        if (!transactionType) {
          transactionType = await db.TransactionType.create({
            name: 'General Check-in',
            office: appointment.office,
            estimated_duration_minutes: 15,
            is_active: true
          }, { transaction });
        }

        transactionTypeId = transactionType.id;
        await appointment.update({ transaction_type_id: transactionTypeId }, { transaction });
      }

      const result = await queueService.addToQueue(
        appointment.office,
        today,
        patient.id,
        appointment.id,
        transactionTypeId,
        transaction
      );
      const queueEntry = result.queueEntry;

      const waitingCount = await queueService.getWaitingCount(appointment.office, today);

      await appointment.update({
        queue_number: queueEntry.queue_number,
        status: 'queued'
      }, { transaction });

      return {
        success: true,
        patient: {
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          facility_code: patient.patient_facility_code
        },
        appointment: {
          id: appointment.id,
          office: appointment.office,
          date: appointment.appointment_date,
          time: appointment.time_slot
        },
        ticket: {
          queue_number: queueEntry.queue_number,
          office: appointment.office,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          patient_facility_code: patient.patient_facility_code,
          waiting_position: waitingCount,
          check_in_time: new Date().toLocaleTimeString()
        }
      };
    });
  }

  /**
   * Register walk-in patient
   */
  async registerWalkIn(patientData, office = 'testing') {
    const requiredFields = ['first_name', 'last_name', 'gender', 'contact_number'];
    for (const field of requiredFields) {
      if (!patientData[field]) throw new Error(`${field} is required.`);
    }

    const existingPatient = await this._findPatientByPhone(patientData.contact_number);

    if (existingPatient) {
      let patient = existingPatient;

      if (!patient.patient_facility_code) {
        const facilityCode = await this._safeGenerateCode(patientData);
        await patient.update({ patient_facility_code: facilityCode });
      }

      return await db.sequelize.transaction(async (transaction) => {
        return this._createWalkInQueueEntry(patient, patientData, office, transaction);
      });
    }

    return await db.sequelize.transaction(async (transaction) => {
      const facilityCode = await this._safeGenerateCode(patientData);

      const patient = await db.Patient.create({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        middle_name: patientData.middle_name || '',
        gender: patientData.gender,
        contact_number: patientData.contact_number,
        address: patientData.address || null,
        guardian_name: patientData.guardian_name || null,
        guardian_contact: patientData.guardian_contact || null,
        status: 'testing',
        patient_facility_code: facilityCode,
        enrollment_date: new Date().toISOString().split('T')[0],
        birth_date: '1900-01-01'
      }, { transaction });

      return this._createWalkInQueueEntry(patient, patientData, office, transaction);
    });
  }

  /**
   * Safe facility-code generator with collision-resistant fallback.
   */
  async _safeGenerateCode(patientData) {
    try {
      return await patientCodeService.generateFacilityCode({
        first_name: patientData.first_name,
        middle_name: patientData.middle_name || '',
        last_name: patientData.last_name,
        status: 'testing',
        enrollment_date: new Date().toISOString().split('T')[0],
        treatment_transition_date: null
      });
    } catch (error) {
      console.error('Error generating facility code:', error);
      const timestamp = Date.now().toString().slice(-6);
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const initials =
        `${patientData.first_name.charAt(0)}${patientData.last_name.charAt(0)}`.toUpperCase();
      return `P${new Date().getFullYear().toString().slice(-2)}-${initials}${timestamp}${rand}`;
    }
  }

  async _createWalkInQueueEntry(patient, patientData, office, transaction) {
    let transactionTypeId = patientData.transaction_type_id;

    if (!transactionTypeId) {
      const transactionType = await this.getOrCreateDefaultTransactionType(office, transaction);
      transactionTypeId = transactionType.id;
    } else {
      const transactionType = await db.TransactionType.findByPk(transactionTypeId, { transaction });
      if (!transactionType) throw new Error(`Transaction type ${transactionTypeId} not found`);
      if (transactionType.office !== office) {
        const defaultType = await this.getOrCreateDefaultTransactionType(office, transaction);
        transactionTypeId = defaultType.id;
      }
    }

    const today = new Date().toISOString().split('T')[0];

    const result = await queueService.addToQueue(
      office,
      today,
      patient.id,
      null,
      transactionTypeId,
      transaction
    );
    const queueEntry = result.queueEntry;
    const waitingCount = await queueService.getWaitingCount(office, today);

    return {
      success: true,
      patient: {
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        facility_code: patient.patient_facility_code
      },
      ticket: {
        queue_number: queueEntry.queue_number,
        office,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_facility_code: patient.patient_facility_code,
        waiting_position: waitingCount,
        check_in_time: new Date().toLocaleTimeString(),
        is_walk_in: true
      }
    };
  }

  async getOrCreateDefaultTransactionType(office, transaction = null) {
    let transactionType = await db.TransactionType.findOne({
      where: {
        office,
        is_active: true,
        name: { [Op.like]: `%${office === 'testing' ? 'Testing' : 'Treatment'}%` }
      },
      transaction
    });

    if (!transactionType) {
      transactionType = await db.TransactionType.findOne({
        where: { office, is_active: true },
        transaction
      });
    }

    if (!transactionType) {
      transactionType = await db.TransactionType.create({
        name: office === 'testing' ? 'Testing' : 'Treatment',
        office,
        estimated_duration_minutes: office === 'testing' ? 15 : 30,
        is_active: true,
        description: `Default ${office} transaction type`
      }, { transaction });
    }

    return transactionType;
  }

  /**
   * Get display state for kiosk/public screen.
   * PRIVACY: does NOT expose patient names, facility codes, or any PII.
   */
  async getDisplayState(office) {
    const today = new Date().toISOString().split('T')[0];
    const queueState = await queueService.getQueueState(office, today);

    const waitingList = queueState.waiting_list.map(entry => ({
      queue_number: entry.queue_number,
      position: entry.position
    }));

    return {
      office,
      current_serving: queueState.current_serving
        ? { queue_number: queueState.current_serving.queue_number } // ❌ no name
        : null,
      waiting_count: queueState.waiting_count,
      waiting_list: waitingList,
      stats: queueState.stats,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Patient existence check — uses hash lookup.
   */
  async patientExists(phone) {
    const patient = await this._findPatientByPhone(phone);
    if (patient) {
      return { exists: true, patient: patient.toJSON() };
    }
    return { exists: false, patient: null };
  }
}

module.exports = new KioskService();