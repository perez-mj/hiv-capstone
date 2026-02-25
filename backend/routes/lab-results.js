// backend/routes/lab-results.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination, validateDateRange, validatePatientId } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { formatDate, paginate } = require('../utils/helpers');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/lab-results');
    // Ensure directory exists
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `lab-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ==================== LAB RESULTS ROUTES ====================

// GET all lab results with filters
router.get('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validatePagination,
  validateDateRange,
  async (req, res) => {
    try {
      const { page, limit, offset } = req.pagination;
      const { dateRange } = req;
      
      const {
        patient_id,
        test_type,
        search
      } = req.query;

      let query = `
        SELECT 
          lr.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.date_of_birth,
          u.username as performed_by_username,
          a.appointment_number,
          a.scheduled_at as appointment_scheduled_at,
          CASE 
            WHEN lr.test_type = 'CD4' AND lr.result_value IS NOT NULL THEN
              CASE 
                WHEN CAST(lr.result_value AS UNSIGNED) >= 500 THEN 'Normal'
                WHEN CAST(lr.result_value AS UNSIGNED) >= 200 THEN 'Moderate'
                ELSE 'Low'
              END
            WHEN lr.test_type = 'VIRAL_LOAD' AND lr.result_value IS NOT NULL THEN
              CASE 
                WHEN CAST(lr.result_value AS UNSIGNED) < 40 THEN 'Undetectable'
                WHEN CAST(lr.result_value AS UNSIGNED) < 1000 THEN 'Low'
                ELSE 'High'
              END
            ELSE 'N/A'
          END as clinical_significance
        FROM lab_results lr
        LEFT JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN users u ON lr.performed_by = u.id
        LEFT JOIN appointments a ON lr.appointment_id = a.id
        WHERE 1=1
      `;
      
      const queryParams = [];

      if (patient_id) {
        query += ` AND lr.patient_id = ?`;
        queryParams.push(patient_id);
      }

      if (test_type) {
        if (Array.isArray(test_type)) {
          query += ` AND lr.test_type IN (${test_type.map(() => '?').join(', ')})`;
          queryParams.push(...test_type);
        } else {
          query += ` AND lr.test_type = ?`;
          queryParams.push(test_type);
        }
      }

      if (dateRange?.start_date) {
        query += ` AND lr.test_date >= ?`;
        queryParams.push(dateRange.start_date);
      }

      if (dateRange?.end_date) {
        query += ` AND lr.test_date <= ?`;
        queryParams.push(dateRange.end_date);
      }

      if (search) {
        query += ` AND (
          p.first_name LIKE ? OR
          p.last_name LIKE ? OR
          p.patient_facility_code LIKE ? OR
          lr.test_type LIKE ? OR
          lr.result_value LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM lab_results lr/,
        'SELECT COUNT(*) as total FROM lab_results lr'
      );
      
      const [countResult] = await pool.execute(countQuery, queryParams);
      const total = countResult[0].total;

      // Add sorting and pagination
      query += ` ORDER BY lr.test_date DESC, lr.created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      const [results] = await pool.execute(query, queryParams);

      // Calculate statistics
      const [stats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_results,
          COUNT(DISTINCT patient_id) as unique_patients,
          COUNT(DISTINCT test_type) as test_types_count,
          MIN(test_date) as earliest_test,
          MAX(test_date) as latest_test,
          SUM(CASE WHEN test_type = 'CD4' THEN 1 ELSE 0 END) as cd4_count,
          SUM(CASE WHEN test_type = 'VIRAL_LOAD' THEN 1 ELSE 0 END) as viral_load_count,
          AVG(CASE WHEN test_type = 'CD4' AND result_value REGEXP '^[0-9]+$' 
              THEN CAST(result_value AS UNSIGNED) ELSE NULL END) as avg_cd4,
          AVG(CASE WHEN test_type = 'VIRAL_LOAD' AND result_value REGEXP '^[0-9]+$' 
              THEN CAST(result_value AS UNSIGNED) ELSE NULL END) as avg_viral_load
        FROM lab_results
        WHERE test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      );

      res.json({
        success: true,
        data: results,
        stats: stats[0],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching lab results:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch lab results' 
      });
    }
});

// GET lab results by test type
router.get('/type/:testType', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validatePagination,
  async (req, res) => {
    try {
      const { testType } = req.params;
      const { page, limit, offset } = req.pagination;
      const { start_date, end_date } = req.query;

      const validTestTypes = ['CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER'];
      if (!validTestTypes.includes(testType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid test type',
          valid_types: validTestTypes
        });
      }

      let query = `
        SELECT 
          lr.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.date_of_birth,
          p.sex,
          p.hiv_status,
          u.username as performed_by_username
        FROM lab_results lr
        LEFT JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN users u ON lr.performed_by = u.id
        WHERE lr.test_type = ?
      `;
      
      const params = [testType];

      if (start_date) {
        query += ` AND lr.test_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND lr.test_date <= ?`;
        params.push(end_date);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM lab_results lr/,
        'SELECT COUNT(*) as total FROM lab_results lr'
      );
      
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      query += ` ORDER BY lr.test_date DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [results] = await pool.execute(query, params);

      // Get statistical summary for this test type
      let summary = {};
      if (testType === 'CD4' || testType === 'VIRAL_LOAD') {
        const [stats] = await pool.execute(
          `SELECT 
            AVG(CAST(result_value AS UNSIGNED)) as average,
            MIN(CAST(result_value AS UNSIGNED)) as minimum,
            MAX(CAST(result_value AS UNSIGNED)) as maximum,
            STDDEV(CAST(result_value AS UNSIGNED)) as stddev
          FROM lab_results
          WHERE test_type = ? AND result_value REGEXP '^[0-9]+$'`,
          [testType]
        );
        summary = stats[0];
      }

      res.json({
        success: true,
        test_type: testType,
        data: results,
        summary,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching lab results by type:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch lab results' 
      });
    }
});

