// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination, validatePatientId } = require('../middleware/validate');
const { logAudit } = require('../utils/audit-logger');
const { 
  generatePatientCode, 
  hashPassword,
  calculateAge,
  paginate,
  buildWhereClause,
  formatDate
} = require('../utils/helpers');

// GET all patients with pagination and filters
router.get('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, offset } = req.pagination;
      
      const {
        search,
        hiv_status,
        sex,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      let query = `
        SELECT 
          p.*,
          u.username as user_username,
          u.email as user_email,
          u.is_active as user_is_active,
          creator.username as created_by_username,
          updater.username as updated_by_username
        FROM patients p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN users creator ON p.created_by = creator.id
        LEFT JOIN users updater ON p.updated_by = updater.id
        WHERE 1=1
      `;
      
      const queryParams = [];

      if (search) {
        query += ` AND (
          p.first_name LIKE ? OR 
          p.last_name LIKE ? OR 
          p.middle_name LIKE ? OR 
          p.patient_facility_code LIKE ? OR
          p.contact_number LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (hiv_status) {
        query += ` AND p.hiv_status = ?`;
        queryParams.push(hiv_status);
      }

      if (sex) {
        query += ` AND p.sex = ?`;
        queryParams.push(sex);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM patients p/,
        'SELECT COUNT(*) as total FROM patients p'
      );
      
      const [countResult] = await pool.execute(countQuery, queryParams);
      const total = countResult[0].total;

      // Add sorting and pagination
      const validSortColumns = ['created_at', 'last_name', 'first_name', 'date_of_birth', 'patient_facility_code'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY p.${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      const [patients] = await pool.execute(query, queryParams);

      // Add age and additional stats for each patient
      for (let patient of patients) {
        patient.age = calculateAge(patient.date_of_birth);
        
        // Get latest lab results
        const [labResults] = await pool.execute(
          `SELECT test_type, result_value, result_unit, test_date 
           FROM lab_results 
           WHERE patient_id = ? 
           ORDER BY test_date DESC LIMIT 5`,
          [patient.id]
        );
        patient.latest_lab_results = labResults;

        // Get upcoming appointments
        const [appointments] = await pool.execute(
          `SELECT a.*, at.type_name 
           FROM appointments a
           LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
           WHERE a.patient_id = ? AND a.scheduled_at >= NOW() AND a.status IN ('SCHEDULED', 'CONFIRMED')
           ORDER BY a.scheduled_at ASC LIMIT 3`,
          [patient.id]
        );
        patient.upcoming_appointments = appointments;

        // Get last visit date
        const [lastVisit] = await pool.execute(
          `SELECT encounter_date FROM clinical_encounters 
           WHERE patient_id = ? 
           ORDER BY encounter_date DESC LIMIT 1`,
          [patient.id]
        );
        patient.last_visit = lastVisit[0]?.encounter_date || null;
      }

      res.json({
        success: true,
        data: patients,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch patients' 
      });
    }
});

// GET patient statistics (for dashboard)
router.get('/stats/overview', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      // Total patients
      const [totalPatients] = await pool.execute(
        'SELECT COUNT(*) as total FROM patients'
      );

      // Patients by HIV status
      const [byStatus] = await pool.execute(
        `SELECT hiv_status, COUNT(*) as count 
         FROM patients 
         GROUP BY hiv_status`
      );

      // Patients by sex
      const [bySex] = await pool.execute(
        `SELECT sex, COUNT(*) as count 
         FROM patients 
         GROUP BY sex`
      );

      // Patients with consent
      const [consent] = await pool.execute(
        `SELECT 
          SUM(CASE WHEN consent = 1 THEN 1 ELSE 0 END) as with_consent,
          SUM(CASE WHEN consent = 0 THEN 1 ELSE 0 END) as without_consent
         FROM patients`
      );

      // Patients on ART (have ART start date)
      const [onART] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM patients 
         WHERE art_start_date IS NOT NULL`
      );

      // Recent registrations (last 30 days)
      const [recentRegistrations] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM patients 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );

      // Age distribution
      const [ageDistribution] = await pool.execute(
        `SELECT 
          CASE 
            WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) < 18 THEN 'Under 18'
            WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 18 AND 30 THEN '18-30'
            WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 31 AND 45 THEN '31-45'
            WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 46 AND 60 THEN '46-60'
            ELSE 'Over 60'
          END as age_group,
          COUNT(*) as count
         FROM patients
         GROUP BY age_group`
      );

      // Monthly registrations (last 6 months)
      const [monthlyRegistrations] = await pool.execute(
        `SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as count
         FROM patients
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month DESC`
      );

      res.json({
        success: true,
        stats: {
          total_patients: totalPatients[0].total,
          by_hiv_status: byStatus,
          by_sex: bySex,
          consent: {
            with_consent: parseInt(consent[0].with_consent || 0),
            without_consent: parseInt(consent[0].without_consent || 0)
          },
          on_art: onART[0].count,
          recent_registrations: recentRegistrations[0].count,
          age_distribution: ageDistribution,
          monthly_registrations: monthlyRegistrations
        }
      });

    } catch (error) {
      console.error('Error fetching patient statistics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch patient statistics' 
      });
    }
});

