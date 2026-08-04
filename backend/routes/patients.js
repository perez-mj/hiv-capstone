// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');

// List all patients (paginated)
router.get('/', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { contact_number: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await db.Patient.findAndCountAll({
      where,
      include: [{
        model: db.User,
        as: 'User',  // ← ADD THIS - must match the alias in your association
        attributes: ['id', 'username', 'email']
      }],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      items: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Create new patient
router.post('/', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const patientData = req.body;
    
    const existing = await db.Patient.findOne({
      where: { contact_number: patientData.contact_number }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Contact number already registered' });
    }
    
    const patient = await db.Patient.create(patientData);
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'Patient',
      entity_id: patient.id,
      new_data: patient.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search patients
router.get('/search/:query', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { query } = req.params;
    
    const patients = await db.Patient.findAll({
      where: {
        [Op.or]: [
          { first_name: { [Op.like]: `%${query}%` } },
          { last_name: { [Op.like]: `%${query}%` } },
          { contact_number: { [Op.like]: `%${query}%` } }
        ]
      },
      include: [{
        model: db.User,
        as: 'User',  // ← ADD THIS
        attributes: ['id', 'username', 'email']
      }],
      limit: 10
    });
    
    res.json(patients);
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get my patient profile
router.get('/me', auth, async (req, res) => {
  try {
    const patient = await db.Patient.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: db.User,
        as: 'User',  // ← ADD THIS
        attributes: ['username', 'email']
      }]
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single patient details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const patient = await db.Patient.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'User',  // ← ADD THIS
          attributes: ['id', 'username', 'email']
        },
        {
          model: db.Appointment,
          as: 'Appointments',  // ← ADD THIS if you have this alias
          limit: 5,
          order: [['appointment_date', 'DESC']]
        }
      ]
    });
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Check permissions
    if (req.user.role === 'patient') {
      const userPatient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      if (!userPatient || userPatient.id !== patient.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const patient = await db.Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Check permissions
    if (req.user.role === 'patient') {
      const userPatient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      if (!userPatient || userPatient.id !== patient.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Patients can only update certain fields
      const allowedUpdates = ['address', 'emergency_contact', 'emergency_phone'];
      Object.keys(updates).forEach(key => {
        if (!allowedUpdates.includes(key)) {
          delete updates[key];
        }
      });
    }
    
    const oldData = patient.toJSON();
    await patient.update(updates);
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'Patient',
      entity_id: patient.id,
      old_data: oldData,
      new_data: patient.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient history (all encounters)
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role === 'patient') {
      const userPatient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      if (!userPatient || userPatient.id !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const testingEncounters = await db.TestingEncounter.findAll({
      where: { patient_id: id },
      include: [{
        model: db.User,
        as: 'Staff',  // ← ADD THIS - for the staff who performed the test
        attributes: ['id', 'username']
      }],
      order: [['created_at', 'DESC']]
    });
    
    const treatmentEncounters = await db.TreatmentEncounter.findAll({
      where: { patient_id: id },
      include: [{
        model: db.User,
        as: 'Staff',  // ← ADD THIS - for the staff who provided treatment
        attributes: ['id', 'username']
      }],
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      testing: testingEncounters,
      treatment: treatmentEncounters
    });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;