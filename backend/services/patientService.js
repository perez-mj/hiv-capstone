// backend/services/patientService.js
const db = require('../models');
const { Op } = require('sequelize');
const patientCodeService = require('./patientCodeService');
const blockchainService = require('./blockchainService');
const audit = require('../utils/audit');
const { hmac } = require('../utils/crypto');

class PatientService {

  // ---------- READ ----------
  async getPatients({ page = 1, limit = 20, search = '', includeUser = true, actorId = null, req = null }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      // NOTE: with encryption, name search is exact-only via hash columns.
      // patient_facility_code stays plaintext and supports LIKE.
      where[Op.or] = [
        { patient_facility_code: { [Op.like]: `%${search}%` } },
        { first_name_hash: hmac(search) },
        { last_name_hash: hmac(search) },
        { contact_number_hash: hmac(search) }
      ];
    }

    const include = [];
    if (includeUser) {
      include.push({ model: db.User, as: 'User', attributes: ['id', 'username', 'email'] });
    }

    const { count, rows } = await db.Patient.findAndCountAll({
      where, include, limit, offset,
      order: [['created_at', 'DESC']]
    });

    audit.write({
      userId: actorId,
      action: 'LIST',
      entityType: 'Patient',
      metadata: { search, page, limit, resultCount: count },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return { items: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async searchPatients(query, limit = 10, actorId = null, req = null) {
    const rows = await db.Patient.findAll({
      where: {
        [Op.or]: [
          { patient_facility_code: { [Op.like]: `%${query}%` } }
        ]
      },
      include: [{ model: db.User, as: 'User', attributes: ['id', 'username', 'email'] }],
      limit,
      order: [['patient_facility_code', 'ASC']]
    });

    audit.write({
      userId: actorId,
      action: 'SEARCH',
      entityType: 'Patient',
      metadata: { query, limit, resultCount: rows.length },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return rows;
  }

  async getPatientById(id, includes = [], actorId = null, req = null) {
    const defaultIncludes = [
      { model: db.User, as: 'User', attributes: ['id', 'username', 'email'] }
    ];
    const patient = await db.Patient.findByPk(id, {
      include: [...defaultIncludes, ...includes]
    });
    if (!patient) throw new Error('Patient not found');

    audit.write({
      userId: actorId,
      action: 'READ',
      entityType: 'Patient',
      entityId: id,
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return patient;
  }

  async getPatientByContact(contactNumber) {
    if (!contactNumber) return null;
    return db.Patient.findOne({
      where: { contact_number_hash: hmac(contactNumber) }
    });
  }

  async getPatientByUserId(userId) {
    if (!userId) return null;
    return db.Patient.findOne({ where: { user_id: userId } });
  }

  async getPatientHistory(id, actorId = null, actorRole = null, req = null) {
    if (actorRole === 'patient') {
      const userPatient = await this.getPatientByUserId(actorId);
      if (!userPatient || userPatient.id !== parseInt(id)) {
        throw new Error('Access denied');
      }
    }

    const patient = await db.Patient.findByPk(id, {
      include: [
        {
          model: db.Appointment,
          as: 'Appointments',
          order: [['appointment_date', 'DESC']]
        }
      ]
    });

    if (!patient) throw new Error('Patient not found');

    audit.write({
      userId: actorId,
      action: 'READ_HISTORY',
      entityType: 'Patient',
      entityId: id,
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return patient;
  }

  async getPatientStats(actorId = null, req = null) {
    const total = await db.Patient.count();
    const active = await db.Patient.count({ where: { status: 'active' } });
    const inactive = await db.Patient.count({ where: { status: 'inactive' } });

    audit.write({
      userId: actorId,
      action: 'STATS',
      entityType: 'Patient',
      metadata: { total, active, inactive },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return { total, active, inactive };
  }

  // ---------- CREATE ----------
  async createPatient(patientData, userId = null, req = null) {
    const {
      create_portal_account,
      username,
      email,
      password,
      confirmPassword,   // ignore — validated on frontend
      ...patientFields
    } = patientData;

    // Duplicate contact check (outside txn is fine; hash is deterministic)
    const existing = await this.getPatientByContact(patientFields.contact_number);
    if (existing) throw new Error('Contact number already registered');

    // Pre-validate portal fields before hitting the DB
    if (create_portal_account) {
      if (!username || !email || !password) {
        throw new Error('Username, email, and password are required for portal account');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
    }

    let patient;
    let user = null;

    try {
      await db.sequelize.transaction(async (t) => {
        if (create_portal_account) {
          // User.beforeCreate hook hashes password_hash automatically
          user = await db.User.create(
            {
              username,
              email,
              password_hash: password,
              role: 'patient',
              is_active: true
            },
            { transaction: t }
          );
        }

        patient = await db.Patient.create(
          {
            ...patientFields,
            user_id: user ? user.id : null
          },
          { transaction: t }
        );
      });
    } catch (err) {
      // Translate unique constraint violations into friendly messages
      if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors?.[0]?.path;
        if (field === 'username') throw new Error('Username already taken');
        if (field === 'email')    throw new Error('Email already registered');
        if (field === 'contact_number_hash')
          throw new Error('Contact number already registered');
      }
      throw err;
    }

    // Anchor on-chain (best-effort — never throws; logs on failure)
    await blockchainService.anchorPatientCreate(patient, userId);

    audit.write({
      userId,
      action: 'CREATE',
      entityType: 'Patient',
      entityId: patient.id,
      newData: patient.toJSON(),
      metadata: user ? { portal_user_id: user.id } : undefined,
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return patient;
  }

  // ---------- UPDATE ----------
  async updatePatient(id, updates, userId = null, userRole = null, req = null) {
    const patient = await this.getPatientById(id);
    const oldData = patient.toJSON();

    if (userRole === 'patient') {
      const userPatient = await this.getPatientByUserId(userId);
      if (!userPatient || userPatient.id !== patient.id) throw new Error('Access denied');
      const allowed = ['address', 'contact_number', 'emergency_contact',
        'emergency_phone', 'guardian_name', 'guardian_contact'];
      const filtered = {};
      Object.keys(updates).forEach(k => {
        if (allowed.includes(k)) filtered[k] = updates[k] === '' ? null : updates[k];
      });
      updates = filtered;
    }

    const changedFields = Object.keys(updates);
    await patient.update(updates);

    // Anchor on-chain (best-effort)
    await blockchainService.anchorPatientUpdate(patient, userId, changedFields);

    audit.write({
      userId,
      action: 'UPDATE',
      entityType: 'Patient',
      entityId: patient.id,
      oldData,
      newData: patient.toJSON(),
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return { patient, oldData };
  }

  // ---------- DELETE ----------
  async deletePatient(id, hardDelete = false, userId = null, req = null) {
    const patient = await this.getPatientById(id);
    const oldData = patient.toJSON();

    if (hardDelete) {
      // Capture the instance reference before destroy so we can still anchor
      await patient.destroy({ force: true });

      // Anchor on-chain (best-effort). Uses `patient.id` from the in-memory
      // instance, which is still valid after destroy.
      await blockchainService.anchorPatientDelete(patient, userId, true);

      audit.write({
        userId, action: 'DELETE', entityType: 'Patient', entityId: id,
        oldData, ipAddress: req?.ip, userAgent: req?.get?.('User-Agent')
      });
      return { deleted: true, hard: true };
    }

    await patient.update({ status: 'inactive' });

    // Anchor on-chain (best-effort)
    await blockchainService.anchorPatientDelete(patient, userId, false);

    audit.write({
      userId, action: 'SOFT_DELETE', entityType: 'Patient', entityId: id,
      oldData, newData: { status: 'inactive' },
      ipAddress: req?.ip, userAgent: req?.get?.('User-Agent')
    });
    return { deleted: true, hard: false, status: 'inactive' };
  }

  // ---------- REGENERATE CODE ----------
  async regeneratePatientCode(id, userId = null, req = null) {
    const patient = await this.getPatientById(id);
    const oldCode = patient.patient_facility_code;
    const newCode = await patient.regenerateFacilityCode();
    await patient.save();

    // Anchor on-chain (best-effort) — dedicated event type for code regen
    await blockchainService.anchorSafe(
      'patient.code_regenerate',
      patient.id,
      {
        id: patient.id,
        old_code: oldCode,
        new_code: newCode,
        patient_facility_code: newCode,
        status_ct: patient.getDataValue('status'),
        updated_at: patient.updated_at
      },
      userId,
      { old_code: oldCode, new_code: newCode }
    );

    audit.write({
      userId, action: 'REGENERATE_CODE', entityType: 'FacilityCode',
      entityId: id,
      oldData: { patient_facility_code: oldCode },
      newData: { patient_facility_code: newCode },
      ipAddress: req?.ip, userAgent: req?.get?.('User-Agent')
    });

    return { patient, oldCode, newCode };
  }

  // ---------- CODE HELPERS ----------
  validateCode(code) {
    if (typeof patientCodeService.validateFacilityCode === 'function') {
      return patientCodeService.validateFacilityCode(code);
    }
    return /^[A-Z0-9-]+$/.test(code);
  }

  parseCode(code) {
    if (typeof patientCodeService.parseFacilityCode === 'function') {
      return patientCodeService.parseFacilityCode(code);
    }
    return null;
  }

  async bulkGenerateCodes(patients, actorId = null, req = null) {
    const results = await patientCodeService.bulkGenerateCodes(patients);

    // Anchor a single summary event (not one per patient) — keeps the stream
    // readable and avoids spamming N publishes for a bulk op.
    await blockchainService.anchorSafe(
      'patient.bulk_generate_codes',
      `batch-${Date.now()}`,
      {
        count: results.length,
        codes: results.map(r => r.patient_facility_code).filter(Boolean)
      },
      actorId,
      { count: results.length }
    );

    audit.write({
      userId: actorId,
      action: 'BULK_GENERATE_CODES',
      entityType: 'FacilityCode',
      metadata: { count: results.length },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });
    return results;
  }
}

module.exports = new PatientService();