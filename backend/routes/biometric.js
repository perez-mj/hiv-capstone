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

// Get all biometric links with patient information
router.get('/links', async (req, res) => {
  try {
    const query = `
      SELECT 
        bl.id,
        bl.patient_id,
        p.name as patient_name,
        bl.biometric_type,
        bl.biometric_hash as biometric_id,
        bl.is_active,
        bl.created_at as linked_date,
        bl.updated_at as last_verified
      FROM biometric_links bl
      LEFT JOIN patients p ON bl.patient_id = p.patient_id
      ORDER BY bl.created_at DESC
    `;
    
    const [links] = await pool.execute(query);
    
    const formattedLinks = links.map(link => ({
      id: link.id,
      biometricId: link.biometric_id,
      patientId: link.patient_id,
      patientName: link.patient_name || 'Unknown Patient',
      biometricType: link.biometric_type,
      status: link.is_active ? 'active' : 'inactive',
      linkedDate: link.linked_date,
      lastVerified: link.last_verified
    }));
    
    res.json({
      success: true,
      biometric_links: formattedLinks
    });
  } catch (error) {
    console.error('Error fetching biometric links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch biometric links'
    });
  }
});

// Create new biometric link
router.post('/link', async (req, res) => {
  try {
    const { patientId, biometricType, biometricData } = req.body;
    
    // In a real implementation, you'd generate a hash from the biometric data
    const biometricHash = generateBiometricHash(biometricData);
    
    const query = `
      INSERT INTO biometric_links 
        (patient_id, biometric_type, biometric_data, biometric_hash, is_active)
      VALUES (?, ?, ?, ?, 1)
    `;
    
    const [result] = await pool.execute(query, [
      patientId, 
      biometricType, 
      biometricData, 
      biometricHash
    ]);
    
    // Get the newly created link with patient info
    const [newLink] = await pool.execute(`
      SELECT 
        bl.id,
        bl.patient_id,
        p.name as patient_name,
        bl.biometric_type,
        bl.biometric_hash as biometric_id,
        bl.is_active,
        bl.created_at as linked_date,
        bl.updated_at as last_verified
      FROM biometric_links bl
      LEFT JOIN patients p ON bl.patient_id = p.patient_id
      WHERE bl.id = ?
    `, [result.insertId]);
    
    res.json({
      success: true,
      message: 'Biometric link created successfully',
      biometric_link: {
        id: newLink[0].id,
        biometricId: newLink[0].biometric_id,
        patientId: newLink[0].patient_id,
        patientName: newLink[0].patient_name,
        biometricType: newLink[0].biometric_type,
        status: newLink[0].is_active ? 'active' : 'inactive',
        linkedDate: newLink[0].linked_date,
        lastVerified: newLink[0].last_verified
      }
    });
    
  } catch (error) {
    console.error('Error creating biometric link:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Biometric link already exists for this patient and type'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create biometric link'
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
// Get biometric stats
router.get('/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_links,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_links,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_links,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_links,
        biometric_type,
        COUNT(*) as type_count
      FROM biometric_links 
      GROUP BY biometric_type
    `;
    
    const [stats] = await pool.execute(query);
    
    const total = stats[0]?.total_links || 0;
    const active = stats[0]?.active_links || 0;
    const inactive = stats[0]?.inactive_links || 0;
    const today = stats[0]?.today_links || 0;
    
    res.json({
      success: true,
      data: {
        // For biometric management page
        total: total,
        active: active,
        inactive: inactive,
        today: today,
        
        // For dashboard compatibility
        active_biometric_links: active,
        total_biometric_links: total,
        
        by_type: stats.reduce((acc, row) => {
          acc[row.biometric_type] = row.type_count;
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    console.error('Error fetching biometric stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch biometric stats'
    });
  }
});

// Helper function to generate biometric hash (simplified)
function generateBiometricHash(biometricData) {
  // In a real implementation, use a proper cryptographic hash
  // This is a simplified version for demonstration
  return 'BIO-' + require('crypto')
    .createHash('sha256')
    .update(biometricData + Date.now())
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();
}

// Unlink biometric (set inactive)
router.delete('/unlink/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'UPDATE biometric_links SET is_active = 0 WHERE id = ?';
    await pool.execute(query, [id]);
    
    res.json({
      success: true,
      message: 'Biometric link deactivated successfully'
    });
    
  } catch (error) {
    console.error('Error unlinking biometric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink biometric'
    });
  }
});

module.exports = router;