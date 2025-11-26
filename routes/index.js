const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const patientRoutes = require('./patients');
const biometricRoutes = require('./biometric');
const dltRoutes = require('./dlt');
const auditRoutes = require('./audit');

// Mount routes
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/biometric', biometricRoutes);
router.use('/dlt', dltRoutes);
router.use('/audit', auditRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'HIV DLT System API'
  });
});

module.exports = router;