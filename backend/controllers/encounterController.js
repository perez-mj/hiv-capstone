// controllers/encounterController.js
const Encounter = require('../models/Encounter');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginated } = require('../utils/responseHandler');
const { calculateAgeAtDate } = require('../utils/helpers');
const blockchainAuditService = require('../services/blockchainAuditService');

const encounterController = {
  // Get all encounters with filters
  async getAllEncounters(req, res, next) {
    try {
      const { page = 1, limit = 100, patient_id, staff_id, type, start_date, end_date, search } = req.query;
      const offset = (page - 1) * limit;

      const filters = { patient_id, staff_id, type, start_date, end_date, search };
      const encounters = await Encounter.findAll(filters, { limit, offset });
      const total = await Encounter.count(filters);
      const summary = await Encounter.getSummary();

      // Add patient age at time of encounter
      const safeEncounters = Array.isArray(encounters) ? encounters : [];
      for (const encounter of safeEncounters) {
        if (encounter.date_of_birth) {
          encounter.patient_age_at_encounter = calculateAgeAtDate(
            encounter.date_of_birth,
            encounter.encounter_date
          );
        }
        delete encounter.date_of_birth;
      }

      sendPaginated(res, safeEncounters, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        total_pages: Math.ceil((total || 0) / parseInt(limit))
      }, 'Encounters retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get encounters by patient
  async getEncountersByPatient(req, res, next) {
    try {
      const patientId = req.params.patientId;
      const { page = 1, limit = 100, type, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      // Check patient access for PATIENT role
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findByUserId(req.user.id);
        if (!patient || patient.id !== parseInt(patientId)) {
          return sendBadRequest(res, 'Access denied');
        }
      }

      const filters = { type, start_date, end_date };
      const encounters = await Encounter.findByPatientId(patientId, filters, { limit, offset });
      const total = await Encounter.countByPatientId(patientId, filters);
      const summary = await Encounter.getPatientSummary(patientId);

      // FIX: Ensure encounters is an array
      const safeEncounters = Array.isArray(encounters) ? encounters : [];

      sendPaginated(res, safeEncounters, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        total_pages: Math.ceil((total || 0) / parseInt(limit))
      }, 'Patient encounters retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get today's encounters
  async getTodayEncounters(req, res, next) {
    try {
      const encounters = await Encounter.getTodayEncounters();
      const hourlyDistribution = await Encounter.getHourlyDistribution();
      const stats = await Encounter.getTodayStats();

      const grouped = {
        consultations: encounters.filter(e => e.type === 'CONSULTATION'),
        testing: encounters.filter(e => e.type === 'TESTING'),
        refills: encounters.filter(e => e.type === 'REFILL'),
        others: encounters.filter(e => e.type === 'OTHERS'),
        total: encounters.length
      };

      sendSuccess(res, 'Today\'s encounters retrieved successfully', {
        data: grouped,
        hourly_distribution: hourlyDistribution,
        stats
      });
    } catch (error) {
      next(error);
    }
  },

  // Get encounter types distribution
  async getEncounterTypes(req, res, next) {
    try {
      const types = await Encounter.getEncounterTypes();
      const monthlyTrends = await Encounter.getMonthlyTrends();

      sendSuccess(res, 'Encounter types retrieved successfully', {
        data: types,
        monthly_trends: monthlyTrends
      });
    } catch (error) {
      next(error);
    }
  },

  // Get encounter statistics
  async getStatistics(req, res, next) {
    try {
      const { period = 'month' } = req.query;
      const stats = await Encounter.getStatistics(period);

      sendSuccess(res, 'Encounter statistics retrieved successfully', {
        period,
        stats
      });
    } catch (error) {
      next(error);
    }
  },

  // Get single encounter by ID
  async getEncounterById(req, res, next) {
    try {
      const encounter = await Encounter.findById(req.params.id);

      if (!encounter) {
        return sendNotFound(res, 'Encounter not found');
      }

      // Calculate patient age at time of encounter
      if (encounter.date_of_birth) {
        encounter.patient_age_at_encounter = calculateAgeAtDate(
          encounter.date_of_birth,
          encounter.encounter_date
        );
      }
      delete encounter.date_of_birth;

      // Get previous encounters
      encounter.previous_encounters = await Encounter.getPreviousEncounters(
        encounter.patient_id,
        req.params.id,
        5
      );

      sendSuccess(res, 'Encounter retrieved successfully', encounter);
    } catch (error) {
      next(error);
    }
  },

  // Create new encounter
  async createEncounter(req, res, next) {
    try {
      const { patient_id, staff_id, encounter_date, type, notes } = req.body;

      // Check if patient exists
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return sendNotFound(res, 'Patient not found');
      }

      // Check if staff exists
      const staff = await Staff.findById(staff_id);
      if (!staff) {
        return sendNotFound(res, 'Staff member not found');
      }

      // Validate encounter date is not in future
      if (new Date(encounter_date) > new Date()) {
        return sendBadRequest(res, 'Encounter date cannot be in the future');
      }

      const encounterId = await Encounter.create({
        patient_id,
        staff_id,
        encounter_date,
        type,
        notes,
        created_by: req.user.id
      });

      const newEncounter = await Encounter.findById(encounterId);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'CREATE',
        'clinical_encounters',
        encounterId,
        patient_id,
        null,
        newEncounter,
        `Created ${type} encounter for patient ${patient.first_name} ${patient.last_name} with Dr./Staff ${staff.first_name} ${staff.last_name}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store patient record snapshot for encounter (important medical event)
      blockchainAuditService.storePatientRecord(
        patient_id,
        'CLINICAL_ENCOUNTER',
        {
          action: 'ENCOUNTER_CREATED',
          patient_id: patient_id,
          encounter_id: encounterId,
          encounter_type: type,
          encounter_date: encounter_date,
          staff_name: `${staff.first_name} ${staff.last_name}`,
          notes_summary: notes ? notes.substring(0, 200) : null,
          timestamp: new Date().toISOString(),
          created_by: req.user.username || 'system'
        },
        req
      ).catch(err => console.error('Patient record storage failed:', err));

      sendCreated(res, 'Clinical encounter created successfully', newEncounter);
    } catch (error) {
      next(error);
    }
  },

  // Update encounter
  async updateEncounter(req, res, next) {
    try {
      const existing = await Encounter.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Encounter not found');
      }

      const { encounter_date, type, notes } = req.body;

      // Validate encounter date is not in future if provided
      if (encounter_date && new Date(encounter_date) > new Date()) {
        return sendBadRequest(res, 'Encounter date cannot be in the future');
      }

      const updated = await Encounter.update(req.params.id, {
        encounter_date,
        type,
        notes,
        updated_by: req.user.id
      });

      if (!updated) {
        return sendBadRequest(res, 'No changes made');
      }

      const updatedEncounter = await Encounter.findById(req.params.id);

      // Track changes for blockchain
      const changedFields = {};
      if (encounter_date !== undefined && encounter_date !== existing.encounter_date) {
        changedFields.encounter_date = { old: existing.encounter_date, new: encounter_date };
      }
      if (type !== undefined && type !== existing.type) {
        changedFields.type = { old: existing.type, new: type };
      }
      if (notes !== undefined && notes !== existing.notes) {
        changedFields.notes = { old: existing.notes ? '[REDACTED]' : null, new: notes ? '[REDACTED]' : null };
      }

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'UPDATE',
        'clinical_encounters',
        req.params.id,
        existing.patient_id,
        existing,
        updatedEncounter,
        `Updated encounter ID ${req.params.id} - Changes: ${Object.keys(changedFields).join(', ')}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store patient record snapshot for significant encounter updates
      if (Object.keys(changedFields).length > 0) {
        blockchainAuditService.storePatientRecord(
          existing.patient_id,
          'ENCOUNTER_UPDATE',
          {
            action: 'ENCOUNTER_UPDATED',
            patient_id: existing.patient_id,
            encounter_id: req.params.id,
            changed_fields: Object.keys(changedFields),
            timestamp: new Date().toISOString(),
            updated_by: req.user.username || 'system'
          },
          req
        ).catch(err => console.error('Patient record storage failed:', err));
      }

      sendSuccess(res, 'Encounter updated successfully', updatedEncounter);
    } catch (error) {
      next(error);
    }
  },

  // Delete encounter
  async deleteEncounter(req, res, next) {
    try {
      const encounter = await Encounter.findById(req.params.id);
      if (!encounter) {
        return sendNotFound(res, 'Encounter not found');
      }

      const patient = await Patient.findById(encounter.patient_id);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'DELETE',
        'clinical_encounters',
        req.params.id,
        encounter.patient_id,
        encounter,
        null,
        `Deleted ${encounter.type} encounter for patient ${patient?.first_name} ${patient?.last_name}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store deletion record on blockchain
      blockchainAuditService.storePatientRecord(
        encounter.patient_id,
        'ENCOUNTER_DELETION',
        {
          action: 'ENCOUNTER_DELETED',
          patient_id: encounter.patient_id,
          encounter_id: req.params.id,
          encounter_type: encounter.type,
          encounter_date: encounter.encounter_date,
          deletion_reason: 'Manual deletion by staff',
          deleted_by: req.user.username || 'system',
          deletion_timestamp: new Date().toISOString()
        },
        req
      ).catch(err => console.error('Patient record storage failed:', err));

      await Encounter.delete(req.params.id);

      sendSuccess(res, 'Encounter deleted successfully', {
        deleted_encounter: {
          id: encounter.id,
          type: encounter.type,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
          encounter_date: encounter.encounter_date
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = encounterController;