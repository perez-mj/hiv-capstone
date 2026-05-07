// backend/controllers/patientController.js
const Patient = require('../models/Patient');
const User = require('../models/User');
const Encounter = require('../models/Encounter');
const { generatePatientCode, hashPassword } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginated } = require('../utils/responseHandler');
const { Parser } = require('json2csv');
const blockchainAuditService = require('../services/blockchainAuditService');

const patientController = {
  // Get all patients with pagination and filters
  async getAllPatients(req, res, next) {
    try {
      const { page = 1, limit = 100, search, hiv_status, sex, sort_by, sort_order } = req.query;
      const offset = (page - 1) * limit;

      const filters = { search, hiv_status, sex, sort_by, sort_order };
      const patients = await Patient.findAll(filters, { limit, offset });
      const total = await Patient.count(filters);

      // FIX: Ensure patients is an array
      const safePatients = Array.isArray(patients) ? patients : [];

      // Add additional data for each patient
      for (const patient of safePatients) {
        patient.latest_lab_results = await Patient.getLatestLabResults(patient.id);
        patient.upcoming_appointments = await Patient.getUpcomingAppointments(patient.id);
        patient.last_visit = await Encounter.getLastVisitDate(patient.id);
      }

      sendPaginated(res, safePatients, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        total_pages: Math.ceil((total || 0) / parseInt(limit))
      }, 'Patients retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get current patient's own profile
  async getMyProfile(req, res, next) {
    try {
      if (req.user.role !== 'PATIENT') {
        return sendBadRequest(res, 'Access denied. Patient access only.');
      }

      const patient = await Patient.findByUserId(req.user.id);

      if (!patient) {
        return sendNotFound(res, 'Patient profile not found');
      }

      // Get additional data using model methods
      patient.recent_lab_results = await Patient.getLatestLabResults(patient.id);
      patient.upcoming_appointments = await Patient.getUpcomingAppointments(patient.id);
      patient.current_queue = await Patient.getCurrentQueue(patient.id);
      patient.statistics = await Patient.getPatientStatistics(patient.id);

      sendSuccess(res, 'Patient profile retrieved successfully', patient);
    } catch (error) {
      next(error);
    }
  },

  // Update current patient's own profile
  async updateMyProfile(req, res, next) {
    try {
      if (req.user.role !== 'PATIENT') {
        return sendBadRequest(res, 'Access denied. Patient access only.');
      }

      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) {
        return sendNotFound(res, 'Patient profile not found');
      }

      const { first_name, middle_name, last_name, date_of_birth, sex, contact_number, address } = req.body;

      if (!first_name || !last_name || !date_of_birth || !sex) {
        return sendBadRequest(res, 'First name, last name, date of birth, and sex are required');
      }

      const oldValues = { ...patient };

      const updated = await Patient.update(patient.id, {
        first_name,
        middle_name,
        last_name,
        date_of_birth,
        sex,
        contact_number,
        address,
        updated_by: req.user.id
      });

      if (!updated) {
        return sendBadRequest(res, 'No changes made');
      }

      const updatedPatient = await Patient.findById(patient.id);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'UPDATE',
        'patients',
        patient.id,
        patient.id,
        oldValues,
        updatedPatient,
        `Patient updated their own profile (ID: ${patient.id})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store patient record snapshot on blockchain
      blockchainAuditService.storePatientRecord(
        patient.id,
        'PROFILE_UPDATE',
        {
          action: 'PROFILE_UPDATED',
          patient_id: patient.id,
          patient_facility_code: updatedPatient.patient_facility_code,
          updated_fields: Object.keys(req.body),
          updated_by: req.user.username || 'patient',
          timestamp: new Date().toISOString(),
          snapshot_data: updatedPatient
        },
        req
      ).catch(err => console.error('Patient record storage failed:', err));

      // Store verification snapshot
      const verificationService = require('../services/verificationService');
      await verificationService.storePatientSnapshot(patient.id, req).catch(err =>
        console.error('Failed to store verification snapshot after profile update:', err)
      );

      sendSuccess(res, 'Profile updated successfully', updatedPatient);
    } catch (error) {
      next(error);
    }
  },

  // Get patient statistics overview
  async getStatistics(req, res, next) {
    try {
      const stats = await Patient.getStatistics();
      sendSuccess(res, 'Patient statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  },

  // Search patients (for dropdown/autocomplete)
  async searchPatients(req, res, next) {
    try {
      const searchTerm = req.query.q || '';
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);

      const patients = await Patient.search(searchTerm, limit);
      sendSuccess(res, 'Patients retrieved successfully', patients);
    } catch (error) {
      next(error);
    }
  },

  // Get single patient by ID
  async getPatientById(req, res, next) {
    try {
      const patient = await Patient.findById(req.params.id);

      if (!patient) {
        return sendNotFound(res, 'Patient not found');
      }

      patient.medical_history = await Patient.getMedicalHistory(patient.id);

      sendSuccess(res, 'Patient retrieved successfully', patient);
    } catch (error) {
      next(error);
    }
  },

  // Create new patient
  async createPatient(req, res, next) {
    try {
      const {
        patient_facility_code,
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        sex,
        address,
        contact_number,
        hiv_status,
        diagnosis_date,
        art_start_date,
        latest_cd4_count,
        latest_viral_load,
        create_user_account = false,
        email,
        username,
        password
      } = req.body;

      // Auto-set diagnosis date if patient is reactive and no diagnosis date provided
      let finalDiagnosisDate = diagnosis_date;
      if (hiv_status === 'REACTIVE' && !diagnosis_date) {
        finalDiagnosisDate = new Date().toISOString().split('T')[0];
      }

      // Validate ART start date relative to diagnosis date
      if (art_start_date && finalDiagnosisDate && new Date(art_start_date) < new Date(finalDiagnosisDate)) {
        return sendBadRequest(res, 'ART start date cannot be before diagnosis date');
      }

      // Generate facility code if not provided
      let finalPatientCode = patient_facility_code;
      if (!finalPatientCode) {
        const registrationYear = new Date().getFullYear();
        finalPatientCode = await generatePatientCode(
          first_name,
          middle_name,
          last_name,
          hiv_status,
          registrationYear
        );
      } else {
        const exists = await Patient.checkFacilityCodeExists(finalPatientCode);
        if (exists) {
          let counter = 1;
          let newCode = `${finalPatientCode}${counter}`;
          while (await Patient.checkFacilityCodeExists(newCode)) {
            counter++;
            newCode = `${finalPatientCode}${counter}`;
          }
          finalPatientCode = newCode;
        }
      }

      let user_id = null;

      // Create user account if requested
      if (create_user_account) {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
          return sendBadRequest(res, 'Username already exists');
        }

        if (email) {
          const existingEmail = await User.findByEmail(email);
          if (existingEmail) {
            return sendBadRequest(res, 'Email already exists');
          }
        }

        const hashedPassword = await hashPassword(password);
        user_id = await User.create({
          username,
          password_hash: hashedPassword,
          email,
          role: 'PATIENT'
        });
      }

      const newPatientData = {
        patient_facility_code: finalPatientCode,
        user_id,
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        sex,
        address,
        contact_number,
        hiv_status,
        diagnosis_date: finalDiagnosisDate,
        art_start_date,
        latest_cd4_count,
        latest_viral_load,
        created_by: req.user.id,
        updated_by: req.user.id
      };

      const patientId = await Patient.create(newPatientData);

      // IMPORTANT: Get the COMPLETE patient object from database (includes id and all fields)
      const newPatient = await Patient.findById(patientId);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'CREATE',
        'patients',
        patientId,
        patientId,
        null,
        newPatient,
        `Created new patient: ${first_name} ${last_name} (Code: ${finalPatientCode})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store full patient record snapshot on blockchain using the COMPLETE patient object
      blockchainAuditService.storePatientRecord(
        patientId,
        'ENROLLMENT',
        {
          action: 'PATIENT_CREATED',
          patient_id: patientId,
          patient_facility_code: finalPatientCode,
          hiv_status: hiv_status,
          diagnosis_date: finalDiagnosisDate,
          art_start_date: art_start_date,
          created_by: req.user.username || 'system',
          enrollment_data: newPatient  // Use the COMPLETE patient object from database
        },
        req
      ).catch(err => console.error('Patient record storage failed:', err));

      sendCreated(res, 'Patient created successfully', newPatient);
    } catch (error) {
      next(error);
    }
  },

  // Update patient
  async updatePatient(req, res, next) {
    try {
      const patientId = req.params.id;
      const existingPatient = await Patient.findById(patientId);

      if (!existingPatient) {
        return sendNotFound(res, 'Patient not found');
      }

      const {
        patient_facility_code,
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        sex,
        address,
        contact_number,
        hiv_status,
        diagnosis_date,
        art_start_date,
        latest_cd4_count,
        latest_viral_load
      } = req.body;

      // Auto-set diagnosis date if status changed to reactive
      let finalDiagnosisDate = diagnosis_date;
      if (hiv_status === 'REACTIVE' && !diagnosis_date && existingPatient.hiv_status !== 'REACTIVE') {
        finalDiagnosisDate = new Date().toISOString().split('T')[0];
      }

      // Validate ART start date
      if (art_start_date && (finalDiagnosisDate || existingPatient.diagnosis_date)) {
        const diagDate = finalDiagnosisDate || existingPatient.diagnosis_date;
        if (diagDate && new Date(art_start_date) < new Date(diagDate)) {
          return sendBadRequest(res, 'ART start date cannot be before diagnosis date');
        }
      }

      // Check facility code uniqueness
      if (patient_facility_code && patient_facility_code !== existingPatient.patient_facility_code) {
        const exists = await Patient.checkFacilityCodeExists(patient_facility_code, patientId);
        if (exists) {
          return sendBadRequest(res, 'Patient facility code already exists');
        }
      }

      const updateData = {
        patient_facility_code,
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        sex,
        address,
        contact_number,
        hiv_status,
        diagnosis_date: finalDiagnosisDate,
        art_start_date,
        latest_cd4_count,
        latest_viral_load,
        updated_by: req.user.id
      };

      const updated = await Patient.update(patientId, updateData);

      if (!updated) {
        return sendBadRequest(res, 'No changes made');
      }

      const updatedPatient = await Patient.findById(patientId);

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'UPDATE',
        'patients',
        patientId,
        patientId,
        existingPatient,
        updatedPatient,
        `Updated patient record: ${existingPatient.first_name} ${existingPatient.last_name}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Track specific changes for blockchain
      const changedFields = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== existingPatient[key]) {
          changedFields[key] = {
            old: existingPatient[key],
            new: updateData[key]
          };
        }
      });

      // Store patient record snapshot if important fields changed
      const importantFields = ['hiv_status', 'diagnosis_date', 'art_start_date', 'latest_cd4_count', 'latest_viral_load'];
      const hasImportantChanges = Object.keys(changedFields).some(field => importantFields.includes(field));

      if (hasImportantChanges) {
        blockchainAuditService.storePatientRecord(
          patientId,
          'MEDICAL_UPDATE',
          {
            action: 'PATIENT_UPDATED',
            patient_id: patientId,
            changed_fields: changedFields,
            hiv_status_changed: changedFields.hiv_status ? true : false,
            timestamp: new Date().toISOString(),
            updated_by: req.user.username || 'system',
            snapshot_data: updatedPatient
          },
          req
        ).catch(err => console.error('Patient record storage failed:', err));
      }

      // If hiv status changed to reactive, log that as a significant event
      if (changedFields.hiv_status && changedFields.hiv_status.new === 'REACTIVE') {
        blockchainAuditService.storePatientRecord(
          patientId,
          'HIV_STATUS_CHANGE',
          {
            action: 'HIV_STATUS_UPDATED',
            patient_id: patientId,
            previous_status: changedFields.hiv_status.old,
            new_status: changedFields.hiv_status.new,
            diagnosis_date: finalDiagnosisDate,
            timestamp: new Date().toISOString(),
            updated_by: req.user.username || 'system',
            snapshot_data: updatedPatient
          },
          req
        ).catch(err => console.error('HIV status change storage failed:', err));
      }

      // IMPORTANT: Store a verification snapshot after ANY update
      // This ensures future verifications will find a matching hash
      const verificationService = require('../services/verificationService');
      await verificationService.storePatientSnapshot(patientId, req).catch(err =>
        console.error('Failed to store verification snapshot after update:', err)
      );

      sendSuccess(res, 'Patient updated successfully', updatedPatient);
    } catch (error) {
      next(error);
    }
  },

  // Delete patient
  async deletePatient(req, res, next) {
    try {
      const patientId = req.params.id;
      const patient = await Patient.findById(patientId);

      if (!patient) {
        return sendNotFound(res, 'Patient not found');
      }

      // Check for future appointments using model method
      const hasFutureAppointments = await Patient.hasFutureAppointments(patientId);

      if (hasFutureAppointments) {
        return sendBadRequest(res, 'Cannot delete patient with future appointments. Please cancel appointments first.');
      }

      // Deactivate user account if exists
      if (patient.user_id) {
        await User.update(patient.user_id, { is_active: 0 });
      }

      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'DELETE',
        'patients',
        patientId,
        patientId,
        patient,
        null,
        `Deleted patient: ${patient.first_name} ${patient.last_name} (Code: ${patient.patient_facility_code})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store deletion record on blockchain (for legal/compliance)
      blockchainAuditService.storePatientRecord(
        patientId,
        'DELETION',
        {
          action: 'PATIENT_DELETED',
          patient_id: patientId,
          patient_facility_code: patient.patient_facility_code,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          deletion_reason: 'Manual deletion by staff',
          deleted_by: req.user.username || 'system',
          deletion_timestamp: new Date().toISOString(),
          snapshot_data: patient  // Store the patient data before deletion
        },
        req
      ).catch(err => console.error('Patient deletion record storage failed:', err));

      await Patient.delete(patientId);

      sendSuccess(res, 'Patient deleted successfully', {
        deleted_patient: {
          id: patient.id,
          patient_facility_code: patient.patient_facility_code,
          name: `${patient.first_name} ${patient.last_name}`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get patient summary
  async getPatientSummary(req, res, next) {
    try {
      const summary = await Patient.getPatientSummary(req.params.id);

      if (!summary) {
        return sendNotFound(res, 'Patient not found');
      }

      sendSuccess(res, 'Patient summary retrieved successfully', summary);
    } catch (error) {
      next(error);
    }
  },

  // Export patients to CSV
  async exportPatients(req, res, next) {
    try {
      const { search, hiv_status, sex } = req.query;

      const filters = { search, hiv_status, sex };
      const patients = await Patient.findAll(filters, { limit: 10000, offset: 0 });

      const exportData = patients.map(p => ({
        facility_code: p.patient_facility_code,
        first_name: p.first_name,
        last_name: p.last_name,
        middle_name: p.middle_name,
        date_of_birth: p.date_of_birth,
        sex: p.sex,
        address: p.address,
        contact_number: p.contact_number,
        hiv_status: p.hiv_status,
        diagnosis_date: p.diagnosis_date,
        art_start_date: p.art_start_date,
        cd4_count: p.latest_cd4_count,
        viral_load: p.latest_viral_load,
        enrollment_date: p.created_at
      }));

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(exportData);

      // Log export action to blockchain
      blockchainAuditService.logAction(
        'EXPORT',
        'patients',
        null,
        null,
        null,
        { export_count: exportData.length, filters },
        `Exported ${exportData.length} patients with filters: ${JSON.stringify(filters)}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      res.header('Content-Type', 'text/csv');
      res.attachment(`patients-export-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  },

  async linkUserAccount(req, res, next) {
    try {
      const patientId = req.params.id;
      const { user_id } = req.body;

      if (!user_id) {
        return sendBadRequest(res, 'user_id is required');
      }

      // Check if user exists
      const user = await User.findById(user_id);
      if (!user) {
        return sendNotFound(res, 'User account not found');
      }

      // Check if user is already linked to another patient
      const existingPatientWithUser = await Patient.findByUserId(user_id);
      if (existingPatientWithUser) {
        return sendBadRequest(res, 'User account is already linked to another patient');
      }

      // Get patient before linking for audit
      const existingPatient = await Patient.findById(patientId);
      if (!existingPatient) {
        return sendNotFound(res, 'Patient not found');
      }

      // Link the user account to the patient using the model method
      const updatedPatient = await Patient.linkUserAccount(patientId, user_id, req.user.id);

      // Blockchain audit logging
      blockchainAuditService.logAction(
        'LINK',
        'patients',
        patientId,
        patientId,
        { previous_user_id: existingPatient.user_id },
        { new_user_id: user_id },
        `Linked user account ${user.username} to patient ${existingPatient.first_name} ${existingPatient.last_name}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      // Store patient snapshot after linking
      blockchainAuditService.storePatientRecord(
        patientId,
        'ACCOUNT_LINK',
        {
          action: 'ACCOUNT_LINKED',
          patient_id: patientId,
          user_id: user_id,
          username: user.username,
          linked_by: req.user.username || 'system',
          timestamp: new Date().toISOString(),
          snapshot_data: updatedPatient
        },
        req
      ).catch(err => console.error('Patient record storage failed:', err));

      sendSuccess(res, 'User account linked successfully', updatedPatient);
    } catch (error) {
      next(error);
    }
  },

  // Import patients from CSV
  async importPatients(req, res, next) {
    try {
      const { patients } = req.body;

      if (!Array.isArray(patients) || patients.length === 0) {
        return sendBadRequest(res, 'Invalid or empty patient data');
      }

      const results = { success: 0, failed: 0, errors: [] };
      const importedPatients = [];

      for (const patientData of patients) {
        try {
          if (patientData.hiv_status === 'REACTIVE' && !patientData.diagnosis_date) {
            patientData.diagnosis_date = new Date().toISOString().split('T')[0];
          }

          let patientCode = patientData.patient_facility_code;

          if (!patientCode) {
            const registrationYear = new Date().getFullYear();
            patientCode = await generatePatientCode(
              null,
              patientData.first_name,
              patientData.middle_name,
              patientData.last_name,
              patientData.hiv_status,
              registrationYear
            );
          } else {
            let exists = await Patient.checkFacilityCodeExists(patientCode);
            if (exists) {
              let counter = 2;
              let newCode = `${patientCode}${counter}`;
              while (await Patient.checkFacilityCodeExists(newCode)) {
                counter++;
                newCode = `${patientCode}${counter}`;
              }
              patientCode = newCode;
            }
          }

          const patientId = await Patient.create({
            patient_facility_code: patientCode,
            user_id: null,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            middle_name: patientData.middle_name,
            date_of_birth: patientData.date_of_birth,
            sex: patientData.sex,
            address: patientData.address,
            contact_number: patientData.contact_number,
            hiv_status: patientData.hiv_status,
            diagnosis_date: patientData.diagnosis_date,
            art_start_date: patientData.art_start_date,
            latest_cd4_count: patientData.latest_cd4_count ? parseInt(patientData.latest_cd4_count) : null,
            latest_viral_load: patientData.latest_viral_load ? parseInt(patientData.latest_viral_load) : null,
            created_by: req.user.id,
            updated_by: req.user.id
          });

          // Get the complete patient object
          const newPatient = await Patient.findById(patientId);
          importedPatients.push(newPatient);

          // Store on blockchain for each imported patient
          blockchainAuditService.storePatientRecord(
            patientId,
            'ENROLLMENT',
            {
              action: 'PATIENT_IMPORTED',
              patient_id: patientId,
              patient_facility_code: patientCode,
              hiv_status: patientData.hiv_status,
              diagnosis_date: patientData.diagnosis_date,
              art_start_date: patientData.art_start_date,
              imported_by: req.user.username || 'system',
              import_source: 'CSV',
              timestamp: new Date().toISOString(),
              enrollment_data: newPatient
            },
            req
          ).catch(err => console.error('Patient record storage failed for imported patient:', err));

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            patient: `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim() || 'Unknown patient',
            error: err.message
          });
        }
      }

      // Log import results to blockchain
      blockchainAuditService.logAction(
        'IMPORT',
        'patients',
        null,
        null,
        null,
        {
          success_count: results.success,
          failed_count: results.failed,
          total: patients.length,
          imported_patients: importedPatients.map(p => ({ id: p.id, code: p.patient_facility_code }))
        },
        `Imported ${results.success} patients, ${results.failed} failed`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));

      sendSuccess(res, `Imported ${results.success} patients, ${results.failed} failed`, results);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientController;