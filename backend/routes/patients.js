// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const patientController = require('../controllers/patientController');

// ==================== PUBLIC ROUTES ====================

// None - all patient routes require authentication

// ==================== PATIENT SELF-SERVICE ROUTES ====================

// Get own profile
router.get('/me', auth, patientController.getMyProfile);

// ==================== ADMIN/STAFF ROUTES ====================

// List and search
router.get('/', auth, roleCheck('staff', 'admin'), patientController.list);
router.get('/search/:query', auth, roleCheck('staff', 'admin'), patientController.search);

// Statistics and export
router.get('/stats', auth, roleCheck('staff', 'admin'), patientController.getStats);
router.get('/export', auth, roleCheck('staff', 'admin'), patientController.export);

// Code management
router.get('/validate-code/:code', auth, roleCheck('staff', 'admin'), patientController.validateCode);
router.post('/bulk-generate-codes', auth, roleCheck('admin'), patientController.bulkGenerateCodes);

// CRUD operations
router.post('/', auth, roleCheck('staff', 'admin'), patientController.create);
router.get('/:id', auth, patientController.getOne);
router.put('/:id', auth, patientController.update);
router.delete('/:id', auth, roleCheck('admin'), patientController.delete);

// Patient history
router.get('/:id/history', auth, patientController.getHistory);

// Regenerate code (admin only)
router.post('/:id/regenerate-code', auth, roleCheck('admin'), patientController.regenerateCode);

module.exports = router;