// SEARCH patients (for dropdown/autocomplete)
router.get('/search/query', 
  authenticateToken, 
  async (req, res) => {
    try {
      const searchTerm = req.query.q || '';
      const limit = parseInt(req.query.limit) || 10;

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      const [patients] = await pool.execute(
        `SELECT 
          p.id, 
          p.patient_facility_code, 
          p.first_name, 
          p.last_name, 
          p.middle_name, 
          p.date_of_birth, 
          p.sex, 
          p.hiv_status,
          p.contact_number,
          CONCAT(p.last_name, ', ', p.first_name, 
                 CASE WHEN p.middle_name IS NOT NULL 
                 THEN CONCAT(' ', p.middle_name) ELSE '' END) as full_name,
          u.username, 
          u.email, 
          u.is_active
         FROM patients p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.first_name LIKE ? OR 
               p.last_name LIKE ? OR 
               p.patient_facility_code LIKE ? OR 
               p.contact_number LIKE ?
         ORDER BY 
           CASE 
             WHEN p.patient_facility_code LIKE ? THEN 1
             WHEN p.last_name LIKE ? THEN 2
             WHEN p.first_name LIKE ? THEN 3
             ELSE 4
           END,
           p.last_name ASC
         LIMIT ?`,
        [
          `%${searchTerm}%`, 
          `%${searchTerm}%`, 
          `%${searchTerm}%`, 
          `%${searchTerm}%`,
          `%${searchTerm}%`,
          `%${searchTerm}%`,
          `%${searchTerm}%`,
          limit
        ]
      );

      res.json(patients);

    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to search patients' 
      });
    }
});

// GET single patient by ID
router.get('/:id', 
  authenticateToken, 
  validatePatientId,
  async (req, res) => {
    try {
      const [patients] = await pool.execute(
        `SELECT 
          p.*,
          u.username as user_username,
          u.email as user_email,
          u.is_active as user_is_active,
          u.last_login as user_last_login,
          creator.username as created_by_username,
          updater.username as updated_by_username
        FROM patients p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN users creator ON p.created_by = creator.id
        LEFT JOIN users updater ON p.updated_by = updater.id
        WHERE p.id = ?`,
        [req.patientId]
      );

      if (patients.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Patient not found' 
        });
      }

      const patient = patients[0];
      patient.age = calculateAge(patient.date_of_birth);

      // Get full medical history with counts
      const [labResults] = await pool.execute(
        `SELECT lr.*, u.username as performed_by_username,
                a.appointment_number
         FROM lab_results lr
         LEFT JOIN users u ON lr.performed_by = u.id
         LEFT JOIN appointments a ON lr.appointment_id = a.id
         WHERE lr.patient_id = ?
         ORDER BY lr.test_date DESC`,
        [patient.id]
      );

      const [appointments] = await pool.execute(
        `SELECT a.*, at.type_name, at.duration_minutes,
                q.queue_number, q.status as queue_status
         FROM appointments a
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         LEFT JOIN queue q ON a.id = q.appointment_id
         WHERE a.patient_id = ?
         ORDER BY a.scheduled_at DESC`,
        [patient.id]
      );

      const [encounters] = await pool.execute(
        `SELECT ce.*, s.first_name as staff_first_name, 
                s.last_name as staff_last_name, s.position
         FROM clinical_encounters ce
         LEFT JOIN staff s ON ce.staff_id = s.id
         WHERE ce.patient_id = ?
         ORDER BY ce.encounter_date DESC`,
        [patient.id]
      );

      // Get summary statistics
      const [summary] = await pool.execute(
        `SELECT
          (SELECT COUNT(*) FROM appointments WHERE patient_id = ?) as total_appointments,
          (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'COMPLETED') as completed_appointments,
          (SELECT COUNT(*) FROM lab_results WHERE patient_id = ?) as total_lab_results,
          (SELECT COUNT(*) FROM clinical_encounters WHERE patient_id = ?) as total_encounters,
          (SELECT MAX(test_date) FROM lab_results WHERE patient_id = ?) as last_lab_date,
          (SELECT MAX(encounter_date) FROM clinical_encounters WHERE patient_id = ?) as last_encounter_date
        `,
        [patient.id, patient.id, patient.id, patient.id, patient.id, patient.id]
      );

      patient.medical_history = {
        lab_results: labResults,
        appointments: appointments,
        clinical_encounters: encounters,
        summary: summary[0]
      };

      res.json({
        success: true,
        patient
      });

    } catch (error) {
      console.error('Error fetching patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch patient' 
      });
    }
});

