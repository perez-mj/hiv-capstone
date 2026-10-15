// backend/routes/appointmentAvailability.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/appointmentAvailabilityController');

router.get('/available-slots/:date', auth, controller.getAvailableSlots);
router.get('/date-availability', auth, controller.getDateAvailability);
router.get('/next-available', auth, controller.getNextAvailable);
router.get('/settings', auth, controller.getSettings);

module.exports = router;