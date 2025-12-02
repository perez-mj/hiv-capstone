// backend/middleware/patientAuth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Patient authentication middleware
// Updated patientAuth.js with debugging
const authenticatePatient = async (req, res, next) => {
  try {
    console.log('🔐 Patient auth middleware called');
    console.log('Headers:', req.headers);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    
    console.log('Decoded token:', decoded);
    
    if (decoded.type !== 'patient') {
      console.log('❌ Invalid token type:', decoded.type);
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Fetch patient data from database
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

    console.log('Patient found in DB:', rows.length > 0 ? 'Yes' : 'No');

    if (rows.length === 0) {
      console.log('❌ Patient not found in database');
      return res.status(401).json({ error: 'Patient not found' });
    }

    // Set patient data on request object
    req.patient = rows[0];
    console.log('✅ Patient auth successful:', req.patient.patient_id);
    next();

  } catch (err) {
    console.error('❌ Patient auth middleware error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};



// Export both the router and the middleware
module.exports = authenticatePatient;