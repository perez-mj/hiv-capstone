// backend/routes/queueRoutes.js
const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validatePagination } = require('../middleware/validate');

// Public routes (no authentication required)
router.get('/display', queueController.getQueueDisplay);

// Authenticated routes
router.use(protect);

// Patient self-service
router.get('/patient/me', authorize('PATIENT'), queueController.getMyQueueStatus);
router.get('/patient/:patientId', queueController.getPatientQueue);

// Queue management (Admin/Nurse only)
router.get('/current', authorize('ADMIN', 'NURSE'), queueController.getCurrentQueue);
router.get('/', authorize('ADMIN', 'NURSE'), queueController.getAllQueue);
router.get('/history', authorize('ADMIN', 'NURSE'), validatePagination, queueController.getQueueHistory);
router.get('/stats/overview', authorize('ADMIN', 'NURSE'), queueController.getQueueStatistics);
router.get('/stats/daily', authorize('ADMIN', 'NURSE'), queueController.getDailyStats);
router.get('/stats/peak-hours', authorize('ADMIN', 'NURSE'), queueController.getPeakHours);
router.get('/current/summary', queueController.getQueueSummary);
router.get('/check-appointment/:appointmentId', queueController.checkAppointmentInQueue);

// Queue actions (Admin/Nurse only)
router.post('/confirm/:appointmentId', authorize('ADMIN', 'NURSE'), queueController.confirmAndAddToQueue);
router.post('/walkin', authorize('ADMIN', 'NURSE'), queueController.addWalkIn);
router.post('/call/:id', authorize('ADMIN', 'NURSE'), queueController.callPatient);
router.post('/start-serving/:id', authorize('ADMIN', 'NURSE'), queueController.startServing);
router.post('/complete/:id', authorize('ADMIN', 'NURSE'), queueController.completeService);
router.post('/skip/:id', authorize('ADMIN', 'NURSE'), queueController.skipPatient);
router.post('/reorder', authorize('ADMIN', 'NURSE'), queueController.updatePriority);

// Queue reset (Admin only)
router.delete('/reset', authorize('ADMIN'), queueController.resetQueue);

module.exports = router;