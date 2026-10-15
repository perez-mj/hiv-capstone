// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const patientController = require('../controllers/patientController');

// ==================== PATIENT SELF-SERVICE ROUTES ====================

router.get('/me', auth, patientController.getMyProfile);

// ==================== ADMIN/STAFF ROUTES ====================

router.get('/', auth, roleCheck('staff', 'admin'), patientController.list);
router.get('/search/:query', auth, roleCheck('staff', 'admin'), patientController.search);

router.get('/stats', auth, roleCheck('staff', 'admin'), patientController.getStats);
router.get('/export', auth, roleCheck('staff', 'admin'), patientController.export);

router.get('/validate-code/:code', auth, roleCheck('staff', 'admin'), patientController.validateCode);
router.post('/bulk-generate-codes', auth, roleCheck('admin'), patientController.bulkGenerateCodes);

router.post('/', auth, roleCheck('staff', 'admin'), patientController.create);
router.get('/:id', auth, patientController.getOne);
router.put('/:id', auth, patientController.update);
router.delete('/:id', auth, roleCheck('admin'), patientController.delete);

router.get('/:id/history', auth, patientController.getHistory);

router.post('/:id/regenerate-code', auth, roleCheck('admin'), patientController.regenerateCode);

module.exports = router;