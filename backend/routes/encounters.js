// backend/routes/encounters.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck, officeCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');
const encounterService = require('../services/encounterService');

const VALID_OFFICES = ['testing', 'treatment'];

async function resolvePatientId(req) {
  if (req.user.role === 'patient') {
    const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
    if (!patient) return null;
    return patient.id;
  }
  return null;
}

function enforceOffice(req, office) {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'staff') return req.user.office === office;
  return false;
}

// ---------------------------------------------------------------------------
// CREATE ENCOUNTER
// ---------------------------------------------------------------------------
router.post('/', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { patient_id, office, transaction_type_id, data, notes, occurred_at } = req.body;

    if (!office || !VALID_OFFICES.includes(office)) {
      return res.status(400).json({ error: `office must be one of: ${VALID_OFFICES.join(', ')}` });
    }
    if (!enforceOffice(req, office)) {
      return res.status(403).json({ error: 'Access denied to this office' });
    }
    if (!transaction_type_id) {
      return res.status(400).json({ error: 'transaction_type_id is required' });
    }
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data must be a JSON object' });
    }

    // ← CHANGED: delegate to service (patient lookup, TT checks, schema validation)
    const encounter = await encounterService.create({
      patient_id,
      staff_id: req.user.id,
      office,
      transaction_type_id,
      data,
      notes,
      occurred_at,
    });

    await db.AuditLog.create({
      user_id: req.user.id,
      encounter_id: encounter.id,
      action: 'CREATE',
      entity_type: 'Encounter',
      entity_id: String(encounter.id),
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    const created = await db.Encounter.findByPk(encounter.id, {
      include: [
        { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code'] },
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'schema_version'] },
        { model: db.User, as: 'Staff', attributes: ['id', 'username', 'office'] },
      ],
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Create encounter error:', error);
    res.status(error.status || 500).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }
});

