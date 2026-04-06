// backend/routes/kioskRoutes.js
const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Public routes (no authentication required)
router.get('/status/:deviceId', kioskController.checkStatus);
router.get('/queue-data', kioskController.getQueueData);
router.get('/queue-stats', kioskController.getQueueStats);

// Admin routes (authentication + authorization required)
router.use('/admin', protect);
router.use('/admin', authorize('ADMIN'));

router.get('/admin/devices', kioskController.getAllDevices);
router.get('/admin/devices/:deviceId', kioskController.getDeviceDetails);
router.post('/admin/devices/:deviceId/authorize', kioskController.authorizeDevice);
router.post('/admin/devices/:deviceId/deauthorize', kioskController.deauthorizeDevice);
router.put('/admin/devices/:deviceId', kioskController.updateDevice);
router.delete('/admin/devices/:deviceId', kioskController.deleteDevice);
router.delete('/admin/devices/cleanup/inactive', kioskController.cleanupInactive);
router.get('/admin/activity', kioskController.getActivityLog);

module.exports = router;