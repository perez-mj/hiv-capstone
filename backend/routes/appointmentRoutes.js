// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const appointmentTypeController = require('../controllers/appointmentTypeController');
const patientAppointmentController = require('../controllers/patientAppointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { validateAppointmentCreate, validateAppointmentUpdate, validateAppointmentTypeCreate, validateAppointmentTypeUpdate } = require('../validations/appointmentValidation');

// ==================== APPOINTMENT TYPES ROUTES ====================
router.get('/types', protect, appointmentTypeController.getAllTypes);
router.post('/types', protect, authorize('ADMIN'), validate(validateAppointmentTypeCreate), appointmentTypeController.createType);
router.put('/types/:id', protect, authorize('ADMIN'), validate(validateAppointmentTypeUpdate), appointmentTypeController.updateType);
router.delete('/types/:id', protect, authorize('ADMIN'), appointmentTypeController.deleteType);

// ==================== AVAILABILITY ROUTE ====================
router.get('/check-availability', protect, appointmentController.checkAvailability);

// ==================== PATIENT SPECIFIC ROUTES ====================
router.get('/patient/me/history', protect, authorize('PATIENT'), patientAppointmentController.getMyHistory);
router.get('/patient/me/upcoming', protect, authorize('PATIENT'), patientAppointmentController.getMyUpcoming);
router.get('/patient/me/next', protect, authorize('PATIENT'), patientAppointmentController.getMyNext);
router.post('/patient/me/book', protect, authorize('PATIENT'), validate(validateAppointmentCreate), patientAppointmentController.bookAppointment);
router.delete('/patient/me/cancel/:id', protect, authorize('PATIENT'), patientAppointmentController.cancelMyAppointment);

// ==================== REGULAR APPOINTMENTS ROUTES ====================
router.get('/', protect, appointmentController.getAllAppointments);
router.get('/today', protect, authorize('ADMIN', 'NURSE'), appointmentController.getTodayAppointments);
router.get('/stats/overview', protect, authorize('ADMIN', 'NURSE'), appointmentController.getStatistics);
router.get('/patient/:patientId', protect, authorize('ADMIN', 'NURSE'), appointmentController.getAppointmentsByPatient);
router.get('/:id', protect, appointmentController.getAppointmentById);
router.post('/', protect, authorize('ADMIN', 'NURSE'), validate(validateAppointmentCreate), appointmentController.createAppointment);
router.put('/:id', protect, authorize('ADMIN', 'NURSE'), validate(validateAppointmentUpdate), appointmentController.updateAppointment);
router.patch('/:id/status', protect, authorize('ADMIN', 'NURSE'), appointmentController.updateAppointmentStatus);
router.delete('/:id', protect, authorize('ADMIN'), appointmentController.deleteAppointment);

module.exports = router;