// backend/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validatePagination } = require('../middleware/validate');

// All staff routes require authentication and admin role
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', validatePagination, staffController.getAllStaff);
router.get('/stats', staffController.getStatistics);
router.get('/positions/list', staffController.getAllPositions);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.post('/with-user', staffController.createStaffWithUser);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;