const db = require('../models');
const queueService = require('./queueService');

class KioskService {

    async checkInPatient(phone) {

        // Normalize phone number
        phone = phone.trim();

        // Today's date
        const today = new Date().toISOString().split('T')[0];

        // Find patient
        const patient = await db.Patient.findOne({
            where: {
                contact_number: phone
            }
        });

        if (!patient) {
            throw new Error('Patient not found.');
        }

        // Find today's appointment
        const appointment = await db.Appointment.findOne({
            where: {
                patient_id: patient.id,
                appointment_date: today,
                status: 'pending'
            }
        });

        if (!appointment) {
            throw new Error('No appointment scheduled for today.');
        }

        return {
            patient,
            appointment
        };

    }

    async registerWalkIn(data) {

    }

    async getDisplayState(office) {

    }

}

module.exports = new KioskService();
