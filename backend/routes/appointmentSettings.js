// backend/routes/appointmentSettings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const controller = require('../controllers/appointmentSettingController');

router.use(auth);
router.use(roleCheck('admin'));

router.get('/', controller.getAllSettings);
router.post('/apply-to-all', controller.applyToAll);
router.get('/office/:office', controller.getSettingsByOffice);
router.get('/:id', controller.getSettingById);
router.post('/', controller.createSetting);
router.put('/:id', controller.updateSetting);
router.delete('/:id', controller.deleteSetting);
router.patch('/:id/toggle', controller.toggleSetting);

module.exports = router;