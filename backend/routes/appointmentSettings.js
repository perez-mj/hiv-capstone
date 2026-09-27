// backend/routes/appointmentSettings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const controller = require('../controllers/appointmentSettingController');

// All admin routes require authentication and admin role
router.use(auth);
router.use(roleCheck('admin'));

// Get all appointment settings
router.get('/', controller.getAllSettings);

// Apply settings to all offices (must be before /:id to avoid conflict)
router.post('/apply-to-all', controller.applyToAll);

// Get settings for a specific office (or global)
router.get('/office/:office', controller.getSettingsByOffice);

// Get a single appointment setting by ID
router.get('/:id', controller.getSettingById);

// Create a new appointment setting
router.post('/', controller.createSetting);

// Update an appointment setting
router.put('/:id', controller.updateSetting);

// Delete an appointment setting
router.delete('/:id', controller.deleteSetting);

// Toggle active status
router.patch('/:id/toggle', controller.toggleSetting);

module.exports = router;