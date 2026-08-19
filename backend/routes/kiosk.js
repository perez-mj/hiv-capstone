// backend/routes/kiosk.js
const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');

// Public kiosk endpoints
router.post('/checkin', kioskController.checkIn);
router.post('/walkin', kioskController.walkIn);
router.get('/display/:office', kioskController.display);
router.get('/status', kioskController.status);

// Patient check endpoint
router.get('/patient-exists/:phone', kioskController.patientExists);

// Printer endpoints
router.post('/print', kioskController.print);
router.get('/printer-status', kioskController.printerStatus);
router.post('/printer-test', kioskController.printerTest);

module.exports = router;