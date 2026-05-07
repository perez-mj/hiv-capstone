// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// All report routes require authentication and admin/nurse role
router.use(protect);
router.use(authorize('ADMIN', 'NURSE'));

// Report generation endpoints
router.get('/appointments', reportController.getAppointmentReport);
router.get('/patients', reportController.getPatientReport);
router.get('/queue', reportController.getQueueReport);
router.get('/lab-results', reportController.getLabResultsReport);
router.get('/staff-performance', reportController.getStaffPerformanceReport);
router.get('/hiv-summary', reportController.getHIVSummaryReport);
router.get('/dashboard-summary', reportController.getDashboardSummaryReport);
router.get('/available-types', reportController.getAvailableReportTypes);

// Export endpoints
router.get('/export/:type/csv', reportController.exportToCSV);
router.get('/export/:type/pdf', reportController.exportToPDF);

module.exports = router;