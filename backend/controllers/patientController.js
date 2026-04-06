// backend/controllers/patientController.js
const Patient = require('../models/Patient');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Encounter = require('../models/Encounter');
const { generatePatientCode, hashPassword } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginated } = require('../utils/responseHandler');
const { Parser } = require('json2csv');

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
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'UPDATE',
        table_name: 'patients',
        record_id: patient.id,
        patient_id: patient.id,
        new_values: updatedPatient,
        description: 'Patient updated their own profile',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
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
          null,
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
      
      const patientId = await Patient.create({
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
      });
      
      const newPatient = await Patient.findById(patientId);
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'INSERT',
        table_name: 'patients',
        record_id: patientId,
        patient_id: patientId,
        new_values: newPatient,
        description: `Created patient record for ${first_name} ${last_name} with code ${finalPatientCode}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
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
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'UPDATE',
        table_name: 'patients',
        record_id: patientId,
        patient_id: patientId,
        old_values: existingPatient,
        new_values: updatedPatient,
        description: `Updated patient record for ${updatedPatient.first_name} ${updatedPatient.last_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
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
      
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'DELETE',
        table_name: 'patients',
        record_id: patientId,
        patient_id: patientId,
        old_values: patient,
        description: `Deleted patient record for ${patient.first_name} ${patient.last_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
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
      
      res.header('Content-Type', 'text/csv');
      res.attachment(`patients-export-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
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
          
          await Patient.create({
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
          
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            patient: `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim() || 'Unknown patient',
            error: err.message
          });
        }
      }
      
      sendSuccess(res, `Imported ${results.success} patients, ${results.failed} failed`, results);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientController;