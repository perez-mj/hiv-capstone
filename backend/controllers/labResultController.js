// backend/controllers/encounterController.js
const LabResult = require('../models/LabResult');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const { sendResponse, sendPaginated } = require('../utils/responseHandler');
const fs = require('fs').promises;

const labResultController = {
  // Get all lab results with filters
  async getAllLabResults(req, res, next) {
    try {
      const { page = 1, limit = 100, patient_id, test_type, start_date, end_date, search } = req.query;
      const offset = (page - 1) * limit;

      const filters = { patient_id, test_type, start_date, end_date, search };
      const results = await LabResult.findAll(filters, { limit, offset });
      const total = await LabResult.count(filters);
      const stats = await LabResult.getOverallStats();

      sendPaginated(res, results, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, 'Lab results retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get lab results by test type
  async getByTestType(req, res, next) {
    try {
      const { testType } = req.params;
      const { page = 1, limit = 100, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      const validTestTypes = ['CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER'];
      if (!validTestTypes.includes(testType)) {
        return sendResponse(res, 400, 'Invalid test type', null, { valid_types: validTestTypes });
      }

      const filters = { start_date, end_date };
      const results = await LabResult.findByTestType(testType, filters, { limit, offset });
      const total = await LabResult.countByTestType(testType, filters);
      const summary = await LabResult.getTestTypeSummary(testType);

      sendPaginated(res, results, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }, `Lab results for ${testType} retrieved successfully`);
    } catch (error) {
      next(error);
    }
  },

  // Get lab statistics
  async getStatistics(req, res, next) {
    try {
      const { period = 'month' } = req.query;
      const stats = await LabResult.getStatistics(period);

      sendResponse(res, 200, 'Lab statistics retrieved successfully', {
        period,
        stats
      });
    } catch (error) {
      next(error);
    }
  },

  // Get recent lab results
  async getRecent(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const results = await LabResult.getRecent(limit);

      sendResponse(res, 200, 'Recent lab results retrieved successfully', results);
    } catch (error) {
      next(error);
    }
  },

  // Get single lab result by ID
  async getLabResultById(req, res, next) {
    try {
      const result = await LabResult.findById(req.params.id);

      if (!result) {
        return sendResponse(res, 404, 'Lab result not found');
      }

      // Get historical results
      result.historical_results = await LabResult.getHistoricalResults(
        result.patient_id,
        result.test_type,
        req.params.id,
        5
      );

      // Generate interpretation if not provided
      if (!result.interpretation && result.result_value && result.reference_range) {
        result.interpretation = LabResult.generateInterpretation(
          result.test_type,
          result.result_value,
          result.reference_range
        );
      }

      // Check if file exists
      if (result.file_path) {
        try {
          await fs.access(result.file_path);
          result.file_exists = true;
        } catch {
          result.file_exists = false;
        }
      }

      sendResponse(res, 200, 'Lab result retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  },

  // Get lab results by patient
  async getByPatient(req, res, next) {
    try {
      const patientId = req.params.patientId;
      const { page = 1, limit = 100, test_type, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      // Check patient access for PATIENT role
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findByUserId(req.user.id);
        if (!patient || patient.id !== parseInt(patientId)) {
          return sendResponse(res, 403, 'Access denied');
        }
      }

      const filters = { test_type, start_date, end_date };
      const results = await LabResult.findByPatientId(patientId, filters, { limit, offset });
      const total = await LabResult.countByPatientId(patientId, filters);
      const summary = await LabResult.getPatientSummary(patientId);

      // Group results by test type for trend analysis
      const grouped = {};
      results.forEach(result => {
        if (!grouped[result.test_type]) {
          grouped[result.test_type] = [];
        }
        grouped[result.test_type].push(result);
      });

      sendResponse(res, 200, 'Patient lab results retrieved successfully', {
        data: results,
        grouped_by_type: grouped,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new lab result
  async createLabResult(req, res, next) {
    try {
      const {
        patient_id,
        appointment_id,
        test_type,
        test_date,
        result_value,
        result_unit,
        reference_range,
        interpretation
      } = req.body;

      // Check if patient exists
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return sendResponse(res, 404, 'Patient not found');
      }

      // Check if appointment exists if provided
      if (appointment_id) {
        const appointment = await Appointment.findById(appointment_id);
        if (!appointment) {
          return sendResponse(res, 404, 'Appointment not found');
        }
      }

      // Validate test date
      if (new Date(test_date) > new Date()) {
        return sendResponse(res, 400, 'Test date cannot be in the future');
      }

      // Handle file upload
      let file_path = null;
      if (req.file) {
        file_path = req.file.path;
      }

      // Auto-generate interpretation if not provided
      let finalInterpretation = interpretation;
      if (!finalInterpretation && result_value && reference_range) {
        finalInterpretation = LabResult.generateInterpretation(test_type, result_value, reference_range);
      }

      const resultId = await LabResult.create({
        patient_id,
        appointment_id,
        test_type,
        test_date,
        result_value,
        result_unit,
        reference_range,
        interpretation: finalInterpretation,
        file_path,
        performed_by: req.user.id,
        created_by: req.user.id
      });

      const newResult = await LabResult.findById(resultId);

      // Update patient's latest values if applicable
      if (test_type === 'CD4' && result_value && !isNaN(result_value)) {
        await Patient.update(patient_id, { latest_cd4_count: parseInt(result_value) });
      } else if (test_type === 'VIRAL_LOAD' && result_value && !isNaN(result_value)) {
        await Patient.update(patient_id, { latest_viral_load: parseInt(result_value) });
      }

      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'INSERT',
        table_name: 'lab_results',
        record_id: resultId,
        patient_id: patient_id,
        new_values: newResult,
        description: `Added ${test_type} result for ${patient.first_name} ${patient.last_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      sendResponse(res, 201, 'Lab result created successfully', newResult);
    } catch (error) {
      // Delete uploaded file if error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      next(error);
    }
  },

  // Upload lab result file (separate endpoint)
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return sendResponse(res, 400, 'No file uploaded');
      }

      sendResponse(res, 200, 'File uploaded successfully', {
        file: {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      next(error);
    }
  },

  // Update lab result
  async updateLabResult(req, res, next) {
    try {
      const existing = await LabResult.findById(req.params.id);
      if (!existing) {
        return sendResponse(res, 404, 'Lab result not found');
      }

      const {
        test_type,
        test_date,
        result_value,
        result_unit,
        reference_range,
        interpretation
      } = req.body;

      // Validate test date if provided
      if (test_date && new Date(test_date) > new Date()) {
        return sendResponse(res, 400, 'Test date cannot be in the future');
      }

      // Handle file upload
      let file_path = existing.file_path;
      if (req.file) {
        // Delete old file if exists
        if (file_path) {
          await LabResult.deleteFile(file_path);
        }
        file_path = req.file.path;
      }

      // Auto-generate interpretation if not provided
      let finalInterpretation = interpretation;
      if (!finalInterpretation && (result_value || existing.result_value) && 
          (reference_range || existing.reference_range)) {
        finalInterpretation = LabResult.generateInterpretation(
          test_type || existing.test_type,
          result_value || existing.result_value,
          reference_range || existing.reference_range
        );
      }

      const updateData = {
        test_type,
        test_date,
        result_value,
        result_unit,
        reference_range,
        interpretation: finalInterpretation,
        file_path,
        updated_by: req.user.id
      };

      const updated = await LabResult.update(req.params.id, updateData);

      if (!updated) {
        return sendResponse(res, 400, 'No changes made');
      }

      const updatedResult = await LabResult.findById(req.params.id);

      // Update patient's latest values if changed
      const newTestType = test_type || existing.test_type;
      const newResultValue = result_value !== undefined ? result_value : existing.result_value;

      if (newTestType === 'CD4' && newResultValue && !isNaN(newResultValue)) {
        await Patient.update(existing.patient_id, { latest_cd4_count: parseInt(newResultValue) });
      } else if (newTestType === 'VIRAL_LOAD' && newResultValue && !isNaN(newResultValue)) {
        await Patient.update(existing.patient_id, { latest_viral_load: parseInt(newResultValue) });
      }

      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'UPDATE',
        table_name: 'lab_results',
        record_id: req.params.id,
        patient_id: existing.patient_id,
        old_values: existing,
        new_values: updatedResult,
        description: 'Updated lab result',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      sendResponse(res, 200, 'Lab result updated successfully', updatedResult);
    } catch (error) {
      // Delete uploaded file if error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      next(error);
    }
  },

  // Delete lab result
  async deleteLabResult(req, res, next) {
    try {
      const result = await LabResult.findById(req.params.id);
      if (!result) {
        return sendResponse(res, 404, 'Lab result not found');
      }

      const patient = await Patient.findById(result.patient_id);

      // Delete associated file if exists
      if (result.file_path) {
        await LabResult.deleteFile(result.file_path);
      }

      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'DELETE',
        table_name: 'lab_results',
        record_id: req.params.id,
        patient_id: result.patient_id,
        old_values: result,
        description: `Deleted ${result.test_type} result for ${patient?.first_name} ${patient?.last_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      await LabResult.delete(req.params.id);

      // Update patient's latest values if this was the latest
      if (result.test_type === 'CD4') {
        const [latest] = await pool.execute(
          `SELECT result_value FROM lab_results 
           WHERE patient_id = ? AND test_type = 'CD4' 
           ORDER BY test_date DESC LIMIT 1`,
          [result.patient_id]
        );
        await Patient.update(result.patient_id, { latest_cd4_count: latest[0]?.result_value || null });
      } else if (result.test_type === 'VIRAL_LOAD') {
        const [latest] = await pool.execute(
          `SELECT result_value FROM lab_results 
           WHERE patient_id = ? AND test_type = 'VIRAL_LOAD' 
           ORDER BY test_date DESC LIMIT 1`,
          [result.patient_id]
        );
        await Patient.update(result.patient_id, { latest_viral_load: latest[0]?.result_value || null });
      }

      sendResponse(res, 200, 'Lab result deleted successfully', {
        deleted_result: {
          id: result.id,
          test_type: result.test_type,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
          test_date: result.test_date
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Download lab result file
  async downloadFile(req, res, next) {
    try {
      const fileInfo = await LabResult.getFileInfo(req.params.id);

      if (!fileInfo) {
        return sendResponse(res, 404, 'Lab result not found');
      }

      if (!fileInfo.file_path) {
        return sendResponse(res, 404, 'No file associated with this lab result');
      }

      // Check if file exists
      try {
        await fs.access(fileInfo.file_path);
      } catch {
        return sendResponse(res, 404, 'File not found on server');
      }

      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'DOWNLOAD',
        table_name: 'lab_results',
        record_id: req.params.id,
        patient_id: fileInfo.patient_id,
        description: `Downloaded ${fileInfo.test_type} result file`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      res.download(fileInfo.file_path);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = labResultController;