// CREATE new patient
router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('patientCreate'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        sex,
        address,
        contact_number,
        consent,
        hiv_status,
        diagnosis_date,
        art_start_date,
        latest_cd4_count,
        latest_viral_load,
        create_user_account = false,
        email,
        username,
        password_hash
      } = req.body;

      // Validate ART start date relative to diagnosis date
      if (art_start_date && diagnosis_date && new Date(art_start_date) < new Date(diagnosis_date)) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'ART start date cannot be before diagnosis date' 
        });
      }

      // Generate patient facility code
      const patient_facility_code = await generatePatientCode(connection);

      let user_id = null;

      // Create user account if requested
      if (create_user_account) {
        // Check if username exists
        const [existingUser] = await connection.execute(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );

        if (existingUser.length > 0) {
          await connection.rollback();
          return res.status(400).json({ 
            success: false,
            error: 'Username already exists' 
          });
        }

        // Check if email exists
        if (email) {
          const [existingEmail] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
          );

          if (existingEmail.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
              success: false,
              error: 'Email already exists' 
            });
          }
        }

        // Hash password if provided as plain text
        let hashedPassword = password_hash;
        if (password_hash && !password_hash.startsWith('$2b$')) {
          hashedPassword = await hashPassword(password_hash);
        }

        // Create user
        const [userResult] = await connection.execute(
          `INSERT INTO users (username, password_hash, email, role, is_active, created_at, updated_at) 
           VALUES (?, ?, ?, 'PATIENT', 1, NOW(), NOW())`,
          [username, hashedPassword, email || null]
        );
        
        user_id = userResult.insertId;
      }

      // Insert patient
      const [result] = await connection.execute(
        `INSERT INTO patients (
          patient_facility_code, user_id, first_name, last_name, middle_name,
          date_of_birth, sex, address, contact_number, consent,
          hiv_status, diagnosis_date, art_start_date, latest_cd4_count,
          latest_viral_load, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          patient_facility_code,
          user_id,
          first_name,
          last_name,
          middle_name || null,
          date_of_birth,
          sex,
          address || null,
          contact_number || null,
          consent ? 1 : 0,
          hiv_status,
          diagnosis_date || null,
          art_start_date || null,
          latest_cd4_count || null,
          latest_viral_load || null,
          req.user.id,
          req.user.id
        ]
      );

      const patient_id = result.insertId;

      // Fetch the created patient
      const [newPatient] = await connection.execute(
        `SELECT p.*, u.username, u.email 
         FROM patients p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [patient_id]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'INSERT',
        'patients',
        patient_id,
        patient_id,
        null,
        newPatient[0],
        `Created patient record for ${first_name} ${last_name}`,
        req
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        patient: newPatient[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create patient' 
      });
    } finally {
      connection.release();
    }
});

