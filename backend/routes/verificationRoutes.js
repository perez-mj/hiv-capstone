// backend/routes/verificationRoutes.js
const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorize('ADMIN'));

// Verification endpoints
router.get('/dashboard', verificationController.getVerificationDashboard);
router.get('/patients/all', verificationController.verifyAllPatients);
router.get('/patients/:id', verificationController.verifyPatient);
router.get('/patients/:id/history', verificationController.getVerificationHistory);
router.post('/patients/:id/snapshot', verificationController.storePatientSnapshot);
router.post('/patients/:id/restore', verificationController.restoreFromBlockchain);

module.exports = router;