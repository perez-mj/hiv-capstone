// backend/routes/dlt.js - FIXED to be append-only
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

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
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// POST /api/dlt/hash/:patient_id - Create NEW DLT hash (append-only)
router.post('/hash/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    console.log('Creating NEW DLT hash for patient:', patient_id);

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
    
    // Prepare data for hashing (SAME FORMAT EVERY TIME)
    const dataToHash = {
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth.toISOString().split('T')[0],
      hiv_status: patient.hiv_status,
      consent: Boolean(patient.consent),
      timestamp: patient.created_at.toISOString() // Use original creation timestamp for consistency
    };

    console.log('Data to hash:', dataToHash);

    const hash = calculateHash(dataToHash);
    console.log('Generated hash:', hash);

    // 🚀 CRITICAL FIX: ALWAYS INSERT, NEVER UPDATE
    // Get previous hash for simple chain linking
    const [previousHashes] = await pool.execute(
      'SELECT data_hash FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 1',
      [patient_id]
    );

    let block_hash = null;
    if (previousHashes.length > 0) {
      // Create simple chain: block_hash = SHA256(previous_hash + new_hash)
      const crypto = require('crypto');
      block_hash = crypto.createHash('sha256')
        .update(previousHashes[0].data_hash + hash)
        .digest('hex');
    }

    // INSERT NEW ROW - NEVER UPDATE EXISTING
    const [result] = await pool.execute(
      `INSERT INTO dlt_hashes (patient_id, data_hash, block_hash, verified) 
       VALUES (?, ?, ?, TRUE)`,
      [patient_id, hash, block_hash]
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
      description: `NEW DLT hash created for patient ${patient.name}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      success: true,
      patient_id,
      hash,
      block_hash,
      timestamp: new Date().toISOString(),
      message: 'NEW DLT hash created successfully',
      is_new_record: true
    });

  } catch (err) {
    console.error('Error creating DLT hash:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/dlt/verify/:patient_id - Verify DLT integrity against ORIGINAL snapshot
router.get('/verify/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    console.log('Verifying DLT integrity for patient:', patient_id);

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
    
    // 🚀 CRITICAL FIX: Get the ORIGINAL snapshot (first hash ever created)
    const [originalHashRows] = await pool.execute(
      'SELECT * FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp ASC LIMIT 1',
      [patient_id]
    );

    if (originalHashRows.length === 0) {
      console.log('No DLT hash found for patient:', patient_id);
      return res.json({
        patient_id,
        is_verified: false,
        status: 'no_hash',
        message: 'No DLT hash found for this patient',
        verification_timestamp: new Date().toISOString()
      });
    }

    const originalSnapshot = originalHashRows[0];
    
    // Prepare data for hashing (EXACT SAME format as original snapshot)
    const dataToHash = {
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth.toISOString().split('T')[0],
      hiv_status: patient.hiv_status,
      consent: Boolean(patient.consent),
      timestamp: patient.created_at.toISOString() // Use original creation timestamp
    };
    
    const currentHash = calculateHash(dataToHash);
    
    // 🚀 COMPARE: Current data hash vs ORIGINAL stored snapshot hash
    const isVerified = currentHash === originalSnapshot.data_hash;

    console.log('=== TAMPER DETECTION RESULTS ===');
    console.log('Current data hash:', currentHash);
    console.log('Original snapshot hash:', originalSnapshot.data_hash);
    console.log('Hashes match (no tampering):', isVerified);
    console.log('Data being verified:', dataToHash);

    // Get latest hash for status update
    const [latestHashRows] = await pool.execute(
      'SELECT * FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 1',
      [patient_id]
    );
    const latestDltHash = latestHashRows[0];

    // Update latest DLT verification status
    await pool.execute(
      'UPDATE dlt_hashes SET verified = ?, verification_timestamp = CURRENT_TIMESTAMP WHERE id = ?',
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
      description: `DLT verification ${isVerified ? 'passed' : 'FAILED - POSSIBLE TAMPERING'} for patient ${patient.name}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      patient_id,
      current_hash: currentHash,
      original_snapshot_hash: originalSnapshot.data_hash, // Changed from stored_hash
      is_verified: isVerified,
      status: dltStatus,
      has_tampering: !isVerified, // 🚨 NEW: Explicit tampering flag
      original_snapshot_timestamp: originalSnapshot.timestamp,
      verification_timestamp: new Date().toISOString(),
      data_verified: dataToHash,
      message: isVerified 
        ? 'Data integrity verified - no tampering detected' 
        : '🚨 DATA TAMPERING DETECTED - Current data does not match original snapshot'
    });

  } catch (err) {
    console.error('Error verifying DLT:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/dlt/hashes/:patient_id - Get ALL DLT history for patient (immutable timeline)
router.get('/hashes/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp ASC', // Show timeline order
      [patient_id]
    );

    res.json({
      patient_id,
      hashes: rows,
      total: rows.length,
      timeline: true
    });

  } catch (err) {
    console.error('Error fetching DLT hashes:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// ... rest of your dlt.js routes remain the same

// NEW: Get all DLT hashes for admin view
router.get('/hashes', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT dh.*, p.name, p.date_of_birth 
      FROM dlt_hashes dh 
      JOIN patients p ON dh.patient_id = p.patient_id
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM dlt_hashes dh 
      JOIN patients p ON dh.patient_id = p.patient_id
    `;
    const queryParams = [];

    if (status) {
      query += ' WHERE dh.verified = ?';
      countQuery += ' WHERE dh.verified = ?';
      queryParams.push(status === 'verified' ? 1 : 0);
    }

    query += ` ORDER BY dh.timestamp DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [rows] = await pool.execute(query, queryParams);
    const [countRows] = await pool.execute(countQuery, queryParams.slice(0, -2)); // Remove limit/offset for count

    res.json({
      hashes: rows,
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countRows[0].total / limit)
    });

  } catch (err) {
    console.error('Error fetching all DLT hashes:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;