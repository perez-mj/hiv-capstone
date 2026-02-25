// backend/routes/encounters.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize, authorizeOwnership } = require('../middleware/authorize');
const { validate, validatePagination, validateDateRange, validatePatientId } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { formatDate, calculateAge, paginate } = require('../utils/helpers');

// ==================== CLINICAL ENCOUNTERS ROUTES ====================

// GET all encounters with filters
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
        staff_id,
        type,
        search
      } = req.query;

      let query = `
        SELECT 
          ce.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.date_of_birth,
          p.sex,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name,
          s.position as staff_position,
          u.username as created_by_username,
          creator.username as creator_name
        FROM clinical_encounters ce
        LEFT JOIN patients p ON ce.patient_id = p.id
        LEFT JOIN staff s ON ce.staff_id = s.id
        LEFT JOIN users u ON ce.created_by = u.id
        LEFT JOIN users creator ON ce.created_by = creator.id
        WHERE 1=1
      `;
      
      const queryParams = [];

      if (patient_id) {
        query += ` AND ce.patient_id = ?`;
        queryParams.push(patient_id);
      }

      if (staff_id) {
        query += ` AND ce.staff_id = ?`;
        queryParams.push(staff_id);
      }

      if (type) {
        query += ` AND ce.type = ?`;
        queryParams.push(type);
      }

      if (dateRange?.start_date) {
        query += ` AND DATE(ce.encounter_date) >= ?`;
        queryParams.push(formatDate(dateRange.start_date));
      }

      if (dateRange?.end_date) {
        query += ` AND DATE(ce.encounter_date) <= ?`;
        queryParams.push(formatDate(dateRange.end_date));
      }

      if (search) {
        query += ` AND (
          p.first_name LIKE ? OR
          p.last_name LIKE ? OR
          p.patient_facility_code LIKE ? OR
          ce.notes LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM clinical_encounters ce/,
        'SELECT COUNT(*) as total FROM clinical_encounters ce'
      );
      
      const [countResult] = await pool.execute(countQuery, queryParams);
      const total = countResult[0].total;

      // Add sorting and pagination
      query += ` ORDER BY ce.encounter_date DESC, ce.created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      const [encounters] = await pool.execute(query, queryParams);

      // Add patient age at time of encounter
      for (let encounter of encounters) {
        if (encounter.date_of_birth) {
          const encounterDate = new Date(encounter.encounter_date);
          const birthDate = new Date(encounter.date_of_birth);
          let age = encounterDate.getFullYear() - birthDate.getFullYear();
          const monthDiff = encounterDate.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && encounterDate.getDate() < birthDate.getDate())) {
            age--;
          }
          encounter.patient_age_at_encounter = age;
        }
        delete encounter.date_of_birth; // Remove from response
      }

      // Get summary statistics
      const [summary] = await pool.execute(
        `SELECT 
          COUNT(*) as total_encounters,
          COUNT(DISTINCT patient_id) as unique_patients,
          COUNT(DISTINCT staff_id) as unique_staff,
          MIN(encounter_date) as first_encounter,
          MAX(encounter_date) as last_encounter,
          SUM(CASE WHEN type = 'CONSULTATION' THEN 1 ELSE 0 END) as consultations,
          SUM(CASE WHEN type = 'TESTING' THEN 1 ELSE 0 END) as testing,
          SUM(CASE WHEN type = 'REFILL' THEN 1 ELSE 0 END) as refills,
          SUM(CASE WHEN type = 'OTHERS' THEN 1 ELSE 0 END) as others
        FROM clinical_encounters
        WHERE DATE(encounter_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      );

      res.json({
        success: true,
        data: encounters,
        summary: summary[0],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching encounters:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch encounters' 
      });
    }
});

// GET today's encounters
router.get('/today', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [encounters] = await pool.execute(
        `SELECT 
          ce.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name,
          s.position as staff_position,
          TIMESTAMPDIFF(HOUR, ce.encounter_date, NOW()) as hours_ago
        FROM clinical_encounters ce
        LEFT JOIN patients p ON ce.patient_id = p.id
        LEFT JOIN staff s ON ce.staff_id = s.id
        WHERE DATE(ce.encounter_date) = CURDATE()
        ORDER BY ce.encounter_date DESC`
      );

      // Group by type
      const grouped = {
        consultations: encounters.filter(e => e.type === 'CONSULTATION'),
        testing: encounters.filter(e => e.type === 'TESTING'),
        refills: encounters.filter(e => e.type === 'REFILL'),
        others: encounters.filter(e => e.type === 'OTHERS'),
        total: encounters.length
      };

      // Get hourly distribution
      const hourly = Array(24).fill(0);
      encounters.forEach(e => {
        const hour = new Date(e.encounter_date).getHours();
        hourly[hour]++;
      });

      res.json({
        success: true,
        data: grouped,
        hourly_distribution: hourly.map((count, hour) => ({ hour, count })),
        stats: {
          total: encounters.length,
          unique_patients: new Set(encounters.map(e => e.patient_id)).size,
          unique_staff: new Set(encounters.map(e => e.staff_id)).size
        }
      });

    } catch (error) {
      console.error('Error fetching today\'s encounters:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch today\'s encounters' 
      });
    }
});

// GET encounter types/distribution
router.get('/types', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [types] = await pool.execute(
        `SELECT 
          type,
          COUNT(*) as count,
          COUNT(DISTINCT patient_id) as unique_patients,
          MIN(encounter_date) as first_occurrence,
          MAX(encounter_date) as last_occurrence,
          AVG(LENGTH(notes)) as avg_notes_length
        FROM clinical_encounters
        GROUP BY type
        ORDER BY count DESC`
      );

      // Get monthly trends by type
      const [monthly] = await pool.execute(
        `SELECT 
          DATE_FORMAT(encounter_date, '%Y-%m') as month,
          type,
          COUNT(*) as count
        FROM clinical_encounters
        WHERE encounter_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(encounter_date, '%Y-%m'), type
        ORDER BY month DESC, type`
      );

      res.json({
        success: true,
        data: types,
        monthly_trends: monthly
      });

    } catch (error) {
      console.error('Error fetching encounter types:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch encounter types' 
      });
    }
});

// GET encounter statistics
router.get('/stats', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      let dateCondition;
      switch (period) {
        case 'week':
          dateCondition = 'encounter_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'encounter_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          break;
        case 'quarter':
          dateCondition = 'encounter_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
          break;
        case 'year':
          dateCondition = 'encounter_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
          break;
        default:
          dateCondition = 'encounter_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      }

      // Overall statistics
      const [overall] = await pool.execute(
        `SELECT 
          COUNT(*) as total_encounters,
          COUNT(DISTINCT patient_id) as unique_patients,
          COUNT(DISTINCT staff_id) as unique_staff,
          AVG(TIMESTAMPDIFF(DAY, patient.diagnosis_date, ce.encounter_date)) as avg_days_since_diagnosis,
          MIN(encounter_date) as first_encounter,
          MAX(encounter_date) as last_encounter
        FROM clinical_encounters ce
        LEFT JOIN patients patient ON ce.patient_id = patient.id
        WHERE ${dateCondition}`
      );

      // By type
      const [byType] = await pool.execute(
        `SELECT 
          type,
          COUNT(*) as count,
          COUNT(DISTINCT patient_id) as unique_patients,
          AVG(TIMESTAMPDIFF(HOUR, encounter_date, NOW())) as avg_hours_since
        FROM clinical_encounters
        WHERE ${dateCondition}
        GROUP BY type`
      );

      // Daily trends
      const [daily] = await pool.execute(
        `SELECT 
          DATE(encounter_date) as date,
          COUNT(*) as count,
          COUNT(DISTINCT patient_id) as unique_patients
        FROM clinical_encounters
        WHERE ${dateCondition}
        GROUP BY DATE(encounter_date)
        ORDER BY date DESC`
      );

      // By staff member
      const [byStaff] = await pool.execute(
        `SELECT 
          s.id,
          s.first_name,
          s.last_name,
          s.position,
          COUNT(*) as encounter_count,
          COUNT(DISTINCT ce.patient_id) as unique_patients
        FROM clinical_encounters ce
        JOIN staff s ON ce.staff_id = s.id
        WHERE ${dateCondition}
        GROUP BY s.id, s.first_name, s.last_name, s.position
        ORDER BY encounter_count DESC
        LIMIT 10`
      );

      // By hour of day
      const [byHour] = await pool.execute(
        `SELECT 
          HOUR(encounter_date) as hour,
          COUNT(*) as count,
          AVG(LENGTH(notes)) as avg_notes_length
        FROM clinical_encounters
        WHERE ${dateCondition}
        GROUP BY HOUR(encounter_date)
        ORDER BY hour`
      );

      // By day of week
      const [byDayOfWeek] = await pool.execute(
        `SELECT 
          DAYOFWEEK(encounter_date) as day_of_week,
          COUNT(*) as count
        FROM clinical_encounters
        WHERE ${dateCondition}
        GROUP BY DAYOFWEEK(encounter_date)
        ORDER BY day_of_week`
      );

      res.json({
        success: true,
        period,
        stats: {
          overall: overall[0],
          by_type: byType,
          daily_trends: daily,
          top_staff: byStaff,
          hourly_distribution: byHour,
          day_of_week_distribution: byDayOfWeek
        }
      });

    } catch (error) {
      console.error('Error fetching encounter statistics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch encounter statistics' 
      });
    }
});

// GET single encounter by ID
router.get('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const [encounters] = await pool.execute(
        `SELECT 
          ce.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.date_of_birth,
          p.sex,
          p.hiv_status,
          p.diagnosis_date,
          p.art_start_date,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name,
          s.position as staff_position,
          s.contact_number as staff_contact,
          u.username as created_by_username,
          creator.username as creator_name,
          updater.username as updater_name
        FROM clinical_encounters ce
        LEFT JOIN patients p ON ce.patient_id = p.id
        LEFT JOIN staff s ON ce.staff_id = s.id
        LEFT JOIN users u ON ce.created_by = u.id
        LEFT JOIN users creator ON ce.created_by = creator.id
        LEFT JOIN users updater ON ce.updated_by = updater.id
        WHERE ce.id = ?`,
        [req.params.id]
      );

      if (encounters.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Encounter not found' 
        });
      }

      const encounter = encounters[0];

      // Calculate patient age at time of encounter
      if (encounter.date_of_birth) {
        const encounterDate = new Date(encounter.encounter_date);
        const birthDate = new Date(encounter.date_of_birth);
        let age = encounterDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = encounterDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && encounterDate.getDate() < birthDate.getDate())) {
          age--;
        }
        encounter.patient_age_at_encounter = age;
      }
      delete encounter.date_of_birth;

      // Get previous encounters for this patient
      const [previousEncounters] = await pool.execute(
        `SELECT 
          id, encounter_date, type, notes,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name
        FROM clinical_encounters ce
        LEFT JOIN staff s ON ce.staff_id = s.id
        WHERE ce.patient_id = ? AND ce.id != ?
        ORDER BY ce.encounter_date DESC
        LIMIT 5`,
        [encounter.patient_id, req.params.id]
      );

      encounter.previous_encounters = previousEncounters;

      // Get lab results around this encounter (7 days before/after)
      const encounterDate = new Date(encounter.encounter_date);
      const startDate = new Date(encounterDate);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(encounterDate);
      endDate.setDate(endDate.getDate() + 7);

      const [labResults] = await pool.execute(
        `SELECT * FROM lab_results 
         WHERE patient_id = ? 
           AND test_date BETWEEN ? AND ?
         ORDER BY test_date DESC`,
        [encounter.patient_id, formatDate(startDate), formatDate(endDate)]
      );

      encounter.related_lab_results = labResults;

      res.json({
        success: true,
        data: encounter
      });

    } catch (error) {
      console.error('Error fetching encounter:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch encounter' 
      });
    }
});

// GET encounters by patient
router.get('/patient/:patientId', 
  authenticateToken, 
  validatePatientId,
  validatePagination,
  async (req, res) => {
    try {
      const patientId = req.patientId;
      const { page, limit, offset } = req.pagination;
      const { type, start_date, end_date } = req.query;

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
          ce.*,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name,
          s.position as staff_position,
          u.username as created_by_username
        FROM clinical_encounters ce
        LEFT JOIN staff s ON ce.staff_id = s.id
        LEFT JOIN users u ON ce.created_by = u.id
        WHERE ce.patient_id = ?
      `;
      
      const params = [patientId];

      if (type) {
        query += ` AND ce.type = ?`;
        params.push(type);
      }

      if (start_date) {
        query += ` AND DATE(ce.encounter_date) >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND DATE(ce.encounter_date) <= ?`;
        params.push(end_date);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM clinical_encounters ce/,
        'SELECT COUNT(*) as total FROM clinical_encounters ce'
      );
      
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      query += ` ORDER BY ce.encounter_date DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [encounters] = await pool.execute(query, params);

      // Get summary statistics for this patient
      const [summary] = await pool.execute(
        `SELECT 
          COUNT(*) as total_encounters,
          COUNT(DISTINCT type) as encounter_types,
          MIN(encounter_date) as first_encounter,
          MAX(encounter_date) as last_encounter,
          SUM(CASE WHEN type = 'CONSULTATION' THEN 1 ELSE 0 END) as consultations,
          SUM(CASE WHEN type = 'TESTING' THEN 1 ELSE 0 END) as testing,
          SUM(CASE WHEN type = 'REFILL' THEN 1 ELSE 0 END) as refills
        FROM clinical_encounters
        WHERE patient_id = ?`,
        [patientId]
      );

      res.json({
        success: true,
        data: encounters,
        summary: summary[0],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching patient encounters:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch encounters' 
      });
    }
});

// CREATE new encounter
router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('encounterCreate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        patient_id,
        staff_id,
        encounter_date,
        type,
        notes
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

      // Check if staff exists
      const [staff] = await connection.execute(
        'SELECT id, first_name, last_name FROM staff WHERE id = ?',
        [staff_id]
      );

      if (staff.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Staff member not found' 
        });
      }

      // Validate encounter date is not in future
      if (new Date(encounter_date) > new Date()) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Encounter date cannot be in the future' 
        });
      }

      // Create encounter
      const [result] = await connection.execute(
        `INSERT INTO clinical_encounters (
          patient_id, staff_id, encounter_date, type, notes, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          patient_id,
          staff_id,
          encounter_date,
          type,
          notes || null,
          req.user.id
        ]
      );

      const encounter_id = result.insertId;

      // Get created encounter with details
      const [newEncounter] = await connection.execute(
        `SELECT 
          ce.*,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name,
          s.position as staff_position
        FROM clinical_encounters ce
        LEFT JOIN patients p ON ce.patient_id = p.id
        LEFT JOIN staff s ON ce.staff_id = s.id
        WHERE ce.id = ?`,
        [encounter_id]
      );

      // If this is a REFILL type, update patient's ART refill information
      if (type === 'REFILL') {
        // You might want to track refill history in a separate table
        // For now, just log it
        await logAudit(
          req.user.id,
          'ART_REFILL',
          'clinical_encounters',
          encounter_id,
          patient_id,
          null,
          { encounter_date, notes },
          `ART refill recorded for patient ${patient[0].first_name} ${patient[0].last_name}`,
          req
        );
      }

      // Log audit
      await logAudit(
        req.user.id,
        'INSERT',
        'clinical_encounters',
        encounter_id,
        patient_id,
        null,
        newEncounter[0],
        `Created ${type} encounter for ${patient[0].first_name} ${patient[0].last_name}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Clinical encounter created successfully',
        data: newEncounter[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating encounter:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create encounter' 
      });
    } finally {
      connection.release();
    }
});

// UPDATE encounter
router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('encounterUpdate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if encounter exists
      const [existing] = await connection.execute(
        'SELECT * FROM clinical_encounters WHERE id = ?',
        [req.params.id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Encounter not found' 
        });
      }

      const oldValues = existing[0];
      const {
        encounter_date,
        type,
        notes
      } = req.body;

      // Validate encounter date is not in future if provided
      if (encounter_date && new Date(encounter_date) > new Date()) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Encounter date cannot be in the future' 
        });
      }

      // Build update query
      const updateFields = [];
      const values = [];

      if (encounter_date !== undefined) {
        updateFields.push('encounter_date = ?');
        values.push(encounter_date);
      }
      if (type !== undefined) {
        updateFields.push('type = ?');
        values.push(type);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(notes);
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
        `UPDATE clinical_encounters SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated encounter
      const [updated] = await connection.execute(
        `SELECT 
          ce.*,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          s.first_name as staff_first_name,
          s.last_name as staff_last_name
        FROM clinical_encounters ce
        LEFT JOIN patients p ON ce.patient_id = p.id
        LEFT JOIN staff s ON ce.staff_id = s.id
        WHERE ce.id = ?`,
        [req.params.id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'UPDATE',
        'clinical_encounters',
        req.params.id,
        oldValues.patient_id,
        oldValues,
        updated[0],
        'Updated clinical encounter',
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Encounter updated successfully',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating encounter:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update encounter' 
      });
    } finally {
      connection.release();
    }
});

// DELETE encounter (Admin only)
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if encounter exists
      const [encounter] = await connection.execute(
        `SELECT ce.*, p.first_name, p.last_name 
         FROM clinical_encounters ce
         JOIN patients p ON ce.patient_id = p.id
         WHERE ce.id = ?`,
        [req.params.id]
      );

      if (encounter.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Encounter not found' 
        });
      }

      // Log audit before deletion
      await logAudit(
        req.user.id,
        'DELETE',
        'clinical_encounters',
        req.params.id,
        encounter[0].patient_id,
        encounter[0],
        null,
        `Deleted ${encounter[0].type} encounter for ${encounter[0].first_name} ${encounter[0].last_name}`,
        req
      );

      // Delete encounter
      await connection.execute(
        'DELETE FROM clinical_encounters WHERE id = ?',
        [req.params.id]
      );

      await connection.commit();

      res.json({ 
        success: true,
        message: 'Encounter deleted successfully',
        deleted_encounter: {
          id: encounter[0].id,
          type: encounter[0].type,
          patient_name: `${encounter[0].first_name} ${encounter[0].last_name}`,
          encounter_date: encounter[0].encounter_date
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting encounter:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete encounter' 
      });
    } finally {
      connection.release();
    }
});

module.exports = router;