// ---------------------------------------------------------------------------
// LIST ENCOUNTERS
// ---------------------------------------------------------------------------
router.get('/', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { office, patient_id, from, to, include_voided } = req.query;
    const where = {};

    if (office) {
      if (!VALID_OFFICES.includes(office)) {
        return res.status(400).json({ error: `office must be one of: ${VALID_OFFICES.join(', ')}` });
      }
      if (!enforceOffice(req, office)) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }
      where.office = office;
    } else if (req.user.role === 'staff') {
      where.office = req.user.office;
    }

    if (patient_id) where.patient_id = patient_id;
    if (from || to) {
      where.occurred_at = {};
      if (from) where.occurred_at[Op.gte] = new Date(from);
      if (to) where.occurred_at[Op.lte] = new Date(to);
    }
    if (include_voided !== 'true') where.voided_at = null;

    const encounters = await db.Encounter.findAll({
      where,
      include: [
        { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code'] },
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'estimated_duration_minutes', 'checklist_schema', 'schema_version'] },
        { model: db.User, as: 'Staff', attributes: ['id', 'username', 'office'] },
      ],
      order: [['occurred_at', 'DESC']],
    });

    res.json(encounters);
  } catch (error) {
    console.error('List encounters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// LIST MY ENCOUNTERS
// ---------------------------------------------------------------------------
router.get('/my', auth, async (req, res) => {
  try {
    const patientId = await resolvePatientId(req);
    if (!patientId) return res.status(404).json({ error: 'Patient profile not found' });

    const where = { patient_id: patientId, voided_at: null };
    if (req.query.office) {
      if (!VALID_OFFICES.includes(req.query.office)) {
        return res.status(400).json({ error: `office must be one of: ${VALID_OFFICES.join(', ')}` });
      }
      where.office = req.query.office;
    }

    const encounters = await db.Encounter.findAll({
      where,
      include: [
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'schema_version'] },
        { model: db.User, as: 'Staff', attributes: ['id', 'username'] },
      ],
      order: [['occurred_at', 'DESC']],
    });

    res.json(encounters);
  } catch (error) {
    console.error('Get my encounters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET ONE ENCOUNTER
// ---------------------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const encounter = await db.Encounter.findByPk(req.params.id, {
      include: [
        { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code', 'birth_date', 'gender'] },
        {
          model: db.TransactionType,
          as: 'TransactionType',
          attributes: ['id', 'name', 'office', 'color_code', 'estimated_duration_minutes', 'schema_version', 'checklist_schema'],
        },
        { model: db.User, as: 'Staff', attributes: ['id', 'username', 'office'] },
      ],
    });

    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    if (req.user.role === 'patient') {
      const patientId = await resolvePatientId(req);
      if (!patientId || patientId !== encounter.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'staff') {
      if (req.user.office !== encounter.office) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }
    }

    res.json(encounter);
  } catch (error) {
    console.error('Get encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// UPDATE ENCOUNTER
// ---------------------------------------------------------------------------
router.put('/:id', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const encounter = await db.Encounter.findByPk(req.params.id);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
    if (!enforceOffice(req, encounter.office)) {
      return res.status(403).json({ error: 'Access denied to this office' });
    }
    if (encounter.voided_at) {
      return res.status(400).json({ error: 'Cannot edit a voided encounter' });
    }

    const { data, notes, transaction_type_id } = req.body;

    // ← CHANGED: validation + save via service
    const { oldData } = await encounterService.update(encounter, {
      data,
      notes,
      transaction_type_id,
    });

    await db.AuditLog.create({
      user_id: req.user.id,
      encounter_id: encounter.id,
      action: 'UPDATE',
      entity_type: 'Encounter',
      entity_id: String(encounter.id),
      old_data: oldData,
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    const updated = await db.Encounter.findByPk(encounter.id, {
      include: [
        { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name'] },
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'schema_version'] },
        { model: db.User, as: 'Staff', attributes: ['id', 'username'] },
      ],
    });

    res.json(updated);
  } catch (error) {
    console.error('Update encounter error:', error);
    res.status(error.status || 500).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }
});

// ---------------------------------------------------------------------------
// VOID ENCOUNTER
// ---------------------------------------------------------------------------
router.put('/:id/void', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const encounter = await db.Encounter.findByPk(req.params.id);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
    if (!enforceOffice(req, encounter.office)) {
      return res.status(403).json({ error: 'Access denied to this office' });
    }
    if (encounter.voided_at) {
      return res.status(400).json({ error: 'Encounter is already voided' });
    }

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Void reason is required' });

    const oldData = encounter.toJSON();
    encounter.voided_at = new Date();
    encounter.voided_by = req.user.id;
    encounter.void_reason = reason;
    await encounter.save();

    await db.AuditLog.create({
      user_id: req.user.id,
      encounter_id: encounter.id,
      action: 'VOID',
      entity_type: 'Encounter',
      entity_id: String(encounter.id),
      old_data: oldData,
      new_data: encounter.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    res.json({ success: true, encounter });
  } catch (error) {
    console.error('Void encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// OFFICE-SCOPED ROUTES
// ---------------------------------------------------------------------------
router.get(
  '/office/:office',
  auth,
  roleCheck('staff', 'admin'),
  officeCheck(VALID_OFFICES),
  async (req, res) => {
    try {
      const { office } = req.params;
      const { patient_id, from, to, include_voided } = req.query;

      if (!enforceOffice(req, office)) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }

      const where = { office };
      if (patient_id) where.patient_id = patient_id;
      if (from || to) {
        where.occurred_at = {};
        if (from) where.occurred_at[Op.gte] = new Date(from);
        if (to) where.occurred_at[Op.lte] = new Date(to);
      }
      if (include_voided !== 'true') where.voided_at = null;

      const encounters = await db.Encounter.findAll({
        where,
        include: [
          { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code'] },
          { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'schema_version'] },
          { model: db.User, as: 'Staff', attributes: ['id', 'username'] },
        ],
        order: [['occurred_at', 'DESC']],
      });

      res.json(encounters);
    } catch (error) {
      console.error('List office encounters error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/office/:office',
  auth,
  roleCheck('staff', 'admin'),
  officeCheck(VALID_OFFICES),
  async (req, res) => {
    try {
      const { office } = req.params;
      if (!enforceOffice(req, office)) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }

      const { patient_id, transaction_type_id, data, notes } = req.body;
      if (!transaction_type_id) return res.status(400).json({ error: 'transaction_type_id is required' });
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data must be a JSON object' });

      // ← CHANGED: delegate to service
      const encounter = await encounterService.create({
        patient_id,
        staff_id: req.user.id,
        office,
        transaction_type_id,
        data,
        notes,
        occurred_at: new Date(),
      });

      await db.AuditLog.create({
        user_id: req.user.id,
        encounter_id: encounter.id,
        action: 'CREATE',
        entity_type: 'Encounter',
        entity_id: String(encounter.id),
        new_data: encounter.toJSON(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      });

      const created = await db.Encounter.findByPk(encounter.id, {
        include: [
          { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name'] },
          { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'schema_version'] },
          { model: db.User, as: 'Staff', attributes: ['id', 'username'] },
        ],
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Create office encounter error:', error);
      res.status(error.status || 500).json({
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
  }
);

module.exports = router;