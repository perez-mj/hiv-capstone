// backend/routes/queue.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck, officeCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');
const queueService = require('../services/queueService');

// Get queue state for an office
router.get('/:office/state', auth, roleCheck('staff', 'admin'), officeCheck(['testing', 'treatment']), async (req, res) => {
  try {
    const { office } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const state = await queueService.getQueueState(office, date);
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add patient to queue
router.post('/:office/add', auth, roleCheck('staff', 'admin'), officeCheck(['testing', 'treatment']), async (req, res) => {
  try {
    const { office } = req.params;
    const { patient_id, appointment_id } = req.body;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const result = await queueService.addToQueue(office, date, patient_id, appointment_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Call next patient
router.post('/:office/next', auth, roleCheck('staff', 'admin'), officeCheck(['testing', 'treatment']), async (req, res) => {
  try {
    const { office } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const result = await queueService.callNext(office, date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Skip current patient
router.post('/:office/skip', auth, roleCheck('staff', 'admin'), officeCheck(['testing', 'treatment']), async (req, res) => {
  try {
    const { office } = req.params;
    const { reason } = req.body;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const result = await queueService.skipCurrent(office, date, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset queue (end of day)
router.delete('/:office/reset', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { office } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const result = await queueService.resetQueue(office, date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;