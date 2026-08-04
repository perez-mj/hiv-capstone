// backend/routes/backup.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const db = require('../models');
const backupService = require('../services/backupService');
const path = require('path');
const fs = require('fs');

// All backup routes require admin access
router.use(auth);
router.use(roleCheck('admin'));

router.post('/create', async (req, res) => {
  try {
    const backup = await backupService.createBackup();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'Backup',
      new_data: { size: backup.size },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/restore/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(backupService.backupDir, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    const result = await backupService.restoreBackup(backupPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(backupService.backupDir, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    res.download(backupPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await backupService.deleteBackup(filename);
    
    if (result.success) {
      res.json({ message: 'Backup deleted successfully' });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;