// backend/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const patientAppointmentController = require('../controllers/patientAppointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination } = require('../middleware/validate');
const { validatePatientCreate, validatePatientUpdate } = require('../validations/patientValidation');

// ==================== PATIENT MANAGEMENT (ADMIN/NURSE) ====================
router.get('/', protect, authorize('ADMIN', 'NURSE'), validatePagination, patientController.getAllPatients);
router.get('/stats/overview', protect, authorize('ADMIN', 'NURSE'), patientController.getStatistics);
router.get('/search/query', protect, authorize('ADMIN', 'NURSE'), patientController.searchPatients);
router.get('/export/csv', protect, authorize('ADMIN', 'NURSE'), patientController.exportPatients);
router.post('/import', protect, authorize('ADMIN', 'NURSE'), patientController.importPatients);
router.post('/', protect, authorize('ADMIN', 'NURSE'), validate(validatePatientCreate), patientController.createPatient);
router.get('/:id', protect, authorize('ADMIN', 'NURSE'), patientController.getPatientById);
router.get('/:id/summary', protect, authorize('ADMIN', 'NURSE'), patientController.getPatientSummary);
router.put('/:id', protect, authorize('ADMIN', 'NURSE'), validate(validatePatientUpdate), patientController.updatePatient);
router.delete('/:id', protect, authorize('ADMIN'), patientController.deletePatient);

// ==================== PATIENT SUB-RESOURCES (ADMIN/NURSE VIEW) ====================
router.get('/:id/appointments', protect, authorize('ADMIN', 'NURSE'), validatePagination, patientAppointmentController.getPatientAppointments);
router.get('/:id/lab-results', protect, authorize('ADMIN', 'NURSE'), validatePagination, patientAppointmentController.getPatientLabResults);
router.get('/:id/encounters', protect, authorize('ADMIN', 'NURSE'), validatePagination, patientAppointmentController.getPatientEncounters);
router.get('/:id/queue-history', protect, authorize('ADMIN', 'NURSE'), validatePagination, patientAppointmentController.getPatientQueueHistory);

module.exports = router;