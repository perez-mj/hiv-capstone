// backend/routes/encounterRoutes.js
const express = require('express');
const router = express.Router();
const encounterController = require('../controllers/encounterController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination, validateDateRange } = require('../middleware/validate');
const { validateEncounterCreate, validateEncounterUpdate } = require('../validations/encounterValidation');

// All encounter routes require authentication
router.use(protect);

// Routes accessible by ADMIN and NURSE
router.get('/', authorize('ADMIN', 'NURSE'), validatePagination, validateDateRange, encounterController.getAllEncounters);
router.get('/today', authorize('ADMIN', 'NURSE'), encounterController.getTodayEncounters);
router.get('/types', authorize('ADMIN', 'NURSE'), encounterController.getEncounterTypes);
router.get('/stats', authorize('ADMIN', 'NURSE'), encounterController.getStatistics);
router.get('/:id', authorize('ADMIN', 'NURSE'), encounterController.getEncounterById);
router.post('/', authorize('ADMIN', 'NURSE'), validate(validateEncounterCreate), encounterController.createEncounter);
router.put('/:id', authorize('ADMIN', 'NURSE'), validate(validateEncounterUpdate), encounterController.updateEncounter);

// Patient-specific routes (accessible by PATIENT for their own records)
router.get('/patient/:patientId', encounterController.getEncountersByPatient);

// Admin-only routes
router.delete('/:id', authorize('ADMIN'), encounterController.deleteEncounter);

module.exports = router;