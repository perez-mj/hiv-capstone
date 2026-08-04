// backend/routes/blockchain.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const db = require('../models');
const blockchainService = require('../services/blockchainService');

// All blockchain routes require admin access
router.use(auth);
router.use(roleCheck('admin'));

router.get('/verify/:recordType/:recordId', async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    
    const model = recordType === 'testing' 
      ? db.TestingEncounter 
      : db.TreatmentEncounter;
    
    const record = await model.findByPk(recordId);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const verification = await blockchainService.verifyRecord(record, recordType);
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'VIEW',
      entity_type: 'BlockchainVerification',
      entity_id: recordId,
      new_data: { verification },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/scan-tampering', async (req, res) => {
  try {
    const testingTampered = await blockchainService.scanForTampering('TestingEncounter');
    const treatmentTampered = await blockchainService.scanForTampering('TreatmentEncounter');
    
    const allTampered = [...testingTampered, ...treatmentTampered];
    
    res.json({
      totalTampered: allTampered.length,
      tamperedRecords: allTampered,
      scanDate: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await blockchainService.getBlockchainStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/repair', async (req, res) => {
  try {
    const { recordType } = req.body;
    
    const model = recordType === 'testing' 
      ? db.TestingEncounter 
      : db.TreatmentEncounter;
    
    const records = await model.findAll({
      order: [['created_at', 'ASC']]
    });
    
    let previousHash = '0';
    const repaired = [];
    
    for (const record of records) {
      const newHash = blockchainService.generateHash(record, previousHash);
      await record.update({ blockchain_hash: newHash });
      repaired.push({ id: record.id, newHash });
      previousHash = newHash;
    }
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'BlockchainRepair',
      new_data: { recordType, repairedCount: repaired.length },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ 
      message: 'Blockchain chain repaired successfully',
      repairedCount: repaired.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;