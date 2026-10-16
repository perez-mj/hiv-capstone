// backend/routes/transactionTypeRoutes.js
const express = require('express');
const router = express.Router();
const transactionTypeController = require('../controllers/transactionTypeController');
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

// Public read
router.get('/', transactionTypeController.getAllTransactionTypes);
router.get('/:id', transactionTypeController.getTransactionTypeById);

// Staff/Admin write
router.post('/', auth, roleCheck('staff', 'admin'), transactionTypeController.createTransactionType);
router.put('/:id', auth, roleCheck('staff', 'admin'), transactionTypeController.updateTransactionType);

// ← NEW: dedicated checklist endpoint (staff/admin)
router.put(
  '/:id/checklist',
  auth,
  roleCheck('staff', 'admin'),
  transactionTypeController.updateTransactionTypeChecklist
);

router.patch('/:id/toggle-active', auth, roleCheck('staff', 'admin'), transactionTypeController.toggleTransactionTypeActive);
router.delete('/:id', auth, roleCheck('admin'), transactionTypeController.deleteTransactionType);

module.exports = router;