// GET lab statistics
router.get('/stats', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      let dateCondition;
      switch (period) {
        case 'week':
          dateCondition = 'test_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case 'quarter':
          dateCondition = 'test_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
          break;
        case 'year':
          dateCondition = 'test_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
          break;
        default:
          dateCondition = 'test_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      }

      // Overall statistics
      const [overall] = await pool.execute(
        `SELECT 
          COUNT(*) as total_tests,
          COUNT(DISTINCT patient_id) as unique_patients,
          COUNT(DISTINCT test_type) as test_types,
          MIN(test_date) as earliest_test,
          MAX(test_date) as latest_test
        FROM lab_results
        WHERE ${dateCondition}`
      );

      // By test type
      const [byType] = await pool.execute(
        `SELECT 
          test_type,
          COUNT(*) as count,
          COUNT(DISTINCT patient_id) as unique_patients,
          MIN(test_date) as first_test,
          MAX(test_date) as last_test,
          AVG(CASE WHEN result_value REGEXP '^[0-9]+$' 
              THEN CAST(result_value AS UNSIGNED) ELSE NULL END) as average_value
        FROM lab_results
        WHERE ${dateCondition}
        GROUP BY test_type
        ORDER BY count DESC`
      );

      // Monthly trends
      const [monthly] = await pool.execute(
        `SELECT 
          DATE_FORMAT(test_date, '%Y-%m') as month,
          test_type,
          COUNT(*) as count,
          AVG(CASE WHEN result_value REGEXP '^[0-9]+$' 
              THEN CAST(result_value AS UNSIGNED) ELSE NULL END) as avg_value
        FROM lab_results
        WHERE test_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(test_date, '%Y-%m'), test_type
        ORDER BY month DESC`
      );

      // CD4 vs Viral Load correlation (patients with both tests)
      const [correlation] = await pool.execute(
        `SELECT 
          COUNT(DISTINCT lr1.patient_id) as patients_with_both,
          AVG(CAST(lr1.result_value AS UNSIGNED)) as avg_cd4,
          AVG(CAST(lr2.result_value AS UNSIGNED)) as avg_viral_load
        FROM lab_results lr1
        JOIN lab_results lr2 ON lr1.patient_id = lr2.patient_id
        WHERE lr1.test_type = 'CD4'
          AND lr2.test_type = 'VIRAL_LOAD'
          AND lr1.test_date = lr2.test_date
          AND lr1.result_value REGEXP '^[0-9]+$'
          AND lr2.result_value REGEXP '^[0-9]+$'
          AND ${dateCondition.replace('test_date', 'lr1.test_date')}`
      );

      // Abnormal results count
      const [abnormal] = await pool.execute(
        `SELECT 
          test_type,
          COUNT(*) as abnormal_count
        FROM lab_results
        WHERE ${dateCondition}
          AND (
            (test_type = 'CD4' AND CAST(result_value AS UNSIGNED) < 200) OR
            (test_type = 'VIRAL_LOAD' AND CAST(result_value AS UNSIGNED) > 1000)
          )
        GROUP BY test_type`
      );

      res.json({
        success: true,
        period,
        stats: {
          overall: overall[0],
          by_type: byType,
          monthly_trends: monthly,
          correlation: correlation[0],
          abnormal_results: abnormal
        }
      });

    } catch (error) {
      console.error('Error fetching lab statistics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch lab statistics' 
      });
    }
});

