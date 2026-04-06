// backend/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const patientAppointmentController = require('../controllers/patientAppointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination } = require('../middleware/validate');
const { validatePatientCreate, validatePatientUpdate } = require('../validations/patientValidation');

// Patient self-service routes
router.get('/me', protect, authorize('PATIENT'), patientController.getMyProfile);
router.put('/me', protect, authorize('PATIENT'), validate(validatePatientUpdate), patientController.updateMyProfile);

// Patient statistics
router.get('/stats/overview', protect, authorize('ADMIN', 'NURSE'), patientController.getStatistics);

// Search patients (for dropdown/autocomplete)
router.get('/search/query', protect, patientController.searchPatients);

// Export/Import routes
router.get('/export/csv', protect, authorize('ADMIN', 'NURSE'), patientController.exportPatients);
router.post('/import', protect, authorize('ADMIN', 'NURSE'), patientController.importPatients);

// Main patient CRUD routes
router.get('/', protect, authorize('ADMIN', 'NURSE'), validatePagination, patientController.getAllPatients);
router.post('/', protect, authorize('ADMIN', 'NURSE'), validate(validatePatientCreate), patientController.createPatient);
router.get('/:id', protect, patientController.getPatientById);
router.put('/:id', protect, authorize('ADMIN', 'NURSE'), validate(validatePatientUpdate), patientController.updatePatient);
router.delete('/:id', protect, authorize('ADMIN'), patientController.deletePatient);

// Patient summary
router.get('/:id/summary', protect, patientController.getPatientSummary);

// Patient sub-resources
router.get('/:id/appointments', protect, validatePagination, patientAppointmentController.getPatientAppointments);
router.get('/:id/lab-results', protect, validatePagination, patientAppointmentController.getPatientLabResults);
router.get('/:id/encounters', protect, validatePagination, patientAppointmentController.getPatientEncounters);
router.get('/:id/queue-history', protect, validatePagination, patientAppointmentController.getPatientQueueHistory);

module.exports = router;