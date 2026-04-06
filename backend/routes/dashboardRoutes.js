const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// ==================== PUBLIC ROUTES ====================
// Queue status for public display (kiosk mode) - no authentication required
router.get('/queue/public', dashboardController.getPublicQueue);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

// ==================== ADMIN DASHBOARD ====================
router.get('/admin', authorize('ADMIN'), dashboardController.getAdminDashboard);
router.get('/admin/trends', authorize('ADMIN'), dashboardController.getAppointmentTrends);
router.get('/admin/demographics', authorize('ADMIN'), dashboardController.getPatientDemographics);
router.get('/admin/queue-metrics', authorize('ADMIN'), dashboardController.getQueuePerformanceMetrics);

// ==================== NURSE DASHBOARD ====================
router.get('/nurse', authorize('NURSE'), dashboardController.getNurseDashboard);
router.get('/nurse/schedule', authorize('NURSE'), dashboardController.getNurseSchedule);

// ==================== PATIENT DASHBOARD ====================
router.get('/patient', authorize('PATIENT'), dashboardController.getPatientDashboard);

module.exports = router;