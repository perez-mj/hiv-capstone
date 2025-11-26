const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { createBiometricLink } = require('../utils/biometricService');

router.use(auth);

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// POST /api/biometric/link - Create biometric link for patient
router.post('/link', async (req, res) => {
  try {
    const { patient_id, biometric_type = 'fingerprint', biometric_data } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const success = await createBiometricLink(patient_id, biometric_type, biometric_data);

    if (success) {
      // Log the action
      const userInfo = getUserInfo(req);
      await logAudit(userInfo.admin_user_id, {
        action_type: 'BIOMETRIC_LINK_CREATED',
        patient_id: patient_id,
        description: `Biometric link created for patient`,
        ip_address: userInfo.ip_address
      });

      res.json({
        success: true,
        patient_id,
        biometric_type,
        message: 'Biometric link created successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to create biometric link' });
    }
  } catch (err) {
    console.error('Error creating biometric link:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/biometric/verify/:biometric_hash - Verify biometric
router.get('/verify/:biometric_hash', async (req, res) => {
  try {
    const { biometric_hash } = req.params;

    const [rows] = await pool.execute(
      `SELECT bl.*, p.patient_id, p.name, p.date_of_birth, p.contact_info, 
              p.consent, p.hiv_status, p.dlt_status
       FROM biometric_links bl
       JOIN patients p ON bl.patient_id = p.patient_id
       WHERE bl.biometric_hash = ? AND bl.is_active = TRUE`,
      [biometric_hash]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Biometric ID not found or inactive' });
    }

    const biometricData = rows[0];
    
    // Log the verification
    const userInfo = getUserInfo(req);
    await logAudit(userInfo.admin_user_id, {
      action_type: 'BIOMETRIC_VERIFICATION',
      patient_id: biometricData.patient_id,
      description: `Biometric verification for patient ${biometricData.name}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      verified: true,
      patient: {
        patient_id: biometricData.patient_id,
        name: biometricData.name,
        date_of_birth: biometricData.date_of_birth,
        contact_info: biometricData.contact_info,
        consent_status: biometricData.consent ? 'YES' : 'NO',
        hiv_status: biometricData.hiv_status,
        dlt_status: biometricData.dlt_status
      },
      biometric: {
        biometric_type: biometricData.biometric_type,
        linked_at: biometricData.created_at
      }
    });
  } catch (err) {
    console.error('Error verifying biometric:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/biometric/patient/:patient_id - Get biometric links for patient
router.get('/patient/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM biometric_links 
       WHERE patient_id = ? AND is_active = TRUE 
       ORDER BY created_at DESC`,
      [patient_id]
    );

    res.json({
      patient_id,
      biometric_links: rows,
      total: rows.length
    });
  } catch (err) {
    console.error('Error fetching biometric links:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// PUT /api/biometric/deactivate/:biometric_hash - Deactivate biometric link
router.put('/deactivate/:biometric_hash', async (req, res) => {
  try {
    const { biometric_hash } = req.params;

    const [result] = await pool.execute(
      `UPDATE biometric_links 
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
       WHERE biometric_hash = ?`,
      [biometric_hash]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Biometric link not found' });
    }

    // Log the action
    const userInfo = getUserInfo(req);
    await logAudit(userInfo.admin_user_id, {
      action_type: 'BIOMETRIC_DEACTIVATED',
      description: `Biometric link deactivated: ${biometric_hash}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      success: true,
      message: 'Biometric link deactivated successfully'
    });
  } catch (err) {
    console.error('Error deactivating biometric link:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/biometric/stats - Get biometric statistics
router.get('/stats', async (req, res) => {
  try {
    const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM biometric_links WHERE is_active = TRUE');
    const [typeStats] = await pool.execute(`
      SELECT biometric_type, COUNT(*) as count 
      FROM biometric_links 
      WHERE is_active = TRUE 
      GROUP BY biometric_type
    `);
    const [recentLinks] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM biometric_links 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND is_active = TRUE
    `);

    res.json({
      active_biometric_links: totalRows[0].count,
      links_by_type: typeStats,
      recent_links_24h: recentLinks[0].count
    });
  } catch (err) {
    console.error('Error fetching biometric stats:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;