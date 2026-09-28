// backend/controllers/kioskController.js
const kioskService = require('../services/kioskService');

class KioskController {
  async joinQueue(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
      }
      if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
      }

      const result = await kioskService.joinQueueWithAppointment(phone);
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('Kiosk queue-join error:', err.message);
      let statusCode = 400;
      let message = err.message;

      if (err.message.includes('not found')) statusCode = 404;
      else if (err.message.includes('already in queue')) statusCode = 409;
      else if (err.message.includes('transaction')) {
        statusCode = 500;
        message = 'System configuration error. Please contact administrator.';
      }

      return res.status(statusCode).json({ success: false, message });
    }
  }

  async walkIn(req, res) {
    try {
      const {
        first_name, last_name, gender, contact_number,
        address, guardian_name, guardian_contact,
        office, transaction_type_id, is_returning
      } = req.body;

      const requiredFields = ['first_name', 'last_name', 'gender', 'contact_number'];
      const missingFields = requiredFields.filter(f => !req.body[f]);
      if (missingFields.length) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      const normalizedGender = String(gender).toLowerCase();
      if (!['male', 'female', 'other'].includes(normalizedGender)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gender. Must be male, female, or other.'
        });
      }

      if (!/^[0-9+\-\s()]{7,20}$/.test(contact_number)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
      }

      const result = await kioskService.registerWalkIn({
        first_name,
        last_name,
        gender: normalizedGender,
        contact_number,
        address: address || null,
        guardian_name: guardian_name || null,
        guardian_contact: guardian_contact || null,
        transaction_type_id: transaction_type_id || null,
        is_returning: !!is_returning
      }, office || 'testing');

      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error('Kiosk walk-in error:', err.message);
      let statusCode = 400;
      let message = err.message;

      if (err.message.includes('already registered')) statusCode = 409;
      else if (err.message.includes('transaction')) {
        statusCode = 500;
        message = 'System configuration error. Please contact administrator.';
      }

      return res.status(statusCode).json({ success: false, message });
    }
  }

  async display(req, res) {
    try {
      const { office } = req.params;
      if (!['testing', 'treatment'].includes(office)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid office. Must be testing or treatment.'
        });
      }
      const displayState = await kioskService.getDisplayState(office);
      return res.json({ success: true, data: displayState });
    } catch (err) {
      console.error('Kiosk display error:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to retrieve display state.' });
    }
  }

  async patientExists(req, res) {
    try {
      const { phone } = req.params;
      if (!phone) {
        return res.status(400).json({ exists: false, patient: null, error: 'Phone number is required' });
      }
      const result = await kioskService.patientExists(phone);
      return res.json(result);
    } catch (error) {
      console.error('Error checking patient existence:', error);
      return res.status(500).json({ exists: false, patient: null, error: error.message });
    }
  }
}

module.exports = new KioskController();