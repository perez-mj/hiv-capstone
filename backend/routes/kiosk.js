// backend/routes/kiosk.js
const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');

// Public kiosk endpoints
router.post('/checkin', kioskController.checkIn);
router.post('/walkin', kioskController.walkIn);
router.get('/display/:office', kioskController.display);

// Patient check endpoint
router.get('/patient-exists/:phone', kioskController.patientExists);

module.exports = router;