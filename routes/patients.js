// --- backend/routes/patients.js ---
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { logAudit } = require('../utils/auditLogger');
const auth = require('../middleware/auth');


// Apply auth middleware to all routes
router.use(auth);

// Utility functions
const generatePatientId = () => `HIV-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

// Mock DLT functions
const calculateHash = (data) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

const submitHashToDLT = async (patientId, dataHash) => {
  console.log(`[DLT MOCK] Storing hash for patient ${patientId}: ${dataHash}`);
  return {
    transaction_id: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    block_hash: `BLOCK-${Date.now().toString(16)}`,
    status: 'COMMITTED'
  };
};

// POST /api/patients/enroll
router.post('/enroll', async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const { name, date_of_birth, contact, consent, hiv_status, biometric_id } = req.body;

    if (!name || !date_of_birth || consent === undefined || !hiv_status || !biometric_id) {
      return res.status(400).json({ error: 'Missing required enrollment fields' });
    }
    
    const patient_id = generatePatientId();
    
    await connection.beginTransaction();

    try {
      // Insert into patients table
      await connection.execute(
        'INSERT INTO patients (patient_id, name, date_of_birth, contact, consent, hiv_status) VALUES (?, ?, ?, ?, ?, ?)',
        [patient_id, name, date_of_birth, contact, consent, hiv_status]
      );

      // Insert into biometric_links table
      await connection.execute(
        'INSERT INTO biometric_links (biometric_id, patient_id) VALUES (?, ?)',
        [biometric_id, patient_id]
      );

      // DLT Integration
      const dataToHash = { 
        patient_id, 
        consent, 
        hiv_status,
        timestamp: new Date().toISOString()
      };
      const hash = calculateHash(dataToHash);
      
      const dltResult = await submitHashToDLT(patient_id, hash);

      // Insert DLT Hash record
      await connection.execute(
        'INSERT INTO dlt_hashes (patient_id, data_hash) VALUES (?, ?)',
        [patient_id, hash]
      );

      // Audit log
      await logAudit(connection, {
        action_type: 'PATIENT_ENROLLMENT',
        patient_id: patient_id,
        description: `New patient enrolled: ${name} (${patient_id}) with consent: ${consent}, status: ${hiv_status}`
      });

      await connection.commit();
      
      res.status(201).json({ 
        message: 'Patient enrolled and DLT hash stored successfully', 
        patient_id: patient_id,
        dlt_transaction: dltResult.transaction_id,
        hash: hash
      });

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    await logAudit(null, {
      action_type: 'ENROLLMENT_FAILED',
      description: `Failed to enroll patient: ${err.message}`,
      ip_address: req.ip
    });
    next(err);
  }
});

// GET /api/patients - Get all patients (optimized)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        p.*,
        bl.biometric_id,
        (SELECT COUNT(*) FROM dlt_hashes dh WHERE dh.patient_id = p.patient_id) as dlt_hash_count
      FROM patients p 
      LEFT JOIN biometric_links bl ON p.patient_id = bl.patient_id
      ORDER BY p.created_at DESC
    `);
    
    const patients = rows.map(patient => ({
      ...patient,
      consent_status: patient.consent ? 'YES' : 'NO',
      dlt_status: patient.dlt_hash_count > 0 ? 'verified' : 'pending'
    }));
    
    res.json(patients);
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:patient_id - Get patient by ID
router.get('/:patient_id', async (req, res, next) => {
  try {
    const { patient_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT p.*, bl.biometric_id
       FROM patients p 
       LEFT JOIN biometric_links bl ON p.patient_id = bl.patient_id
       WHERE p.patient_id = ?`,
      [patient_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:patient_id - Update patient
router.put('/:patient_id', async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const { patient_id } = req.params;
    const { name, date_of_birth, contact, consent, hiv_status } = req.body;

    // Check if patient exists
    const [existingRows] = await connection.execute(
      'SELECT * FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await connection.beginTransaction();

    try {
      // Update patient
      await connection.execute(
        `UPDATE patients 
         SET name = ?, date_of_birth = ?, contact = ?, consent = ?, hiv_status = ?
         WHERE patient_id = ?`,
        [name, date_of_birth, contact, consent, hiv_status, patient_id]
      );

      // Generate new DLT hash for updated data
      const dataToHash = { 
        patient_id, 
        consent, 
        hiv_status,
        timestamp: new Date().toISOString()
      };
      const hash = calculateHash(dataToHash);
      
      const dltResult = await submitHashToDLT(patient_id, hash);

      // Store new DLT hash
      await connection.execute(
        'INSERT INTO dlt_hashes (patient_id, data_hash) VALUES (?, ?)',
        [patient_id, hash]
      );

      // Audit log
      await logAudit(connection, {
        action_type: 'PATIENT_UPDATED',
        patient_id: patient_id,
        description: `Patient updated: ${name} (${patient_id})`
      });

      await connection.commit();
      
      res.json({ 
        message: 'Patient updated and new DLT hash stored successfully',
        patient_id: patient_id,
        dlt_transaction: dltResult.transaction_id,
        hash: hash
      });

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/patients/:patient_id - Delete patient
router.delete('/:patient_id', async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const { patient_id } = req.params;

    // Check if patient exists
    const [existingRows] = await connection.execute(
      'SELECT * FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = existingRows[0];

    await connection.beginTransaction();

    try {
      // Delete related records first (due to foreign key constraints)
      await connection.execute(
        'DELETE FROM dlt_hashes WHERE patient_id = ?',
        [patient_id]
      );

      await connection.execute(
        'DELETE FROM biometric_links WHERE patient_id = ?',
        [patient_id]
      );

      // Delete patient
      await connection.execute(
        'DELETE FROM patients WHERE patient_id = ?',
        [patient_id]
      );

      // Audit log
      await logAudit(connection, {
        action_type: 'PATIENT_DELETED',
        patient_id: patient_id,
        description: `Patient deleted: ${patient.name} (${patient_id})`
      });

      await connection.commit();
      
      res.json({ 
        message: 'Patient and all related data deleted successfully',
        patient_id: patient_id
      });

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/stats - Get patient statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_patients,
        SUM(CASE WHEN consent = TRUE THEN 1 ELSE 0 END) as consented_patients,
        SUM(CASE WHEN hiv_status = 'Reactive' THEN 1 ELSE 0 END) as reactive_patients,
        SUM(CASE WHEN hiv_status = 'Non-Reactive' THEN 1 ELSE 0 END) as non_reactive_patients,
        COUNT(DISTINCT DATE(created_at)) as enrollment_days,
        AVG(DATEDIFF(CURDATE(), date_of_birth)/365) as average_age
      FROM patients
    `);

    const [weeklyEnrollment] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as enrollments
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const [statusDistribution] = await pool.execute(`
      SELECT 
        hiv_status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients), 2) as percentage
      FROM patients 
      GROUP BY hiv_status
    `);

    res.json({
      overview: stats[0],
      weekly_enrollment: weeklyEnrollment,
      status_distribution: statusDistribution
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/patients/search - Search patients
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const [rows] = await pool.execute(
      `SELECT p.*, bl.biometric_id
       FROM patients p 
       LEFT JOIN biometric_links bl ON p.patient_id = bl.patient_id
       WHERE p.name LIKE ? OR p.patient_id LIKE ? OR p.contact LIKE ?
       ORDER BY p.created_at DESC`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;