// GET recent lab results
router.get('/recent', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const [results] = await pool.execute(
        `SELECT 
          lr.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u.username as performed_by_username,
          CASE 
            WHEN lr.test_type = 'CD4' AND lr.result_value IS NOT NULL THEN
              CASE 
                WHEN CAST(lr.result_value AS UNSIGNED) >= 500 THEN 'success'
                WHEN CAST(lr.result_value AS UNSIGNED) >= 200 THEN 'warning'
                ELSE 'danger'
              END
            WHEN lr.test_type = 'VIRAL_LOAD' AND lr.result_value IS NOT NULL THEN
              CASE 
                WHEN CAST(lr.result_value AS UNSIGNED) < 40 THEN 'success'
                WHEN CAST(lr.result_value AS UNSIGNED) < 1000 THEN 'warning'
                ELSE 'danger'
              END
            ELSE 'info'
          END as status_color
        FROM lab_results lr
        LEFT JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN users u ON lr.performed_by = u.id
        ORDER BY lr.test_date DESC, lr.created_at DESC
        LIMIT ?`,
        [limit]
      );

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('Error fetching recent lab results:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch recent lab results' 
      });
    }
});

// GET single lab result by ID
router.get('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [results] = await pool.execute(
        `SELECT 
          lr.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.date_of_birth,
          p.sex,
          p.hiv_status,
          p.diagnosis_date,
          p.art_start_date,
          u.username as performed_by_username,
          u.email as performed_by_email,
          a.appointment_number,
          a.scheduled_at as appointment_scheduled_at,
          a.status as appointment_status,
          creator.username as created_by_username,
          updater.username as updater_username
        FROM lab_results lr
        LEFT JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN users u ON lr.performed_by = u.id
        LEFT JOIN appointments a ON lr.appointment_id = a.id
        LEFT JOIN users creator ON lr.created_by = creator.id
        LEFT JOIN users updater ON lr.updated_by = updater.id
        WHERE lr.id = ?`,
        [req.params.id]
      );

      if (results.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Lab result not found' 
        });
      }

      const result = results[0];

      // Get patient's historical results for this test type
      const [history] = await pool.execute(
        `SELECT test_date, result_value, result_unit
         FROM lab_results
         WHERE patient_id = ? AND test_type = ? AND id != ?
         ORDER BY test_date DESC
         LIMIT 5`,
        [result.patient_id, result.test_type, req.params.id]
      );

      result.historical_results = history;

      // Add interpretation if not provided
      if (!result.interpretation && result.result_value && result.reference_range) {
        result.interpretation = generateInterpretation(result);
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

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error fetching lab result:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch lab result' 
      });
    }
});

