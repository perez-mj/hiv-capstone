// backend/routes/treatment.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck, officeCheck } = require('../middleware/roleCheck');
const db = require('../models');
const crypto = require('crypto');
const socketService = require('../services/socketService');

// Save treatment encounter
router.post('/encounter', auth, roleCheck('staff', 'admin'), officeCheck(['treatment']), async (req, res) => {
  try {
    const { patient_id, consultation_notes, art_prescription, lab_results, adherence, next_appointment_date } = req.body;
    
    const patient = await db.Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    if (patient.status !== 'treatment') {
      return res.status(400).json({ error: 'Patient is not in treatment status' });
    }
    
    const encounter = await db.TreatmentEncounter.create({
      patient_id,
      staff_id: req.user.id,
      consultation_notes,
      art_prescription,
      lab_results,
      adherence,
      next_appointment_date
    });
    
    const hashData = JSON.stringify({
      id: encounter.id,
      patient_id: encounter.patient_id,
      staff_id: encounter.staff_id,
      consultation_notes: encounter.consultation_notes,
      art_prescription: encounter.art_prescription,
      lab_results: encounter.lab_results,
      adherence: encounter.adherence,
      next_appointment_date: encounter.next_appointment_date,
      timestamp: encounter.created_at
    });
    
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');
    encounter.blockchain_hash = hash;
    await encounter.save();
    
    if (next_appointment_date) {
      await db.Appointment.create({
        patient_id,
        office: 'treatment',
        appointment_date: next_appointment_date,
        time_slot: '09:00:00',
        type: 'scheduled',
        status: 'pending',
        notes: 'Follow-up appointment from treatment encounter'
      });
    }
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'TreatmentEncounter',
      entity_id: encounter.id,
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    // ✅ Use socketService directly
    socketService.emitEncounterCompleted('treatment', {
      patient_id,
      encounter_id: encounter.id
    });
    
    // Update queue
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
          office: 'treatment',
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
      
      const waitingCount = await db.QueueEntry.count({
        where: { status: 'waiting' },
        include: [{
          model: db.Queue,
          as: 'Queue',
          where: {
            office: 'treatment',
            date: today
          }
        }]
      });
      
      socketService.emitQueueUpdated('treatment', {
        queue_number: queueEntry.queue_number,
        waiting_count: waitingCount,
        completed_count: queue?.completed_count || 0
      });
    }
    
    res.status(201).json(encounter);
  } catch (error) {
    console.error('Create treatment encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Get all treatment encounters for patient
router.get('/encounters/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (!patient || patient.id !== parseInt(patientId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const encounters = await db.TreatmentEncounter.findAll({
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
    res.status(500).json({ error: error.message });
  }
});

// Get single treatment encounter
router.get('/encounter/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const encounter = await db.TreatmentEncounter.findByPk(id, {
      include: [
        { model: db.Patient, attributes: ['id', 'first_name', 'last_name', 'contact_number'] },
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
    res.status(500).json({ error: error.message });
  }
});

// Update encounter (admin only)
router.put('/encounter/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const encounter = await db.TreatmentEncounter.findByPk(id);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    const oldData = encounter.toJSON();
    await encounter.update(updates);
    
    const hashData = JSON.stringify({
      id: encounter.id,
      patient_id: encounter.patient_id,
      staff_id: encounter.staff_id,
      consultation_notes: encounter.consultation_notes,
      art_prescription: encounter.art_prescription,
      lab_results: encounter.lab_results,
      adherence: encounter.adherence,
      next_appointment_date: encounter.next_appointment_date,
      timestamp: encounter.created_at
    });
    encounter.blockchain_hash = crypto.createHash('sha256').update(hashData).digest('hex');
    await encounter.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'TreatmentEncounter',
      entity_id: encounter.id,
      old_data: oldData,
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(encounter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;