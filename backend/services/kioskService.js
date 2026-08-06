// backend/services/kioskService.js
const db = require('../models');
const queueService = require('./queueService');
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

    // Add to queue using transaction-safe queue service
    const queueEntry = await queueService.addToQueue(
      appointment.office,
      today,
      patient.id,
      appointment.id
    );

    // Get waiting position for display
    const waitingCount = await queueService.getWaitingCount(
      appointment.office,
      today
    );

    // Update appointment with queue number
    await appointment.update({
      queue_number: queueEntry.queue_number,
      status: 'checked-in'
    });

    return {
      success: true,
      patient: {
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`
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
        waiting_position: waitingCount,
        check_in_time: new Date().toLocaleTimeString()
      }
    };
  }

  /**
   * Register walk-in patient (creates appointment and queue entry)
   */
  async registerWalkIn(patientData, office = 'testing') {
    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'birth_date', 'gender', 'contact_number'];
    for (const field of requiredFields) {
      if (!patientData[field]) {
        throw new Error(`${field} is required.`);
      }
    }

    // Check if patient already exists by contact number
    const existingPatient = await db.Patient.findOne({
      where: { contact_number: patientData.contact_number }
    });

    if (existingPatient) {
      throw new Error('Patient already registered. Please use check-in instead.');
    }

    // Use transaction for all operations
    return await db.sequelize.transaction(async (transaction) => {
      // Create patient
      const patient = await db.Patient.create({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        birth_date: patientData.birth_date,
        gender: patientData.gender,
        contact_number: patientData.contact_number,
        address: patientData.address || null,
        guardian_name: patientData.guardian_name || null,
        guardian_contact: patientData.guardian_contact || null,
        status: 'testing' // Default to testing
      }, { transaction });

      // Today's date
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeSlot = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      // Create walk-in appointment
      const appointment = await db.Appointment.create({
        patient_id: patient.id,
        office: office,
        appointment_date: today,
        time_slot: timeSlot,
        type: 'walk-in',
        status: 'pending'
      }, { transaction });

      // Add to queue
      const queueEntry = await queueService.addToQueue(
        office,
        today,
        patient.id,
        appointment.id,
        transaction // Pass transaction to queueService
      );

      // Update appointment with queue number
      appointment.queue_number = queueEntry.queue_number;
      appointment.status = 'checked-in';
      await appointment.save({ transaction });

      // Get waiting position
      const waitingCount = await queueService.getWaitingCount(office, today);

      return {
        success: true,
        patient: {
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`
        },
        appointment: {
          id: appointment.id,
          office: appointment.office,
          date: appointment.appointment_date,
          time: appointment.time_slot
        },
        ticket: {
          queue_number: queueEntry.queue_number,
          office: office,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          waiting_position: waitingCount,
          check_in_time: new Date().toLocaleTimeString(),
          is_walk_in: true
        }
      };
    });
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
        // No patient name for privacy
      } : null,
      waiting_count: queueState.waiting_count,
      waiting_list: waitingList,
      stats: queueState.stats,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Get kiosk status
   */
  async getStatus() {
    return {
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

module.exports = new KioskService();