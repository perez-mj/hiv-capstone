// backend/routes/patientTests.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const patientAuth = require('./patientAuth');

router.use(patientAuth);

// GET /api/patient/tests - Get patient's test history
router.get('/', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;

    // For demo purposes, we'll create sample test data
    // In production, you would have a proper tests table
    const sampleTests = [
      {
        id: 1,
        test_date: new Date('2024-01-15'),
        result: 'Non-Reactive',
        test_type: 'Rapid HIV Test',
        facility_name: 'Main Health Clinic',
        facility_location: '123 Health St, City',
        dlt_verified: true,
        notes: 'Routine screening'
      },
      {
        id: 2,
        test_date: new Date('2024-03-20'),
        result: 'Non-Reactive',
        test_type: 'Confirmatory Test',
        facility_name: 'Main Health Clinic',
        facility_location: '123 Health St, City',
        dlt_verified: true,
        notes: 'Follow-up test'
      },
      {
        id: 3,
        test_date: new Date('2024-06-10'),
        result: 'Reactive',
        test_type: 'Rapid HIV Test',
        facility_name: 'Community Health Center',
        facility_location: '456 Care Ave, City',
        dlt_verified: false,
        notes: 'Positive result, requires confirmation'
      }
    ];

    // Filter tests for current patient (in real scenario, this would be from DB)
    const patientTests = sampleTests.map(test => ({
      ...test,
      patient_id: patient_id
    }));

    res.json({
      tests: patientTests,
      total: patientTests.length
    });

  } catch (err) {
    console.error('Error fetching patient tests:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;