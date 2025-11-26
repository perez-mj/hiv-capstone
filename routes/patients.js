// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

router.use(auth);

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// backend/routes/patients.js - Add this route

// GET /api/patients/stats - Get patient statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    console.log('Fetching patient statistics...');
    
    // Get total patients count
    const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM patients');
    const total = totalResult[0].total;

    // Get consented patients count
    const [consentedResult] = await pool.execute('SELECT COUNT(*) as consented FROM patients WHERE consent = TRUE');
    const consented = consentedResult[0].consented;

    // Get HIV status counts
    const [hivResults] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN hiv_status = 'Reactive' THEN 1 ELSE 0 END) as reactive,
        SUM(CASE WHEN hiv_status = 'Non-Reactive' THEN 1 ELSE 0 END) as non_reactive
      FROM patients
    `);
    const hivStats = hivResults[0];

    // Get DLT verification counts
    const [dltResults] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT patient_id) as dlt_verified 
      FROM patients 
      WHERE dlt_status = 'verified'
    `);
    const dltVerified = dltResults[0].dlt_verified;

    // Get daily enrollments (last 24 hours)
    const [dailyResult] = await pool.execute(`
      SELECT COUNT(*) as daily_enrollments 
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    const dailyEnrollments = dailyResult[0].daily_enrollments;

    // Get enrollment trends (last 7 days)
    const [trendsResult] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get consent status breakdown
    const [consentBreakdown] = await pool.execute(`
      SELECT 
        CASE 
          WHEN consent = TRUE THEN 'Consented'
          ELSE 'Not Consented'
        END as status,
        COUNT(*) as count
      FROM patients
      GROUP BY consent
    `);

    // Get DLT status breakdown
    const [dltBreakdown] = await pool.execute(`
      SELECT 
        COALESCE(dlt_status, 'pending') as status,
        COUNT(*) as count
      FROM patients
      GROUP BY dlt_status
    `);

    const stats = {
      total: parseInt(total),
      consented: parseInt(consented),
      reactive: parseInt(hivStats.reactive),
      non_reactive: parseInt(hivStats.non_reactive),
      dlt_verified: parseInt(dltVerified),
      daily_enrollments: parseInt(dailyEnrollments),
      enrollment_trends: trendsResult,
      consent_breakdown: consentBreakdown,
      dlt_breakdown: dltBreakdown,
      consent_rate: total > 0 ? Math.round((consented / total) * 100) : 0,
      reactive_rate: total > 0 ? Math.round((hivStats.reactive / total) * 100) : 0,
      non_reactive_rate: total > 0 ? Math.round((hivStats.non_reactive / total) * 100) : 0,
      dlt_verification_rate: total > 0 ? Math.round((dltVerified / total) * 100) : 0
    };

    console.log('Patient statistics fetched successfully:', {
      total: stats.total,
      consented: stats.consented,
      reactive: stats.reactive,
      dlt_verified: stats.dlt_verified
    });

    res.json(stats);

  } catch (err) {
    console.error('Error fetching patient statistics:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/patients - Get all patients with pagination and filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, consent, hiv_status, dlt_status } = req.query;
    const offset = (page - 1) * limit;

    // Build the main query
    let query = `
      SELECT 
        p.patient_id,
        p.name,
        p.date_of_birth,
        p.contact_info,
        p.contact,
        p.consent,
        p.hiv_status,
        p.dlt_status,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.consent = 1 THEN 'YES'
          WHEN p.consent = 0 THEN 'NO'
          ELSE 'NO'
        END as consent_status,
        COALESCE(dh.verified, FALSE) as dlt_verified,
        COALESCE(biometric_count.active_biometrics, 0) as active_biometrics
      FROM patients p
      LEFT JOIN dlt_hashes dh ON p.patient_id = dh.patient_id
      LEFT JOIN (
        SELECT patient_id, COUNT(*) as active_biometrics 
        FROM biometric_links 
        WHERE is_active = TRUE 
        GROUP BY patient_id
      ) biometric_count ON p.patient_id = biometric_count.patient_id
      WHERE 1=1
    `;
    
    const params = [];

    if (search) {
      query += ` AND (p.name LIKE  OR p.patient_id LIKE %${search}% OR p.contact_info LIKE %${search}% OR p.contact LIKE %${search}%)`;
    }

    if (consent) {
      if (consent === 'YES') {
        query += ' AND p.consent = TRUE';
      } else if (consent === 'NO') {
        query += ' AND p.consent = FALSE';
      }
    }

    if (hiv_status) {
      query += ` AND p.hiv_status = ${hiv_status}`;
    }

    if (dlt_status) {
      query += ` AND p.dlt_status = ${dlt_status}`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM patients p
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (p.name LIKE %${search}% OR p.patient_id LIKE %${search}% OR p.contact_info LIKE %${search}% OR p.contact LIKE %${search}%)`;
    }

    if (consent) {
      if (consent === 'YES') {
        countQuery += ' AND p.consent = TRUE';
      } else if (consent === 'NO') {
        countQuery += ' AND p.consent = FALSE';
      }
    }

    if (hiv_status) {
      countQuery += ` AND p.hiv_status = ${hiv_status}`;
    }

    if (dlt_status) {
      countQuery += ` AND p.dlt_status = ${dlt_status}`;
    }

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    res.json({
      patients: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/patients/:id - Get single patient
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.patient_id,
        p.name,
        p.date_of_birth,
        p.contact_info,
        p.contact,
        p.consent,
        p.hiv_status,
        p.dlt_status,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.consent = 1 THEN 'YES'
          WHEN p.consent = 0 THEN 'NO'
          ELSE 'NO'
        END as consent_status,
        COALESCE(dh.verified, FALSE) as dlt_verified,
        COALESCE(dh.data_hash, '') as dlt_hash,
        COALESCE(dh.timestamp, p.created_at) as dlt_timestamp,
        COALESCE(biometric_count.active_biometrics, 0) as active_biometrics
      FROM patients p
      LEFT JOIN dlt_hashes dh ON p.patient_id = dh.patient_id
      LEFT JOIN (
        SELECT patient_id, COUNT(*) as active_biometrics 
        FROM biometric_links 
        WHERE is_active = TRUE 
        GROUP BY patient_id
      ) biometric_count ON p.patient_id = biometric_count.patient_id
      WHERE p.patient_id = ?
    `;

    const [rows] = await pool.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/patients - Create new patient
router.post('/', async (req, res, next) => {
  try {
    const { patient_id, name, date_of_birth, contact, contact_info, consent, hiv_status } = req.body;

    // Validate required fields
    if (!patient_id || !name || !date_of_birth || !hiv_status) {
      return res.status(400).json({ error: 'Missing required fields: patient_id, name, date_of_birth, and hiv_status are required' });
    }

    const consentBool = Boolean(consent);

    const [result] = await pool.execute(
      `INSERT INTO patients
       (patient_id, name, date_of_birth, contact, contact_info, consent, hiv_status, dlt_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, name, date_of_birth, contact || null, contact_info || null, consentBool, hiv_status, 'pending']
    );

    const userInfo = getUserInfo(req);
   
    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'PATIENT_CREATED',
      patient_id: patient_id,
      description: `Patient ${name} (${patient_id}) enrolled`,
      ip_address: userInfo.ip_address
    });

    // Create DLT hash
    await createDltHash(patient_id);
    
    // Create biometric link
    await createBiometricLink(patient_id);

    res.status(201).json({
      message: 'Patient created successfully',
      patient: {
        patient_id,
        name,
        date_of_birth,
        contact,
        contact_info,
        consent: consentBool,
        hiv_status,
        dlt_status: 'pending'
      }
    });
  } catch (err) {
    console.error('Error creating patient:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Patient ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, date_of_birth, contact, contact_info, consent, hiv_status } = req.body;

    if (!name || !date_of_birth || !hiv_status) {
      return res.status(400).json({ error: 'Missing required fields: name, date_of_birth, and hiv_status are required' });
    }

    const consentBool = Boolean(consent);

    const [result] = await pool.execute(
      `UPDATE patients
       SET name = ?, date_of_birth = ?, contact = ?, contact_info = ?, consent = ?, hiv_status = ?, dlt_status = ?
       WHERE patient_id = ?`,
      [name, date_of_birth, contact || null, contact_info || null, consentBool, hiv_status, 'pending', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'PATIENT_UPDATED',
      patient_id: id,
      description: `Patient ${name} (${id}) updated`,
      ip_address: userInfo.ip_address
    });

    // Update DLT hash
    await createDltHash(id);

    res.json({ message: 'Patient updated successfully' });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // First, get patient name for audit log
    const [patientRows] = await pool.execute(
      'SELECT name FROM patients WHERE patient_id = ?',
      [id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientName = patientRows[0].name;

    // Delete related records
    await pool.execute('DELETE FROM dlt_hashes WHERE patient_id = ?', [id]);
    await pool.execute('DELETE FROM biometric_links WHERE patient_id = ?', [id]);
   
    const [result] = await pool.execute('DELETE FROM patients WHERE patient_id = ?', [id]);

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'PATIENT_DELETED',
      patient_id: id,
      description: `Patient ${patientName} (${id}) deleted`,
      ip_address: userInfo.ip_address
    });

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error('Error deleting patient:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// DLT Hash creation function
// backend/routes/patients.js - Fix createDltHash function
const createDltHash = async (patientId) => {
  try {
    const [patientRows] = await pool.execute(
      'SELECT patient_id, name, date_of_birth, contact_info, consent, hiv_status, created_at FROM patients WHERE patient_id = ?',
      [patientId]
    );

    if (patientRows.length === 0) {
      throw new Error('Patient not found');
    }

    const patient = patientRows[0];
    const crypto = require('crypto');
    
    const dataToHash = {
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth.toISOString().split('T')[0],
      hiv_status: patient.hiv_status,
      consent: Boolean(patient.consent),
      timestamp: patient.created_at.toISOString()
    };

    const sortedData = {};
    Object.keys(dataToHash).sort().forEach(key => {
      sortedData[key] = dataToHash[key];
    });

    const hash = crypto.createHash('sha256').update(JSON.stringify(sortedData)).digest('hex');

    // Check if DLT hash already exists for this patient
    const [existingHashes] = await pool.execute(
      'SELECT id FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 1',
      [patientId]
    );

    if (existingHashes.length > 0) {
      // Update existing hash
      await pool.execute(
        'UPDATE dlt_hashes SET data_hash = ?, verified = TRUE, timestamp = CURRENT_TIMESTAMP WHERE id = ?',
        [hash, existingHashes[0].id]
      );
    } else {
      // Insert new hash
      await pool.execute(
        'INSERT INTO dlt_hashes (patient_id, data_hash, verified) VALUES (?, ?, TRUE)',
        [patientId, hash]
      );
    }

    await pool.execute(
      'UPDATE patients SET dlt_status = ? WHERE patient_id = ?',
      ['verified', patientId]
    );

    return true;
  } catch (error) {
    console.error('Error creating DLT hash:', error.message);
    return false;
  }
};

// Biometric link creation function
const createBiometricLink = async (patientId, biometricType = 'fingerprint') => {
  try {
    const biometricData = `biometric_${patientId}_${Date.now()}`;
    const crypto = require('crypto');
    const biometricHash = crypto.createHash('sha256').update(biometricData).digest('hex');

    await pool.execute(
      `INSERT INTO biometric_links 
       (patient_id, biometric_type, biometric_data, biometric_hash, is_active) 
       VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE 
       biometric_data = ?, biometric_hash = ?, is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [patientId, biometricType, biometricData, biometricHash, 
       biometricData, biometricHash]
    );

    return true;
  } catch (error) {
    console.error('Error creating biometric link:', error.message);
    return false;
  }
};

module.exports = router;