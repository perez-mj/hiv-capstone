// backend/routes/patientSelfRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const patientAppointmentController = require('../controllers/patientAppointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { validatePatientUpdate } = require('../validations/patientValidation');
const { validatePatientSelfAppointment } = require('../validations/appointmentValidation');

// PROFILE ROUTES 
router.get('/profile', protect, authorize('PATIENT'), patientController.getMyProfile);
router.put('/profile', protect, authorize('PATIENT'), validate(validatePatientUpdate), patientController.updateMyProfile);
router.get('/statistics', protect, authorize('PATIENT'), patientController.getStatistics); 

// APPOINTMENTS 
router.get('/appointments', protect, authorize('PATIENT'), patientAppointmentController.getMyHistory);
router.get('/appointments/upcoming', protect, authorize('PATIENT'), patientAppointmentController.getMyUpcoming);
router.get('/appointments/next', protect, authorize('PATIENT'), patientAppointmentController.getMyNext);
router.post('/appointments/book', protect, authorize('PATIENT'), validate(validatePatientSelfAppointment), patientAppointmentController.bookAppointment);
router.put('/appointments/:id/cancel', protect, authorize('PATIENT'), patientAppointmentController.cancelMyAppointment);

// LAB RESULTS
router.get('/lab-results', protect, authorize('PATIENT'), patientAppointmentController.getMyLabResults);

// ENCOUNTERS
router.get('/encounters', protect, authorize('PATIENT'), patientAppointmentController.getMyEncounters);

// QUEUE STATUS
router.get('/queue', protect, authorize('PATIENT'), patientAppointmentController.getMyQueueStatus);

module.exports = router;