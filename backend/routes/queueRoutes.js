// backend/routes/queueRoutes.js
const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validatePagination } = require('../middleware/validate');

// ==================== PUBLIC ROUTES (No authentication required) ====================
router.get('/display', queueController.getQueueDisplay);
router.get('/public-stream', queueController.getQueueDisplayByStream); // NEW: Stream display for kiosk/TV
router.get('/waiting-time', queueController.getWaitingTimeEstimation); // Public wait time estimates

// ==================== PROTECTED ROUTES ====================
router.use(protect);

// Patient self-service routes (PATIENT role only)
router.get('/patient/me', authorize('PATIENT'), queueController.getMyQueueStatus);
router.get('/patient/:patientId', authorize('PATIENT', 'ADMIN', 'NURSE'), queueController.getPatientQueue);

// Stream-based queue endpoints (NEW - for dual stream system)
router.get('/current/stream', authorize('ADMIN', 'NURSE'), queueController.getCurrentQueueByStream);
router.get('/stream-stats', authorize('ADMIN', 'NURSE'), queueController.getStreamStats);
router.post('/call-stream/:stream', authorize('ADMIN', 'NURSE'), queueController.callPatientByStream);

// Queue management endpoints (Admin/Nurse only)
router.get('/current', authorize('ADMIN', 'NURSE'), queueController.getCurrentQueue);
router.get('/', authorize('ADMIN', 'NURSE'), queueController.getAllQueue);
router.get('/history', authorize('ADMIN', 'NURSE'), validatePagination, queueController.getQueueHistory);
router.get('/stats/overview', authorize('ADMIN', 'NURSE'), queueController.getQueueStatistics);
router.get('/stats/daily', authorize('ADMIN', 'NURSE'), queueController.getDailyStats);
router.get('/stats/peak-hours', authorize('ADMIN', 'NURSE'), queueController.getPeakHours);
router.get('/current/summary', authorize('ADMIN', 'NURSE'), queueController.getQueueSummary);
router.get('/check-appointment/:appointmentId', authorize('ADMIN', 'NURSE'), queueController.checkAppointmentInQueue);
router.post('/batch-update', authorize('ADMIN', 'NURSE'), queueController.batchUpdateStatus);

// Legacy service type endpoints (kept for backward compatibility)
router.get('/by-service-type', authorize('ADMIN', 'NURSE'), queueController.getCurrentQueueByServiceType);
router.post('/call-by-type/:serviceTypeId', authorize('ADMIN', 'NURSE'), queueController.callPatientByType);
router.get('/waiting-time-by-type', authorize('ADMIN', 'NURSE'), queueController.getWaitingTimeByType);

// Queue action endpoints (Admin/Nurse only)
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