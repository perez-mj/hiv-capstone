// backend/routes/testing.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck, officeCheck } = require('../middleware/roleCheck');
const db = require('../models');
const crypto = require('crypto');
const socketService = require('../services/socketService');

// Save testing encounter
router.post('/encounter', auth, roleCheck('staff', 'admin'), officeCheck(['testing']), async (req, res) => {
  try {
    const { patient_id, pretest_counseling, hiv_test, posttest_counseling, referral } = req.body;
    
    if (!pretest_counseling || !pretest_counseling.conducted) {
      return res.status(400).json({ error: 'Pre-test counseling must be conducted before recording test result' });
    }
    
    const encounter = await db.TestingEncounter.create({
      patient_id,
      staff_id: req.user.id,
      pretest_counseling,
      hiv_test,
      posttest_counseling,
      referral
    });
    
    const hashData = JSON.stringify({
      id: encounter.id,
      patient_id: encounter.patient_id,
      staff_id: encounter.staff_id,
      pretest_counseling: encounter.pretest_counseling,
      hiv_test: encounter.hiv_test,
      posttest_counseling: encounter.posttest_counseling,
      referral: encounter.referral,
      timestamp: encounter.created_at
    });
    
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');
    encounter.blockchain_hash = hash;
    await encounter.save();
    
    // Handle positive result
    if (hiv_test && hiv_test.result === 'positive') {
      const patient = await db.Patient.findByPk(patient_id);
      if (patient) {
        patient.status = 'treatment';
        patient.treatment_transition_date = new Date().toISOString().split('T')[0];
        await patient.save();
        
        await db.AuditLog.create({
          user_id: req.user.id,
          action: 'REFERRAL',
          entity_type: 'Patient',
          entity_id: patient_id,
          new_data: { from: 'testing', to: 'treatment', reason: 'HIV Positive' },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }
    }
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'TestingEncounter',
      entity_id: encounter.id,
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    // ✅ Use socketService directly (imported, not from app)
    // Emit encounter completed
    socketService.emitEncounterCompleted('testing', {
      patient_id,
      encounter_id: encounter.id,
      result: hiv_test?.result || 'unknown'
    });
    
    // Also update queue if patient was in progress
    const today = new Date().toISOString().split('T')[0];
    const queueEntry = await db.QueueEntry.findOne({
      where: {
        patient_id,
        status: 'in-progress'
      },
      include: [{
        model: db.Queue,
        as: 'Queue',
        where: {
          office: 'testing',
          date: today
        }
      }]
    });
    
    if (queueEntry) {
      queueEntry.status = 'completed';
      queueEntry.completed_at = new Date();
      await queueEntry.save();
      
      const queue = await db.Queue.findByPk(queueEntry.queue_id);
      if (queue) {
        queue.completed_count = (queue.completed_count || 0) + 1;
        await queue.save();
      }
      
      // Emit queue update
      const waitingCount = await db.QueueEntry.count({
        where: { status: 'waiting' },
        include: [{
          model: db.Queue,
          as: 'Queue',
          where: {
            office: 'testing',
            date: today
          }
        }]
      });
      
      socketService.emitQueueUpdated('testing', {
        queue_number: queueEntry.queue_number,
        waiting_count: waitingCount,
        completed_count: queue?.completed_count || 0
      });
    }
    
    res.status(201).json(encounter);
  } catch (error) {
    console.error('Create testing encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all testing encounters for patient
router.get('/encounters/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== parseInt(patientId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const encounters = await db.TestingEncounter.findAll({
      where: { patient_id: patientId },
      include: [{
        model: db.User,
        as: 'User',
        attributes: ['id', 'username']
      }],
      order: [['created_at', 'DESC']]
    });
    
    res.json(encounters);
  } catch (error) {
    console.error('Get testing encounters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single testing encounter
router.get('/encounter/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const encounter = await db.TestingEncounter.findByPk(id, {
      include: [
        { model: db.Patient, attributes: ['id', 'first_name', 'last_name', 'contact_number', 'status', 'birth_date'] },
        { model: db.User, as: 'User', attributes: ['id', 'username'] }
      ]
    });
    
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== encounter.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(encounter);
  } catch (error) {
    console.error('Get testing encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update encounter (admin only)
router.put('/encounter/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const encounter = await db.TestingEncounter.findByPk(id);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    const oldData = encounter.toJSON();
    await encounter.update(updates);
    
    const hashData = JSON.stringify({
      id: encounter.id,
      patient_id: encounter.patient_id,
      staff_id: encounter.staff_id,
      pretest_counseling: encounter.pretest_counseling,
      hiv_test: encounter.hiv_test,
      posttest_counseling: encounter.posttest_counseling,
      referral: encounter.referral,
      timestamp: encounter.created_at
    });
    encounter.blockchain_hash = crypto.createHash('sha256').update(hashData).digest('hex');
    await encounter.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'TestingEncounter',
      entity_id: encounter.id,
      old_data: oldData,
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(encounter);
  } catch (error) {
    console.error('Update testing encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;