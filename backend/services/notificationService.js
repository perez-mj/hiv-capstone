// backend/services/notificationService.js
const db = require('../models');
const { Op } = require('sequelize');

class NotificationService {
  async sendAppointmentReminder(appointmentId) {
    const appointment = await db.Appointment.findByPk(appointmentId, {
      include: [{
        model: db.Patient,
        attributes: ['id', 'first_name', 'last_name', 'contact_number']
      }]
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // In a real system, this would send SMS/Email
    // For now, create notification record
    const message = `Reminder: Your ${appointment.office} appointment is scheduled for ${appointment.appointment_date} at ${appointment.time_slot}`;
    
    await db.Notification.create({
      user_id: appointment.Patient.user_id,
      type: 'appointment_reminder',
      title: 'Appointment Reminder',
      message,
      read: false,
      related_entity: 'Appointment',
      related_entity_id: appointment.id
    });

    console.log(`Reminder sent for appointment ${appointmentId}`);
    return { success: true };
  }

  async sendTestResultNotification(patientId, encounterId) {
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const message = `Your HIV test results are now available. Please visit the clinic for counseling.`;
    
    await db.Notification.create({
      user_id: patient.user_id,
      type: 'test_result',
      title: 'Test Results Available',
      message,
      read: false,
      related_entity: 'TestingEncounter',
      related_entity_id: encounterId
    });

    return { success: true };
  }

  async sendTreatmentReminder(patientId, nextAppointmentDate) {
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const message = `Your next ART treatment appointment is scheduled for ${nextAppointmentDate}. Please don't forget to bring your treatment card.`;
    
    await db.Notification.create({
      user_id: patient.user_id,
      type: 'treatment_reminder',
      title: 'Treatment Follow-up Reminder',
      message,
      read: false,
      related_entity: 'Patient',
      related_entity_id: patientId
    });

    return { success: true };
  }

  // Run daily at specific time
  async sendDailyReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointments = await db.Appointment.findAll({
      where: {
        appointment_date: tomorrowStr,
        status: 'pending'
      },
      include: [{
        model: db.Patient,
        attributes: ['id', 'user_id']
      }]
    });

    for (const appointment of appointments) {
      await this.sendAppointmentReminder(appointment.id);
    }

    return { sent: appointments.length };
  }
}

module.exports = new NotificationService();