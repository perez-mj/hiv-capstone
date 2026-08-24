// backend/services/kioskService.js
const db = require('../models');
const queueService = require('./queueService');
const patientCodeService = require('./patientCodeService');
const { Op } = require('sequelize');

class KioskService {

  /**
   * Check in patient with appointment
   * Complete workflow: Find patient -> Find appointment -> Create queue entry
   */
  async checkInPatient(phone) {
    // Normalize phone number
    phone = phone.trim();

    // Today's date
    const today = new Date().toISOString().split('T')[0];

    // Find patient
    const patient = await db.Patient.findOne({
      where: { contact_number: phone }
    });

    if (!patient) {
      throw new Error('Patient not found. Please register first.');
    }

    // Find today's pending appointment
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

    // Check if patient already checked in
    const existingQueue = await db.QueueEntry.findOne({
      where: {
        patient_id: patient.id,
        status: {
          [Op.in]: ['waiting', 'in-progress']
        }
      },
      include: [
        {
          model: db.Queue,
          as: 'Queue',
          where: {
            office: appointment.office,
            date: today
          }
        }
      ]
    });

    if (existingQueue) {
      throw new Error('Patient is already checked in.');
    }

    // Use transaction for all operations
    return await db.sequelize.transaction(async (transaction) => {
      // Ensure appointment has transaction_type_id
      let transactionTypeId = appointment.transaction_type_id;
      
      if (!transactionTypeId) {
        // Find or create a default transaction type for this office
        let transactionType = await db.TransactionType.findOne({
          where: { 
            office: appointment.office,
            is_active: true
          },
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
        
        // Update appointment with transaction_type_id
        await appointment.update({
          transaction_type_id: transactionTypeId
        }, { transaction });
      }

      // Add to queue using transaction-safe queue service
      const result = await queueService.addToQueue(
      appointment.office,
      today,
      patient.id,
      appointment.id,
      transactionTypeId,
      transaction
    );
    const queueEntry = result.queueEntry; 

        // Get waiting position for display
    const waitingCount = await queueService.getWaitingCount(
      appointment.office,
      today
    );

      // Update appointment with queue number
      await appointment.update({
        queue_number: queueEntry.queue_number,
        status: 'checked-in'
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
 * Register walk-in patient (creates queue entry directly - NO appointment)
 */
async registerWalkIn(patientData, office = 'testing') {
  // Validate required fields
  const requiredFields = ['first_name', 'last_name', 'gender', 'contact_number'];
  for (const field of requiredFields) {
    if (!patientData[field]) {
      throw new Error(`${field} is required.`);
    }
  }

  // Check if patient already exists by contact number
  const existingPatient = await db.Patient.findOne({
    where: { contact_number: patientData.contact_number }
  });

  let patient;

  // If patient exists, use existing patient
  if (existingPatient) {
    patient = existingPatient;
  } else {
    // Create new patient
    return await db.sequelize.transaction(async (transaction) => {
      // Generate facility code
      let facilityCode;
      try {
        facilityCode = await patientCodeService.generateFacilityCode({
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
        const initials = `${patientData.first_name.charAt(0)}${patientData.last_name.charAt(0)}`.toUpperCase();
        facilityCode = `P${new Date().getFullYear().toString().slice(-2)}-${initials}${timestamp}`;
      }

      // Create patient with a temporary birth_date
      const tempBirthDate = '2000-01-01';
      
      patient = await db.Patient.create({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        gender: patientData.gender,
        contact_number: patientData.contact_number,
        address: patientData.address || null,
        guardian_name: patientData.guardian_name || null,
        guardian_contact: patientData.guardian_contact || null,
        status: 'testing',
        patient_facility_code: facilityCode,
        enrollment_date: new Date().toISOString().split('T')[0],
        birth_date: tempBirthDate
      }, { transaction });

      return await this._createWalkInQueueEntry(patient, patientData, office, transaction);
    });
  }

  // For existing patients, use a transaction
  return await db.sequelize.transaction(async (transaction) => {
    return await this._createWalkInQueueEntry(patient, patientData, office, transaction);
  });
}

/**
 * Helper method to create walk-in queue entry directly (NO appointment)
 * @private
 */
async _createWalkInQueueEntry(patient, patientData, office, transaction) {
  // Determine transaction type
  let transactionTypeId = patientData.transaction_type_id;

  // If no transaction type provided, get the default for the office
  if (!transactionTypeId) {
    const transactionType = await this.getOrCreateDefaultTransactionType(office, transaction);
    transactionTypeId = transactionType.id;
  } else {
    // Verify the transaction type exists
    const transactionType = await db.TransactionType.findByPk(transactionTypeId, { transaction });
    if (!transactionType) {
      throw new Error(`Transaction type ${transactionTypeId} not found`);
    }
    // If the transaction type is for a different office, use the default
    if (transactionType.office !== office) {
      console.warn(`Transaction type ${transactionTypeId} is for ${transactionType.office}, but office is ${office}. Using default.`);
      const defaultType = await this.getOrCreateDefaultTransactionType(office, transaction);
      transactionTypeId = defaultType.id;
    }
  }

  // Today's date
  const today = new Date().toISOString().split('T')[0];

  // Add directly to queue (NO appointment)
  const result = await queueService.addToQueue(
    office,
    today,
    patient.id,
    null, // ← No appointment ID for walk-ins
    transactionTypeId,
    transaction
  );
  const queueEntry = result.queueEntry;

  // Get waiting position
  const waitingCount = await queueService.getWaitingCount(office, today);

  return {
    success: true,
    patient: {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      facility_code: patient.patient_facility_code
    },
    // No appointment data for walk-ins
    ticket: {
      queue_number: queueEntry.queue_number,
      office: office,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      waiting_position: waitingCount,
      check_in_time: new Date().toLocaleTimeString(),
      is_walk_in: true
    }
  };
}
/**
 * Get or create a default transaction type for an office
 */
async getOrCreateDefaultTransactionType(office, transaction = null) {
  let transactionType = await db.TransactionType.findOne({
    where: {
      office: office,
      is_active: true,
      name: { [Op.like]: `%${office === 'testing' ? 'Testing' : 'Treatment'}%` }
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
      name: office === 'testing' ? 'Testing' : 'Treatment',
      office: office,
      estimated_duration_minutes: office === 'testing' ? 15 : 30,
      is_active: true,
      description: `Default ${office} transaction type`
    }, { transaction });
  }

  return transactionType;
}

  /**
   * Get display state for kiosk/public screen
   * Returns queue information without patient names (privacy)
   */
  async getDisplayState(office) {
    const today = new Date().toISOString().split('T')[0];
    
    const queueState = await queueService.getQueueState(office, today);

    // Remove patient names for public display
    const waitingList = queueState.waiting_list.map(entry => ({
      queue_number: entry.queue_number,
      position: entry.position
    }));

    return {
      office: office,
      current_serving: queueState.current_serving ? {
        queue_number: queueState.current_serving.queue_number
      } : null,
      waiting_count: queueState.waiting_count,
      waiting_list: waitingList,
      stats: queueState.stats,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Check if patient exists by phone number
   * @param {string} phone - Patient's contact number
   * @returns {Promise<Object>} Patient existence check result
   */
  async patientExists(phone) {
    // Normalize phone number
    const normalizedPhone = phone.trim();
    
    const patient = await db.Patient.findOne({
      where: { contact_number: normalizedPhone },
      attributes: ['id', 'first_name', 'middle_name', 'last_name', 'gender', 'patient_facility_code', 'status']
    });
    
    if (patient) {
      return {
        exists: true,
        patient: patient.toJSON()
      };
    }
    
    return {
      exists: false,
      patient: null
    };
  }
}

module.exports = new KioskService();