// GET lab results by patient
router.get('/patient/:patientId', 
  authenticateToken, 
  validatePatientId,
  validatePagination,
  async (req, res) => {
    try {
      const patientId = req.patientId;
      const { page, limit, offset } = req.pagination;
      const { test_type, start_date, end_date } = req.query;

      // Check if patient user can access
      if (req.user.role === 'PATIENT') {
        const [patient] = await pool.execute(
          'SELECT id FROM patients WHERE user_id = ?',
          [req.user.id]
        );
        
        if (patient.length === 0 || patient[0].id !== patientId) {
          return res.status(403).json({ 
            success: false,
            error: 'Access denied' 
          });
        }
      }

      let query = `
        SELECT 
          lr.*,
          u.username as performed_by_username,
          a.appointment_number,
          CASE 
            WHEN lr.test_type = 'CD4' AND lr.result_value IS NOT NULL THEN
              CASE 
                WHEN CAST(lr.result_value AS UNSIGNED) >= 500 THEN 'Normal'
                WHEN CAST(lr.result_value AS UNSIGNED) >= 200 THEN 'Moderate'
                ELSE 'Low'
              END
            WHEN lr.test_type = 'VIRAL_LOAD' AND lr.result_value IS NOT NULL THEN
              CASE 
                WHEN CAST(lr.result_value AS UNSIGNED) < 40 THEN 'Undetectable'
                WHEN CAST(lr.result_value AS UNSIGNED) < 1000 THEN 'Low'
                ELSE 'High'
              END
            ELSE 'N/A'
          END as interpretation_category
        FROM lab_results lr
        LEFT JOIN users u ON lr.performed_by = u.id
        LEFT JOIN appointments a ON lr.appointment_id = a.id
        WHERE lr.patient_id = ?
      `;
      
      const params = [patientId];

      if (test_type) {
        query += ` AND lr.test_type = ?`;
        params.push(test_type);
      }

      if (start_date) {
        query += ` AND lr.test_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND lr.test_date <= ?`;
        params.push(end_date);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM lab_results lr/,
        'SELECT COUNT(*) as total FROM lab_results lr'
      );
      
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      query += ` ORDER BY lr.test_date DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [results] = await pool.execute(query, params);

      // Group results by test type for trend analysis
      const grouped = {};
      results.forEach(result => {
        if (!grouped[result.test_type]) {
          grouped[result.test_type] = [];
        }
        grouped[result.test_type].push(result);
      });

      // Get summary statistics for this patient
      const [summary] = await pool.execute(
        `SELECT 
          COUNT(*) as total_results,
          COUNT(DISTINCT test_type) as test_types,
          MIN(test_date) as first_test,
          MAX(test_date) as last_test,
          MAX(CASE WHEN test_type = 'CD4' THEN test_date ELSE NULL END) as last_cd4_date,
          MAX(CASE WHEN test_type = 'VIRAL_LOAD' THEN test_date ELSE NULL END) as last_vl_date,
          (SELECT result_value FROM lab_results 
           WHERE patient_id = ? AND test_type = 'CD4' 
           ORDER BY test_date DESC LIMIT 1) as latest_cd4,
          (SELECT result_value FROM lab_results 
           WHERE patient_id = ? AND test_type = 'VIRAL_LOAD' 
           ORDER BY test_date DESC LIMIT 1) as latest_viral_load
        FROM lab_results
        WHERE patient_id = ?`,
        [patientId, patientId, patientId]
      );

      res.json({
        success: true,
        data: results,
        grouped_by_type: grouped,
        summary: summary[0],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching patient lab results:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch lab results' 
      });
    }
});

// POST create new lab result
router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  upload.single('file'),
  validate('labResultCreate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

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
      const [patient] = await connection.execute(
        'SELECT id, first_name, last_name FROM patients WHERE id = ?',
        [patient_id]
      );

      if (patient.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Patient not found' 
        });
      }

      // Check if appointment exists if provided
      if (appointment_id) {
        const [appointment] = await connection.execute(
          'SELECT id FROM appointments WHERE id = ?',
          [appointment_id]
        );

        if (appointment.length === 0) {
          await connection.rollback();
          return res.status(404).json({ 
            success: false,
            error: 'Appointment not found' 
          });
        }
      }

      // Validate test date
      if (new Date(test_date) > new Date()) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Test date cannot be in the future' 
        });
      }

      // Handle file upload
      let file_path = null;
      if (req.file) {
        file_path = req.file.path;
      }

      // Auto-generate interpretation if not provided
      let finalInterpretation = interpretation;
      if (!finalInterpretation && result_value && reference_range) {
        finalInterpretation = generateInterpretation({
          test_type,
          result_value,
          reference_range
        });
      }

      // Create lab result
      const [result] = await connection.execute(
        `INSERT INTO lab_results (
          patient_id, appointment_id, test_type, test_date,
          result_value, result_unit, reference_range, interpretation,
          file_path, performed_by, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          patient_id,
          appointment_id || null,
          test_type,
          test_date,
          result_value || null,
          result_unit || null,
          reference_range || null,
          finalInterpretation || null,
          file_path,
          req.user.id,
          req.user.id
        ]
      );

      const result_id = result.insertId;

      // Get created lab result
      const [newResult] = await connection.execute(
        `SELECT 
          lr.*,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u.username as performed_by_username
        FROM lab_results lr
        LEFT JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN users u ON lr.performed_by = u.id
        WHERE lr.id = ?`,
        [result_id]
      );

      // If this is CD4 or Viral Load, update patient's latest values
      if (test_type === 'CD4' && result_value && !isNaN(result_value)) {
        await connection.execute(
          `UPDATE patients 
           SET latest_cd4_count = ?, updated_at = NOW() 
           WHERE id = ?`,
          [parseInt(result_value), patient_id]
        );
      } else if (test_type === 'VIRAL_LOAD' && result_value && !isNaN(result_value)) {
        await connection.execute(
          `UPDATE patients 
           SET latest_viral_load = ?, updated_at = NOW() 
           WHERE id = ?`,
          [parseInt(result_value), patient_id]
        );
      }

      // Log audit
      await logAudit(
        req.user.id,
        'INSERT',
        'lab_results',
        result_id,
        patient_id,
        null,
        newResult[0],
        `Added ${test_type} result for ${patient[0].first_name} ${patient[0].last_name}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Lab result created successfully',
        data: newResult[0]
      });

    } catch (error) {
      await connection.rollback();
      
      // Delete uploaded file if error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      console.error('Error creating lab result:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create lab result' 
      });
    } finally {
      connection.release();
    }
});

// POST upload lab result file (separate endpoint for file only)
router.post('/upload', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Return file information
      res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Delete uploaded file if error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to upload file' 
      });
    }
});

// PUT update lab result
router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  upload.single('file'),
  validate('labResultUpdate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if lab result exists
      const [existing] = await connection.execute(
        'SELECT * FROM lab_results WHERE id = ?',
        [req.params.id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Lab result not found' 
        });
      }

      const oldValues = existing[0];
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
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Test date cannot be in the future' 
        });
      }

      // Handle file upload
      let file_path = oldValues.file_path;
      if (req.file) {
        // Delete old file if exists
        if (file_path) {
          await fs.unlink(file_path).catch(console.error);
        }
        file_path = req.file.path;
      }

      // Auto-generate interpretation if not provided but values changed
      let finalInterpretation = interpretation;
      if (!finalInterpretation && 
          (result_value || reference_range) && 
          (test_type || oldValues.test_type)) {
        finalInterpretation = generateInterpretation({
          test_type: test_type || oldValues.test_type,
          result_value: result_value || oldValues.result_value,
          reference_range: reference_range || oldValues.reference_range
        });
      }

      // Build update query
      const updateFields = [];
      const values = [];

      if (test_type !== undefined) {
        updateFields.push('test_type = ?');
        values.push(test_type);
      }
      if (test_date !== undefined) {
        updateFields.push('test_date = ?');
        values.push(test_date);
      }
      if (result_value !== undefined) {
        updateFields.push('result_value = ?');
        values.push(result_value);
      }
      if (result_unit !== undefined) {
        updateFields.push('result_unit = ?');
        values.push(result_unit);
      }
      if (reference_range !== undefined) {
        updateFields.push('reference_range = ?');
        values.push(reference_range);
      }
      if (finalInterpretation !== undefined) {
        updateFields.push('interpretation = ?');
        values.push(finalInterpretation);
      }
      if (req.file) {
        updateFields.push('file_path = ?');
        values.push(file_path);
      }

      updateFields.push('updated_by = ?');
      values.push(req.user.id);
      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 2) { // Only updated_by and updated_at
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'No fields to update' 
        });
      }

      values.push(req.params.id);

      await connection.execute(
        `UPDATE lab_results SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated lab result
      const [updated] = await connection.execute(
        `SELECT 
          lr.*,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u.username as performed_by_username
        FROM lab_results lr
        LEFT JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN users u ON lr.performed_by = u.id
        WHERE lr.id = ?`,
        [req.params.id]
      );

      // If CD4 or Viral Load values changed, update patient's latest values
      const newTestType = test_type || oldValues.test_type;
      const newResultValue = result_value !== undefined ? result_value : oldValues.result_value;
      
      if (newTestType === 'CD4' && newResultValue && !isNaN(newResultValue)) {
        await connection.execute(
          `UPDATE patients 
           SET latest_cd4_count = ?, updated_at = NOW() 
           WHERE id = ?`,
          [parseInt(newResultValue), oldValues.patient_id]
        );
      } else if (newTestType === 'VIRAL_LOAD' && newResultValue && !isNaN(newResultValue)) {
        await connection.execute(
          `UPDATE patients 
           SET latest_viral_load = ?, updated_at = NOW() 
           WHERE id = ?`,
          [parseInt(newResultValue), oldValues.patient_id]
        );
      }

      // Log audit
      await logAudit(
        req.user.id,
        'UPDATE',
        'lab_results',
        req.params.id,
        oldValues.patient_id,
        oldValues,
        updated[0],
        'Updated lab result',
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Lab result updated successfully',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      
      // Delete uploaded file if error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      console.error('Error updating lab result:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update lab result' 
      });
    } finally {
      connection.release();
    }
});

