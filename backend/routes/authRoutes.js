// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateLogin, 
  validateChangePassword, 
  validateForgotPassword, 
  validateResetPassword 
} = require('../validations/authValidation');

// Public routes
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// Protected routes (note: using authenticateToken, not protect)
router.get('/check', authenticateToken, authController.checkAuth);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, validateChangePassword, authController.changePassword);

module.exports = router;