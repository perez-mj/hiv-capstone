// backend/routes/kiosk.js
const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');

// Public kiosk endpoints (no authentication needed)
router.post('/checkin', kioskController.checkIn);
router.post('/walkin', kioskController.walkIn);
router.get('/display/:office', kioskController.display);
router.get('/status', kioskController.status);

// Note: For production, consider adding rate limiting to these endpoints

module.exports = router;