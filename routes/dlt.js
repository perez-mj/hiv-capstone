// backend/routes/dlt.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Apply auth middleware to all DLT routes
router.use(auth);

const calculateHash = (data) => {
  const crypto = require('crypto');
  const sortedData = {};
  Object.keys(data).sort().forEach(key => {
    sortedData[key] = data[key];
  });
  return crypto.createHash('sha256').update(JSON.stringify(sortedData)).digest('hex');
};

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null, // Assumes user info is attached by middleware (e.g., req.user)
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// POST /api/dlt/hash/:patient_id - Create DLT hash for patient
router.post('/hash/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    console.log('Creating DLT hash for patient:', patient_id);

    // Get patient data
    const [patientRows] = await pool.execute(
      'SELECT patient_id, name, date_of_birth, contact_info, consent, hiv_status, created_at FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ 
        error: 'Patient not found',
        patient_id 
      });
    }

    const patient = patientRows[0];
    
    // Prepare data for hashing
    const dataToHash = {
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth.toISOString().split('T')[0],
      hiv_status: patient.hiv_status,
      consent: Boolean(patient.consent),
      timestamp: patient.created_at.toISOString()
    };

    console.log('Data to hash:', dataToHash);

    const hash = calculateHash(dataToHash);
    console.log('Generated hash:', hash);

    // Store hash in DLT table
    const [result] = await pool.execute(
      `INSERT INTO dlt_hashes (patient_id, dlt_hash, verified) 
       VALUES (?, ?, TRUE)
       ON DUPLICATE KEY UPDATE dlt_hash = ?, verified = TRUE, timestamp = CURRENT_TIMESTAMP`,
      [patient_id, hash, hash]
    );

    // Update patient DLT status
    await pool.execute(
      'UPDATE patients SET dlt_status = ? WHERE patient_id = ?',
      ['verified', patient_id]
    );

    // Log the audit action
    const userInfo = getUserInfo(req);
    await logAudit(userInfo.admin_user_id, {
      action_type: 'DLT_HASH_CREATED',
      patient_id: patient_id,
      description: `DLT hash created for patient ${patient.name}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      success: true,
      patient_id,
      hash,
      timestamp: new Date().toISOString(),
      message: 'DLT hash created successfully'
    });

  } catch (err) {
    console.error('Error creating DLT hash:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/dlt/verify/:patient_id - Verify DLT integrity
router.get('/verify/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    console.log('Verifying DLT for patient:', patient_id);

    // Get current patient data
    const [patientRows] = await pool.execute(
      'SELECT patient_id, name, date_of_birth, contact_info, consent, hiv_status, created_at, dlt_status FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ 
        error: 'Patient not found',
        patient_id 
      });
    }

    const patient = patientRows[0];
    
    // Get latest DLT hash
    const [dltRows] = await pool.execute(
      'SELECT * FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 1',
      [patient_id]
    );

    if (dltRows.length === 0) {
      console.log('No DLT hash found for patient:', patient_id);
      return res.json({
        patient_id,
        is_verified: false,
        status: 'no_hash',
        message: 'No DLT hash found for this patient',
        verification_timestamp: new Date().toISOString()
      });
    }

    const latestDltHash = dltRows[0];
    
    // Prepare data for hashing (same format as when created)
    const dataToHash = {
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth.toISOString().split('T')[0],
      hiv_status: patient.hiv_status,
      consent: Boolean(patient.consent),
      timestamp: patient.created_at.toISOString()
    };
    
    const currentHash = calculateHash(dataToHash);
    const isVerified = currentHash === latestDltHash.data_hash;

    console.log('Verification result:', isVerified);

    // Update DLT verification status
    await pool.execute(
      'UPDATE dlt_hashes SET verified = ? WHERE id = ?',
      [isVerified, latestDltHash.id]
    );

    // Update patient DLT status
    const dltStatus = isVerified ? 'verified' : 'failed';
    await pool.execute(
      'UPDATE patients SET dlt_status = ? WHERE patient_id = ?',
      [dltStatus, patient_id]
    );

    // Log the audit action
    const userInfo = getUserInfo(req);
    await logAudit(userInfo.admin_user_id, {
      action_type: 'DLT_VERIFICATION',
      patient_id: patient_id,
      description: `DLT verification ${isVerified ? 'passed' : 'failed'} for patient ${patient.name}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      patient_id,
      current_hash: currentHash,
      stored_dlt_hash: latestDltHash.hash,
      is_verified: isVerified,
      status: dltStatus,
      last_dlt_timestamp: latestDltHash.timestamp,
      verification_timestamp: new Date().toISOString(),
      data_verified: dataToHash
    });

  } catch (err) {
    console.error('Error verifying DLT:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/dlt/hashes/:patient_id - Get DLT history for patient
router.get('/hashes/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp DESC',
      [patient_id]
    );

    res.json({
      patient_id,
      hashes: rows,
      total: rows.length
    });

  } catch (err) {
    console.error('Error fetching DLT hashes:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;