// DELETE lab result
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if lab result exists
      const [result] = await connection.execute(
        `SELECT lr.*, p.first_name, p.last_name 
         FROM lab_results lr
         JOIN patients p ON lr.patient_id = p.id
         WHERE lr.id = ?`,
        [req.params.id]
      );

      if (result.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Lab result not found' 
        });
      }

      const labResult = result[0];

      // Delete associated file if exists
      if (labResult.file_path) {
        await fs.unlink(labResult.file_path).catch(console.error);
      }

      // Log audit before deletion
      await logAudit(
        req.user.id,
        'DELETE',
        'lab_results',
        req.params.id,
        labResult.patient_id,
        labResult,
        null,
        `Deleted ${labResult.test_type} result for ${labResult.first_name} ${labResult.last_name}`,
        req
      );

      // Delete lab result
      await connection.execute(
        'DELETE FROM lab_results WHERE id = ?',
        [req.params.id]
      );

      // Update patient's latest values if this was the latest
      if (labResult.test_type === 'CD4') {
        const [latest] = await connection.execute(
          `SELECT result_value FROM lab_results 
           WHERE patient_id = ? AND test_type = 'CD4' 
           ORDER BY test_date DESC LIMIT 1`,
          [labResult.patient_id]
        );
        
        await connection.execute(
          'UPDATE patients SET latest_cd4_count = ? WHERE id = ?',
          [latest[0]?.result_value || null, labResult.patient_id]
        );
      } else if (labResult.test_type === 'VIRAL_LOAD') {
        const [latest] = await connection.execute(
          `SELECT result_value FROM lab_results 
           WHERE patient_id = ? AND test_type = 'VIRAL_LOAD' 
           ORDER BY test_date DESC LIMIT 1`,
          [labResult.patient_id]
        );
        
        await connection.execute(
          'UPDATE patients SET latest_viral_load = ? WHERE id = ?',
          [latest[0]?.result_value || null, labResult.patient_id]
        );
      }

      await connection.commit();

      res.json({ 
        success: true,
        message: 'Lab result deleted successfully',
        deleted_result: {
          id: labResult.id,
          test_type: labResult.test_type,
          patient_name: `${labResult.first_name} ${labResult.last_name}`,
          test_date: labResult.test_date
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting lab result:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete lab result' 
      });
    } finally {
      connection.release();
    }
});

