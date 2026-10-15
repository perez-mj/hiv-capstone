// backend/routes/encounters.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck, officeCheck } = require('../middleware/roleCheck');
const db = require('../models');
const { Op } = require('sequelize');

// Valid offices (matches the ENUM in the encounters table)
const VALID_OFFICES = ['testing', 'treatment'];

/**
 * Helper: resolve the patient id for the current user.
 * Patients can only act on their own profile; staff/admin can act on any.
 */
async function resolvePatientId(req) {
  if (req.user.role === 'patient') {
    const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
    if (!patient) return null;
    return patient.id;
  }
  return null; // staff/admin supply patient_id in body/query
}

/**
 * Helper: enforce that a staff user can only touch their own office.
 */
function enforceOffice(req, office) {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'staff') return req.user.office === office;
  return false;
}

// ---------------------------------------------------------------------------
// CREATE ENCOUNTER  (testing or treatment)
// POST /api/encounters
// Body: { patient_id?, office, transaction_type_id, data, notes?, occurred_at? }
// ---------------------------------------------------------------------------
router.post(
  '/',
  auth,
  roleCheck('staff', 'admin'),
  async (req, res) => {
    try {
      let { patient_id, office, transaction_type_id, data, notes, occurred_at } = req.body;

      // ----- validation -----
      if (!office || !VALID_OFFICES.includes(office)) {
        return res.status(400).json({ error: `office must be one of: ${VALID_OFFICES.join(', ')}` });
      }
      if (!enforceOffice(req, office)) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }
      if (!patient_id) {
        return res.status(400).json({ error: 'patient_id is required' });
      }
      if (!transaction_type_id) {
        return res.status(400).json({ error: 'transaction_type_id is required' });
      }
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'data must be a JSON object' });
      }

      // ----- verify patient exists -----
      const patient = await db.Patient.findByPk(patient_id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // ----- verify transaction type matches office & is active -----
      const transactionType = await db.TransactionType.findByPk(transaction_type_id);
      if (!transactionType) {
        return res.status(404).json({ error: 'Transaction type not found' });
      }
      if (transactionType.office !== office) {
        return res.status(400).json({
          error: `Transaction type "${transactionType.name}" belongs to ${transactionType.office}, not ${office}`,
        });
      }
      if (!transactionType.is_active) {
        return res.status(400).json({ error: 'Transaction type is not active' });
      }

      // ----- create -----
      const encounter = await db.Encounter.create({
        patient_id,
        staff_id: req.user.id,
        office,
        transaction_type_id,
        data,
        notes: notes || null,
        occurred_at: occurred_at ? new Date(occurred_at) : new Date(),
      });

      // ----- audit -----
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

      // ----- return with associations -----
      const created = await db.Encounter.findByPk(encounter.id, {
        include: [
          { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code'] },
          { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code'] },
          { model: db.User, as: 'Staff', attributes: ['id', 'username', 'office'] },
        ],
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Create encounter error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ---------------------------------------------------------------------------
// LIST ENCOUNTERS
// GET /api/encounters?office=testing&patient_id=1&from=2026-01-01&to=2026-01-31&include_voided=false
// ---------------------------------------------------------------------------
router.get('/', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const { office, patient_id, from, to, include_voided } = req.query;

    const where = {};

    // Office scoping
    if (office) {
      if (!VALID_OFFICES.includes(office)) {
        return res.status(400).json({ error: `office must be one of: ${VALID_OFFICES.join(', ')}` });
      }
      if (!enforceOffice(req, office)) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }
      where.office = office;
    } else if (req.user.role === 'staff') {
      // staff must always be scoped to their office
      where.office = req.user.office;
    }

    if (patient_id) where.patient_id = patient_id;

    if (from || to) {
      where.occurred_at = {};
      if (from) where.occurred_at[Op.gte] = new Date(from);
      if (to) where.occurred_at[Op.lte] = new Date(to);
    }

    if (include_voided !== 'true') {
      where.voided_at = null;
    }

    const encounters = await db.Encounter.findAll({
      where,
      include: [
        { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code'] },
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code'] },
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
// LIST MY ENCOUNTERS (patient self-service)
// GET /api/encounters/my?office=testing
// ---------------------------------------------------------------------------
router.get('/my', auth, async (req, res) => {
  try {
    const patientId = await resolvePatientId(req);
    if (!patientId) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

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
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code'] },
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
// GET /api/encounters/:id
// ---------------------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const encounter = await db.Encounter.findByPk(req.params.id, {
      include: [
        { model: db.Patient, as: 'Patient', attributes: ['id', 'first_name', 'last_name', 'patient_facility_code', 'birth_date', 'gender'] },
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code', 'estimated_duration_minutes'] },
        { model: db.User, as: 'Staff', attributes: ['id', 'username', 'office'] },
      ],
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    // ---- authorization ----
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
// UPDATE ENCOUNTER (staff/admin only, cannot edit voided encounters)
// PUT /api/encounters/:id
// Body: { data?, notes?, transaction_type_id? }
// ---------------------------------------------------------------------------
router.put('/:id', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const encounter = await db.Encounter.findByPk(req.params.id);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    if (!enforceOffice(req, encounter.office)) {
      return res.status(403).json({ error: 'Access denied to this office' });
    }
    if (encounter.voided_at) {
      return res.status(400).json({ error: 'Cannot edit a voided encounter' });
    }

    const oldData = encounter.toJSON();
    const { data, notes, transaction_type_id } = req.body;

    if (data !== undefined) {
      if (typeof data !== 'object' || data === null) {
        return res.status(400).json({ error: 'data must be a JSON object' });
      }
      encounter.data = data;
    }
    if (notes !== undefined) encounter.notes = notes;
    if (transaction_type_id !== undefined) {
      const tt = await db.TransactionType.findByPk(transaction_type_id);
      if (!tt) return res.status(404).json({ error: 'Transaction type not found' });
      if (tt.office !== encounter.office) {
        return res.status(400).json({ error: 'Transaction type does not match encounter office' });
      }
      encounter.transaction_type_id = transaction_type_id;
    }

    await encounter.save();

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
        { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code'] },
        { model: db.User, as: 'Staff', attributes: ['id', 'username'] },
      ],
    });

    res.json(updated);
  } catch (error) {
    console.error('Update encounter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// VOID ENCOUNTER (soft delete) — staff/admin only
// PUT /api/encounters/:id/void
// Body: { reason }
// ---------------------------------------------------------------------------
router.put('/:id/void', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    const encounter = await db.Encounter.findByPk(req.params.id);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    if (!enforceOffice(req, encounter.office)) {
      return res.status(403).json({ error: 'Access denied to this office' });
    }
    if (encounter.voided_at) {
      return res.status(400).json({ error: 'Encounter is already voided' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Void reason is required' });
    }

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
// OFFICE-SCOPED CONVENIENCE ROUTES
// These let the frontend hit /api/encounters/testing and /api/encounters/treatment
// ---------------------------------------------------------------------------

/**
 * GET /api/encounters/office/:office
 * Query: patient_id, from, to, include_voided
 */
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
          { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code'] },
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

/**
 * POST /api/encounters/office/:office
 * Body: { patient_id, transaction_type_id, data, notes? }
 * Convenience wrapper so the office is taken from the URL.
 */
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
      if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
      if (!transaction_type_id) return res.status(400).json({ error: 'transaction_type_id is required' });
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data must be a JSON object' });

      const patient = await db.Patient.findByPk(patient_id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const tt = await db.TransactionType.findByPk(transaction_type_id);
      if (!tt) return res.status(404).json({ error: 'Transaction type not found' });
      if (tt.office !== office) {
        return res.status(400).json({ error: `Transaction type belongs to ${tt.office}, not ${office}` });
      }
      if (!tt.is_active) return res.status(400).json({ error: 'Transaction type is not active' });

      const encounter = await db.Encounter.create({
        patient_id,
        staff_id: req.user.id,
        office,
        transaction_type_id,
        data,
        notes: notes || null,
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
          { model: db.TransactionType, as: 'TransactionType', attributes: ['id', 'name', 'office', 'color_code'] },
          { model: db.User, as: 'Staff', attributes: ['id', 'username'] },
        ],
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Create office encounter error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;