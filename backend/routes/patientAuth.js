// backend/routes/patientAuth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/patient/auth/login - Patient login
router.post('/login', async (req, res) => {
  try {
    const { patient_id, password } = req.body;
    
    console.log('🔐 Patient login attempt for ID:', patient_id);

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID required' });
    }

    // Check if patient exists
    const [rows] = await pool.execute(
      `SELECT p.*, 
              CASE 
                WHEN p.consent = 1 THEN 'YES'
                WHEN p.consent = 0 THEN 'NO'
                ELSE 'NO'
              END as consent_status
       FROM patients p 
       WHERE p.patient_id = ?`,
      [patient_id]
    );

    if (rows.length === 0) {
      console.log('❌ Patient not found:', patient_id);
      return res.status(401).json({ error: 'Patient ID not found' });
    }

    const patient = rows[0];
    
    // TEMPORARY FIX: For demo, allow any password or use patient_id as password
    const isValidPassword = !password || password === patient_id || password === 'patient123';
    
    // If you added password_hash column, use this instead:
    // const isValidPassword = await bcrypt.compare(password, patient.password_hash);

    if (!isValidPassword) {
      console.log('❌ Invalid credentials for patient:', patient_id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if patient is active (if you add the is_active column)
    // if (patient.is_active !== 1) {
    //   return res.status(401).json({ error: 'Account is deactivated' });
    // }

    // Create JWT token for patient
    const token = jwt.sign(
      { 
        patientId: patient.patient_id, 
        name: patient.name,
        type: 'patient'
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('✅ Patient login successful:', patient.name);

    res.json({
      message: 'Login successful',
      token,
      patient: {
        patient_id: patient.patient_id,
        name: patient.name,
        date_of_birth: patient.date_of_birth,
        contact_info: patient.contact_info,
        contact: patient.contact,
        consent_status: patient.consent_status,
        hiv_status: patient.hiv_status,
        dlt_status: patient.dlt_status,
        created_at: patient.created_at
      }
    });

  } catch (err) {
    console.error('💥 Patient login error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed'
    });
  }
});

// GET /api/patient/auth/check - Check if patient is authenticated
router.get('/check', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    
    if (decoded.type !== 'patient') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const [rows] = await pool.execute(
      `SELECT p.*, 
              CASE 
                WHEN p.consent = 1 THEN 'YES'
                WHEN p.consent = 0 THEN 'NO'
                ELSE 'NO'
              END as consent_status
       FROM patients p 
       WHERE p.patient_id = ?`,
      [decoded.patientId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Patient not found' });
    }

    res.json({
      patient: rows[0]
    });

  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;