// GET download lab result file
router.get('/download/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        'SELECT file_path, test_type, patient_id FROM lab_results WHERE id = ?',
        [req.params.id]
      );

      if (result.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Lab result not found' 
        });
      }

      const labResult = result[0];

      if (!labResult.file_path) {
        return res.status(404).json({ 
          success: false,
          error: 'No file associated with this lab result' 
        });
      }

      // Check if file exists
      try {
        await fs.access(labResult.file_path);
      } catch {
        return res.status(404).json({ 
          success: false,
          error: 'File not found on server' 
        });
      }

      // Log download
      await logAudit(
        req.user.id,
        'DOWNLOAD',
        'lab_results',
        req.params.id,
        labResult.patient_id,
        null,
        null,
        `Downloaded ${labResult.test_type} result file`,
        req
      );

      // Send file
      res.download(labResult.file_path);

    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to download file' 
      });
    }
});

// Helper function to generate interpretation
function generateInterpretation(result) {
  const { test_type, result_value, reference_range } = result;
  
  if (!result_value || !reference_range) return null;
  
  // Parse reference range (e.g., "200-800" or "<40" or ">1000")
  const value = parseFloat(result_value);
  if (isNaN(value)) return null;
  
  if (reference_range.includes('-')) {
    const [low, high] = reference_range.split('-').map(Number);
    if (value < low) return 'Below normal range';
    if (value > high) return 'Above normal range';
    return 'Within normal range';
  } else if (reference_range.startsWith('<')) {
    const max = parseFloat(reference_range.substring(1));
    if (value < max) return 'Within normal range';
    return 'Above normal range';
  } else if (reference_range.startsWith('>')) {
    const min = parseFloat(reference_range.substring(1));
    if (value > min) return 'Within normal range';
    return 'Below normal range';
  }
  
  return null;
}

module.exports = router;