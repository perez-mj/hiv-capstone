const kioskService = require('../services/kioskService');

class KioskController {

    async checkIn(req, res) {

        try {

            const { phone } = req.body;

            if (!phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required.'
                });
            }

            const result = await kioskService.checkInPatient(phone);

            return res.json({
                success: true,
                patient: {
                    id: result.patient.id,
                    name: `${result.patient.first_name} ${result.patient.last_name}`
                },
                appointment: {
                    id: result.appointment.id,
                    office: result.appointment.office,
                    date: result.appointment.appointment_date,
                    time: result.appointment.time_slot
                }
            });

        } catch (err) {

            return res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    async walkIn(req, res) {

    }

    async display(req, res) {

    }

}

module.exports = new KioskController();