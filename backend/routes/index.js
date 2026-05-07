// backend/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const patientRoutes = require('./patientRoutes');
const patientSelfRoutes = require('./patientSelfRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const encounterRoutes = require('./encounterRoutes');
const labResultRoutes = require('./labResultRoutes');
const queueRoutes = require('./queueRoutes');
const staffRoutes = require('./staffRoutes');
const kioskRoutes = require('./kioskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const blockchainRoutes = require('./blockchainRoutes');
const verificationRoutes = require('./verificationRoutes');

// Public routes
// backend/routes/index.js - Correct ordering
router.use('/auth', authRoutes);
router.use('/kiosk', kioskRoutes);

// Protected routes - SPECIFIC routes FIRST
router.use('/patients/me', patientSelfRoutes);  // More specific
router.use('/patients', patientRoutes);          // Generic patient routes
router.use('/users', userRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/encounters', encounterRoutes);
router.use('/lab-results', labResultRoutes);
router.use('/queue', queueRoutes);
router.use('/staff', staffRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/blockchain', blockchainRoutes);
router.use('/verification', verificationRoutes);


module.exports = router;