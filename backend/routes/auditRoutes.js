const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const blockchainAuditService = require('../services/blockchainAuditService');

// Get audit trail with filters
router.get('/audit-trail', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const { table, recordId, patientId, limit, offset } = req.query;
    
    const auditTrail = await blockchainAuditService.getAuditTrail(
      table,
      recordId,
      patientId,
      parseInt(limit) || 100,
      parseInt(offset) || 0
    );
    
    res.json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get audit statistics
router.get('/audit-stats', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const stats = await blockchainAuditService.getAuditStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify specific transaction
router.get('/verify/:txid', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const { txid } = req.params;
    const verification = await blockchainAuditService.verifyAuditIntegrity(txid);
    
    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;