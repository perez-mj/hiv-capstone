// backend/controllers/kioskController.js
const kioskService = require('../services/kioskService');
const printerService = require('../services/printerService');

class KioskController {

  /**
   * Check in patient with existing appointment
   * POST /api/kiosk/checkin
   */
  async checkIn(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required.'
        });
      }

      // Validate phone format (basic)
      if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format.'
        });
      }

      const result = await kioskService.checkInPatient(phone);

      return res.json({
        success: true,
        data: result
      });

    } catch (err) {
      console.error('Kiosk check-in error:', err.message);
      
      let statusCode = 400;
      let message = err.message;

      if (err.message.includes('not found')) {
        statusCode = 404;
      } else if (err.message.includes('already checked in')) {
        statusCode = 409;
      }

      return res.status(statusCode).json({
        success: false,
        message: message
      });
    }
  }

  /**
   * Register walk-in patient
   * POST /api/kiosk/walkin
   */
  async walkIn(req, res) {
    try {
      const { 
        first_name, 
        last_name, 
        birth_date, 
        gender, 
        contact_number,
        address,
        guardian_name,
        guardian_contact,
        office 
      } = req.body;

      const requiredFields = ['first_name', 'last_name', 'birth_date', 'gender', 'contact_number'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      if (isNaN(Date.parse(birth_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid birth date format.'
        });
      }

      if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gender. Must be male, female, or other.'
        });
      }

      if (!/^[0-9+\-\s()]{7,20}$/.test(contact_number)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format.'
        });
      }

      const result = await kioskService.registerWalkIn({
        first_name,
        last_name,
        birth_date,
        gender,
        contact_number,
        address: address || null,
        guardian_name: guardian_name || null,
        guardian_contact: guardian_contact || null
      }, office || 'testing');

      return res.status(201).json({
        success: true,
        data: result
      });

    } catch (err) {
      console.error('Kiosk walk-in error:', err.message);
      
      if (err.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          message: err.message
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  /**
   * Get display state for public screen
   * GET /api/kiosk/display/:office
   */
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

      return res.json({
        success: true,
        data: displayState
      });

    } catch (err) {
      console.error('Kiosk display error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve display state.'
      });
    }
  }

  /**
   * Get kiosk status
   * GET /api/kiosk/status
   */
  async status(req, res) {
    try {
      const status = await kioskService.getStatus();
      return res.json(status);
    } catch (err) {
      return res.status(500).json({
        status: 'error',
        message: err.message
      });
    }
  }

  /**
   * Check if patient exists by phone number
   * GET /api/kiosk/patient-exists/:phone
   */
  async patientExists(req, res) {
    try {
      const { phone } = req.params;
      
      // Delegate to service layer
      const result = await kioskService.patientExists(phone);
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error checking patient existence:', error);
      res.status(500).json({ 
        exists: false, 
        patient: null,
        error: error.message 
      });
    }
  }
}

module.exports = new KioskController();