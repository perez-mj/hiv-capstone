// backend/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const patientRoutes = require('./patientRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const encounterRoutes = require('./encounterRoutes');
const labResultRoutes = require('./labResultRoutes');
const queueRoutes = require('./queueRoutes');
const staffRoutes = require('./staffRoutes');
const kioskRoutes = require('./kioskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const blockchainRoutes = require('./blockchainRoutes');

// Public routes
router.use('/auth', authRoutes);
router.use('/kiosk', kioskRoutes); 

// Protected routes (authentication required)
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/encounters', encounterRoutes);
router.use('/lab-results', labResultRoutes);
router.use('/queue', queueRoutes);
router.use('/staff', staffRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/blockchain', blockchainRoutes);

module.exports = router;