// backend/services/patientService.js
const db = require('../models');
const { Op } = require('sequelize');
const patientCodeService = require('./patientCodeService');
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
        // add hash-based exact matches for name/contact if you want:
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

    // Audit the read (no PII in old/new — just metadata)
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

  // ---------- CREATE ----------
  async createPatient(patientData, userId = null, req = null) {
    const existing = await this.getPatientByContact(patientData.contact_number);
    if (existing) throw new Error('Contact number already registered');

    const patient = await db.Patient.create(patientData);

    audit.write({
      userId,
      action: 'CREATE',
      entityType: 'Patient',
      entityId: patient.id,
      newData: patient.toJSON(),   // sanitizer redacts PII
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

    await patient.update(updates);

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
      await patient.destroy({ force: true });
      audit.write({
        userId, action: 'DELETE', entityType: 'Patient', entityId: id,
        oldData, ipAddress: req?.ip, userAgent: req?.get?.('User-Agent')
      });
      return { deleted: true, hard: true };
    }

    await patient.update({ status: 'inactive' });
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

    audit.write({
      userId, action: 'REGENERATE_CODE', entityType: 'FacilityCode',
      entityId: id,
      oldData: { patient_facility_code: oldCode },
      newData: { patient_facility_code: newCode },
      ipAddress: req?.ip, userAgent: req?.get?.('User-Agent')
    });

    return { patient, oldCode, newCode };
  }
}

module.exports = new PatientService();