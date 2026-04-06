// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { validateUserCreate, validateUserUpdate } = require('../validations/userValidation');

// All user routes require authentication and admin role
router.use(protect);
router.use(authorize('ADMIN'));

// User management routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', validate(validateUserCreate), userController.createUser);
router.put('/:id', validate(validateUserUpdate), userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;