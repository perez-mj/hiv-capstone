// backend/routes/dlt.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const calculateHash = (data) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

// GET /api/dlt/verify/:patient_id
router.get('/verify/:patient_id', async (req, res, next) => {
  try {
    const { patient_id } = req.params;

    const [patientRows] = await pool.execute(
      'SELECT patient_id, consent, hiv_status, created_at FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientRows[0];
    
    const [dltRows] = await pool.execute(
      'SELECT * FROM dlt_hashes WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 1',
      [patient_id]
    );

    if (dltRows.length === 0) {
      return res.status(404).json({ error: 'No DLT hash found for this patient' });
    }

    const latestDltHash = dltRows[0];
    const dataToHash = {
      patient_id: patient.patient_id,
      consent: patient.consent,
      hiv_status: patient.hiv_status,
      timestamp: patient.created_at.toISOString()
    };
    
    const currentHash = calculateHash(dataToHash);
    const isVerified = currentHash === latestDltHash.hash;

    res.json({
      patient_id,
      current_hash: currentHash,
      stored_dlt_hash: latestDltHash.hash,
      is_verified: isVerified,
      last_dlt_timestamp: latestDltHash.timestamp,
      verification_timestamp: new Date().toISOString()
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;