// UPDATE patient
router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'NURSE'),
  validate('patientUpdate'),
  validatePatientId,
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if patient exists and get old values
      const [existingPatient] = await connection.execute(
        'SELECT * FROM patients WHERE id = ?',
        [req.patientId]
      );

      if (existingPatient.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Patient not found' 
        });
      }

      const oldValues = existingPatient[0];

      const {
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        sex,
        address,
        contact_number,
        consent,
        hiv_status,
        diagnosis_date,
        art_start_date,
        latest_cd4_count,
        latest_viral_load
      } = req.body;

      // Validate ART start date relative to diagnosis date
      if (art_start_date && (diagnosis_date || oldValues.diagnosis_date)) {
        const diagDate = diagnosis_date || oldValues.diagnosis_date;
        if (diagDate && new Date(art_start_date) < new Date(diagDate)) {
          await connection.rollback();
          return res.status(400).json({ 
            success: false,
            error: 'ART start date cannot be before diagnosis date' 
          });
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(first_name);
      }
      if (last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(last_name);
      }
      if (middle_name !== undefined) {
        updateFields.push('middle_name = ?');
        updateValues.push(middle_name || null);
      }
      if (date_of_birth !== undefined) {
        updateFields.push('date_of_birth = ?');
        updateValues.push(date_of_birth);
      }
      if (sex !== undefined) {
        updateFields.push('sex = ?');
        updateValues.push(sex);
      }
      if (address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(address || null);
      }
      if (contact_number !== undefined) {
        updateFields.push('contact_number = ?');
        updateValues.push(contact_number || null);
      }
      if (consent !== undefined) {
        updateFields.push('consent = ?');
        updateValues.push(consent ? 1 : 0);
      }
      if (hiv_status !== undefined) {
        updateFields.push('hiv_status = ?');
        updateValues.push(hiv_status);
      }
      if (diagnosis_date !== undefined) {
        updateFields.push('diagnosis_date = ?');
        updateValues.push(diagnosis_date || null);
      }
      if (art_start_date !== undefined) {
        updateFields.push('art_start_date = ?');
        updateValues.push(art_start_date || null);
      }
      if (latest_cd4_count !== undefined) {
        updateFields.push('latest_cd4_count = ?');
        updateValues.push(latest_cd4_count || null);
      }
      if (latest_viral_load !== undefined) {
        updateFields.push('latest_viral_load = ?');
        updateValues.push(latest_viral_load || null);
      }

      // Always update updated_by and updated_at
      updateFields.push('updated_by = ?');
      updateValues.push(req.user.id);
      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 2) { // Only updated_by and updated_at
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'No fields to update' 
        });
      }

      // Add patient ID to values array
      updateValues.push(req.patientId);

      const query = `UPDATE patients SET ${updateFields.join(', ')} WHERE id = ?`;
      await connection.execute(query, updateValues);

      // Fetch updated patient
      const [updatedPatient] = await connection.execute(
        `SELECT p.*, u.username, u.email 
         FROM patients p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [req.patientId]
      );

      // Log audit
      await logAudit(
        req.user.id,
        'UPDATE',
        'patients',
        req.patientId,
        req.patientId,
        oldValues,
        updatedPatient[0],
        `Updated patient record for ${updatedPatient[0].first_name} ${updatedPatient[0].last_name}`,
        req
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Patient updated successfully',
        patient: updatedPatient[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating patient:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update patient' 
      });
    } finally {
      connection.release();
    }
});

// DELETE patient (soft delete - deactivate user account instead)
router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'),
  validatePatientId,
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if patient exists
      const [patient] = await connection.execute(
        'SELECT * FROM patients WHERE id = ?',
        [req.patientId]
      );

      if (patient.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Patient not found' 
        });
      }

      // Check if patient has any future appointments
      const [futureAppointments] = await connection.execute(
        `SELECT id FROM appointments 
         WHERE patient_id = ? AND scheduled_at > NOW() 
         AND status IN ('SCHEDULED', 'CONFIRMED')`,
        [req.patientId]
      );

      if (futureAppointments.length > 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Cannot delete patient with future appointments. Please cancel appointments first.' 
        });
      }

      // If patient has a user account, deactivate it
      if (patient[0].user_id) {
        await connection.execute(
          'UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
          [patient[0].user_id]
        );
      }

      // Log audit before deletion
      await logAudit(
        req.user.id,
        'DELETE',
        'patients',
        req.patientId,
        req.patientId,
        patient[0],
        null,
        `Deleted patient record for ${patient[0].first_name} ${patient[0].last_name}`,
        req
      );

      // Delete patient (cascade will handle related records)
      await connection.execute(
        'DELETE FROM patients WHERE id = ?',
        [req.patientId]
      );

      await connection.commit();

      res.json({ 
        success: true,
        message: 'Patient deleted successfully',
        deleted_patient: {
          id: patient[0].id,
          patient_facility_code: patient[0].patient_facility_code,
          name: `${patient[0].first_name} ${patient[0].last_name}`
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting patient:', error);
      
      // Check if foreign key constraint error
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete patient. There are related records. Please remove associations first.'
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete patient' 
      });
    } finally {
      connection.release();
    }
});

// GET patient summary/dashboard data
router.get('/:id/summary', 
  authenticateToken, 
  validatePatientId,
  async (req, res) => {
    try {
      const patientId = req.patientId;

      // Get patient basic info
      const [patient] = await pool.execute(
        'SELECT * FROM patients WHERE id = ?',
        [patientId]
      );

      if (patient.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Patient not found' 
        });
      }

      // Get upcoming appointment
      const [nextAppointment] = await pool.execute(
        `SELECT a.*, at.type_name, at.duration_minutes
         FROM appointments a
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.patient_id = ? AND a.scheduled_at >= NOW() 
           AND a.status IN ('SCHEDULED', 'CONFIRMED')
         ORDER BY a.scheduled_at ASC LIMIT 1`,
        [patientId]
      );

      // Get last visit
      const [lastVisit] = await pool.execute(
        `SELECT ce.*, s.first_name as staff_first_name, 
                s.last_name as staff_last_name, s.position
         FROM clinical_encounters ce
         LEFT JOIN staff s ON ce.staff_id = s.id
         WHERE ce.patient_id = ? 
         ORDER BY ce.encounter_date DESC LIMIT 1`,
        [patientId]
      );

      // Get latest lab results
      const [latestCD4] = await pool.execute(
        `SELECT * FROM lab_results 
         WHERE patient_id = ? AND test_type = 'CD4'
         ORDER BY test_date DESC LIMIT 1`,
        [patientId]
      );

      const [latestVL] = await pool.execute(
        `SELECT * FROM lab_results 
         WHERE patient_id = ? AND test_type = 'VIRAL_LOAD'
         ORDER BY test_date DESC LIMIT 1`,
        [patientId]
      );

      // Get appointment counts by status
      const [appointmentStats] = await pool.execute(
        `SELECT status, COUNT(*) as count 
         FROM appointments 
         WHERE patient_id = ? 
         GROUP BY status`,
        [patientId]
      );

      // Get treatment adherence (if on ART)
      let adherence = null;
      if (patient[0].art_start_date) {
        const [missedAppointments] = await pool.execute(
          `SELECT COUNT(*) as missed
           FROM appointments
           WHERE patient_id = ? 
             AND status = 'NO_SHOW'
             AND scheduled_at >= ?`,
          [patientId, patient[0].art_start_date]
        );
        
        const [totalAppointments] = await pool.execute(
          `SELECT COUNT(*) as total
           FROM appointments
           WHERE patient_id = ? 
             AND scheduled_at >= ?`,
          [patientId, patient[0].art_start_date]
        );

        if (totalAppointments[0].total > 0) {
          const missed = missedAppointments[0].missed;
          const total = totalAppointments[0].total;
          adherence = {
            rate: ((total - missed) / total * 100).toFixed(1),
            missed_appointments: missed,
            total_appointments: total
          };
        }
      }

      // Get recent activity (last 10 events)
      const [recentActivity] = await pool.execute(
        `(SELECT 
            'appointment' as type, 
            created_at, 
            scheduled_at as event_date,
            CONCAT('Appointment ', status, ' - ', at.type_name) as description,
            status
          FROM appointments a
          LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
          WHERE a.patient_id = ?)
         UNION ALL
         (SELECT 
            'lab' as type,
            lr.created_at,
            test_date as event_date,
            CONCAT('Lab result: ', test_type, ' = ', result_value, ' ', result_unit) as description,
            NULL as status
          FROM lab_results lr
          WHERE lr.patient_id = ?)
         UNION ALL
         (SELECT 
            'encounter' as type,
            ce.created_at,
            encounter_date as event_date,
            CONCAT('Clinical encounter: ', ce.type) as description,
            NULL as status
          FROM clinical_encounters ce
          WHERE ce.patient_id = ?)
         ORDER BY created_at DESC 
         LIMIT 10`,
        [patientId, patientId, patientId]
      );

      res.json({
        success: true,
        summary: {
          patient_info: {
            id: patient[0].id,
            patient_facility_code: patient[0].patient_facility_code,
            name: `${patient[0].first_name} ${patient[0].last_name}`,
            age: calculateAge(patient[0].date_of_birth),
            sex: patient[0].sex,
            hiv_status: patient[0].hiv_status,
            on_art: patient[0].art_start_date !== null,
            art_start_date: patient[0].art_start_date,
            diagnosis_date: patient[0].diagnosis_date
          },
          next_appointment: nextAppointment[0] || null,
          last_visit: lastVisit[0] || null,
          latest_cd4: latestCD4[0] || null,
          latest_viral_load: latestVL[0] || null,
          appointment_statistics: appointmentStats,
          treatment_adherence: adherence,
          recent_activity: recentActivity
        }
      });

    } catch (error) {
      console.error('Error fetching patient summary:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch patient summary' 
      });
    }
});

// GET patient appointments
router.get('/:id/appointments', 
  authenticateToken, 
  validatePatientId,
  validatePagination,
  async (req, res) => {
    try {
      const patientId = req.patientId;
      const { page, limit, offset } = req.pagination;
      const status = req.query.status;

      let query = `
        SELECT 
          a.*, 
          at.type_name, 
          at.duration_minutes,
          q.queue_number, 
          q.status as queue_status,
          q.called_at,
          q.served_at,
          q.completed_at
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE a.patient_id = ?
      `;
      
      const params = [patientId];

      if (status) {
        query += ` AND a.status = ?`;
        params.push(status);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT.*FROM appointments a/,
        'SELECT COUNT(*) as total FROM appointments a'
      );
      
      const [countResult] = await pool.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      query += ` ORDER BY a.scheduled_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [appointments] = await pool.execute(query, params);

      res.json({
        success: true,
        data: appointments,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch appointments' 
      });
    }
});

