// backend/routes/appointmentAvailability.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/appointmentAvailabilityController');

// GET /api/appointments/available-slots/:date
router.get('/available-slots/:date', auth, controller.getAvailableSlots);

// GET /api/appointments/date-availability
router.get('/date-availability', auth, controller.getDateAvailability);

// GET /api/appointments/next-available
router.get('/next-available', auth, controller.getNextAvailable);

// GET /api/appointments/settings
router.get('/settings', auth, controller.getSettings);

module.exports = router;