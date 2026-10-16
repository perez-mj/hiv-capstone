// backend/controllers/kioskController.js
const kioskService = require('../services/kioskService');

// Matches phone numbers with optional +, digits, spaces, dashes, parens.
// The service normalizes to digits before hashing, but we validate the
// raw input here to give the kiosk a clear 400 on garbage input.
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const VALID_OFFICES = ['testing', 'treatment'];

/**
 * Normalize a phone number to digits only (plus a leading + if present).
 * The Patient model hashes the trimmed string, so we must feed it the
 * same normalized form the kiosk uses (numeric keypad → digits only).
 */
function normalizePhone(raw) {
  const str = String(raw ?? '').trim();
  const hasPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

class KioskController {
  async joinQueue(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res
          .status(400)
          .json({ success: false, message: 'Phone number is required.' });
      }
      if (!PHONE_REGEX.test(String(phone).trim())) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid phone number format.' });
      }

      const result = await kioskService.joinQueueWithAppointment(
        normalizePhone(phone)
      );
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('Kiosk queue-join error:', err.message);

      let statusCode = 400;
      let message = err.message;

      // Order matters: check more specific messages first.
      if (err.message.includes('Patient not found')) {
        statusCode = 404;
      } else if (err.message.includes('No pending appointment')) {
        statusCode = 404;
      } else if (err.message.includes('already in queue')) {
        statusCode = 409;
      } else if (err.message.includes('Transaction type')) {
        statusCode = 500;
        message = 'System configuration error. Please contact administrator.';
      }

      return res.status(statusCode).json({ success: false, message });
    }
  }

  /**
   * Walk-in registration from the kiosk.
   *
   * The kiosk only collects a phone number. `transaction_type_id` is
   * optional and defaults to the Testing transaction type (id 1) on the
   * service side. Legacy fields (first_name, last_name, gender, etc.) are
   * accepted for backward compatibility but ignored — the service always
   * uses placeholders for new walk-in records.
   */
  async walkIn(req, res) {
    try {
      const { contact_number, transaction_type_id, office } = req.body;

      if (!contact_number) {
        return res.status(400).json({
          success: false,
          message: 'contact_number is required.',
        });
      }

      const rawPhone = String(contact_number).trim();
      if (!PHONE_REGEX.test(rawPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format.',
        });
      }

      // Only validate transaction_type_id if the caller actually sent one.
      let transactionTypeId = null;
      if (transaction_type_id !== undefined && transaction_type_id !== null) {
        transactionTypeId = Number(transaction_type_id);
        if (!Number.isInteger(transactionTypeId) || transactionTypeId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'transaction_type_id must be a positive integer.',
          });
        }
      }

      if (office && !VALID_OFFICES.includes(office)) {
        return res.status(400).json({
          success: false,
          message: `Invalid office. Must be one of: ${VALID_OFFICES.join(', ')}.`,
        });
      }

      const result = await kioskService.registerWalkIn(
        {
          contact_number: normalizePhone(rawPhone),
          transaction_type_id: transactionTypeId,
        },
        office || 'testing'
      );

      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error('Kiosk walk-in error:', err.message);

      let statusCode = 400;
      let message = err.message;

      if (err.message.includes('already registered')) {
        statusCode = 409;
      } else if (err.message.includes('Transaction type')) {
        statusCode = 500;
        message = 'System configuration error. Please contact administrator.';
      }

      return res.status(statusCode).json({ success: false, message });
    }
  }

  async display(req, res) {
    try {
      const { office } = req.params;
      if (!VALID_OFFICES.includes(office)) {
        return res.status(400).json({
          success: false,
          message: `Invalid office. Must be one of: ${VALID_OFFICES.join(', ')}.`,
        });
      }
      const displayState = await kioskService.getDisplayState(office);
      return res.json({ success: true, data: displayState });
    } catch (err) {
      console.error('Kiosk display error:', err.message);
      return res
        .status(500)
        .json({ success: false, message: 'Failed to retrieve display state.' });
    }
  }

  async patientExists(req, res) {
    try {
      const rawPhone = req.params.phone;
      if (!rawPhone) {
        return res
          .status(400)
          .json({ exists: false, patient: null, error: 'Phone number is required' });
      }
      if (!PHONE_REGEX.test(String(rawPhone).trim())) {
        return res
          .status(400)
          .json({ exists: false, patient: null, error: 'Invalid phone number format' });
      }

      const result = await kioskService.patientExists(normalizePhone(rawPhone));
      return res.json(result);
    } catch (error) {
      console.error('Error checking patient existence:', error);
      return res
        .status(500)
        .json({ exists: false, patient: null, error: error.message });
    }
  }
}

module.exports = new KioskController();