// GET patient lab results
router.get('/:id/lab-results', 
  authenticateToken, 
  validatePatientId,
  validatePagination,
  async (req, res) => {
    try {
      const patientId = req.patientId;
      const { page, limit, offset } = req.pagination;
      const testType = req.query.test_type;

      let query = `
        SELECT 
          lr.*, 
          u.username as performed_by_username,
          a.appointment_number, 
          a.scheduled_at
        FROM lab_results lr
        LEFT JOIN users u ON lr.performed_by = u.id
        LEFT JOIN appointments a ON lr.appointment_id = a.id
        WHERE lr.patient_id = ?
      `;
      
      const params = [patientId];

      if (testType) {
        query += ` AND lr.test_type = ?`;
        params.push(testType);
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

      const [labResults] = await pool.execute(query, params);

      // Group by test type for easier consumption
      const grouped = {};
      labResults.forEach(result => {
        if (!grouped[result.test_type]) {
          grouped[result.test_type] = [];
        }
        grouped[result.test_type].push(result);
      });

      res.json({
        success: true,
        data: labResults,
        grouped_by_type: grouped,
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

// GET patient clinical encounters
router.get('/:id/encounters', 
  authenticateToken, 
  validatePatientId,
  validatePagination,
  async (req, res) => {
    try {
      const patientId = req.patientId;
      const { page, limit, offset } = req.pagination;
      const type = req.query.type;

      let query = `
        SELECT 
          ce.*, 
          s.first_name as staff_first_name, 
          s.last_name as staff_last_name, 
          s.position,
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

      res.json({
        success: true,
        data: encounters,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching clinical encounters:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch encounters' 
      });
    }
});

// GET patient queue history
router.get('/:id/queue-history', 
  authenticateToken, 
  validatePatientId,
  validatePagination,
  async (req, res) => {
    try {
      const patientId = req.patientId;
      const { page, limit, offset } = req.pagination;

      const [queueHistory] = await pool.execute(
        `SELECT 
          q.*, 
          a.appointment_number, 
          a.scheduled_at,
          at.type_name
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.patient_id = ?
         ORDER BY q.created_at DESC
         LIMIT ? OFFSET ?`,
        [patientId, limit, offset]
      );

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         WHERE a.patient_id = ?`,
        [patientId]
      );

      res.json({
        success: true,
        data: queueHistory,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching queue history:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch queue history' 
      });
    }
});

module.exports = router;