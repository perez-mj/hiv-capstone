// backend/routes/patients.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// Helper function to generate patient ID (HIV-YY-ABCXYZ format)
function generatePatientId(firstName, lastName, middleName, hivStatus, year) {
  // Get initials from name: Firstname + Middlename + Lastname
  let initials = '';

  // First name initial
  if (firstName && firstName.length > 0) {
    initials += firstName.charAt(0).toUpperCase();
  }

  // Middle name initial (if exists)
  if (middleName && middleName.length > 0) {
    initials += middleName.charAt(0).toUpperCase();
  } else {
    initials += 'X'; // Padding if no middle name
  }

  // Last name initial
  if (lastName && lastName.length > 0) {
    initials += lastName.charAt(0).toUpperCase();
  }

  // Ensure we have exactly 3 initials, pad with X if needed
  while (initials.length < 3) {
    initials += 'X';
  }

  // Take first 3 characters only
  initials = initials.substring(0, 3);

  // Generate suffix (3 random uppercase letters)
  const randomLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += randomLetters.charAt(Math.floor(Math.random() * randomLetters.length));
  }

  // Format: PR19-JPR or P19-JPR
  const prefix = hivStatus === 'REACTIVE' ? 'PR' : 'P';

  return `${prefix}${year}-${initials}${suffix}`;
}

// GET /api/patients/stats - Get patient statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    console.log('Fetching patient statistics...');

    // Get total patients count
    const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM patients');
    const total = totalResult[0].total;

    // Get consented patients count
    const [consentedResult] = await pool.execute('SELECT COUNT(*) as consented FROM patients WHERE consent = TRUE');
    const consented = consentedResult[0].consented;

    // Get HIV status counts
    const [hivResults] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive,
        SUM(CASE WHEN hiv_status = 'NON_REACTIVE' THEN 1 ELSE 0 END) as non_reactive
      FROM patients
    `);
    const hivStats = hivResults[0];

    // Get daily enrollments (last 24 hours)
    const [dailyResult] = await pool.execute(`
      SELECT COUNT(*) as daily_enrollments 
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    const dailyEnrollments = dailyResult[0].daily_enrollments;

    // Get enrollment trends (last 7 days)
    const [trendsResult] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM patients 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get consent status breakdown
    const [consentBreakdown] = await pool.execute(`
      SELECT 
        CASE 
          WHEN consent = TRUE THEN 'Consented'
          ELSE 'Not Consented'
        END as status,
        COUNT(*) as count
      FROM patients
      GROUP BY consent
    `);

    const stats = {
      total: parseInt(total),
      consented: parseInt(consented),
      reactive: parseInt(hivStats.reactive) || 0,
      non_reactive: parseInt(hivStats.non_reactive) || 0,
      daily_enrollments: parseInt(dailyEnrollments),
      enrollment_trends: trendsResult,
      consent_breakdown: consentBreakdown,
      consent_rate: total > 0 ? Math.round((consented / total) * 100) : 0,
      reactive_rate: total > 0 ? Math.round((hivStats.reactive / total) * 100) : 0,
      non_reactive_rate: total > 0 ? Math.round((hivStats.non_reactive / total) * 100) : 0
    };

    console.log('Patient statistics fetched successfully:', {
      total: stats.total,
      consented: stats.consented,
      reactive: stats.reactive
    });

    res.json(stats);

  } catch (err) {
    console.error('Error fetching patient statistics:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// GET /api/patients/list - Get simple patient list for dropdowns
router.get('/list', async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        patient_id,
        CONCAT(last_name, ', ', first_name, COALESCE(CONCAT(' ', middle_name), '')) as full_name,
        first_name,
        last_name,
        middle_name
      FROM patients
      WHERE 1=1
    `;

    const params = [];
    const searchTerm = `%${search}%`;
    if (search) {
      query += ` AND (first_name LIKE ${searchTerm} OR last_name LIKE ${searchTerm} OR middle_name LIKE ${searchTerm} OR patient_id LIKE ${searchTerm})`;
    }

    query += ` ORDER BY last_name ASC, first_name ASC`;

    const [rows] = await pool.execute(query, params);

    res.json({
      patients: rows
    });

  } catch (err) {
    console.error('Error fetching patient list:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/patients - Get all patients with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, consent, hiv_status } = req.query;

    // Convert to integers with defaults
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Build the main query
    let query = `
      SELECT 
        p.id,
        p.patient_id,
        p.first_name,
        p.last_name,
        p.middle_name,
        CONCAT(p.last_name, ', ', p.first_name, COALESCE(CONCAT(' ', p.middle_name), '')) as full_name,
        p.date_of_birth,
        p.gender,
        p.address,
        p.contact_number,
        p.consent,
        p.hiv_status,
        p.diagnosis_date,
        p.art_start_date,
        p.latest_cd4_count,
        p.latest_viral_load,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.consent = 1 THEN 'YES'
          WHEN p.consent = 0 THEN 'NO'
          ELSE 'NO'
        END as consent_status,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age
      FROM patients p
      WHERE 1=1
    `;

    const params = [];

    const searchTerm = `%${search}%`;

    if (search) {
      query += ` AND (
        p.first_name LIKE ${searchTerm} OR 
        p.last_name LIKE ${searchTerm} OR 
        p.middle_name LIKE ${searchTerm} OR 
        p.patient_id LIKE ${searchTerm} OR 
        p.contact_number LIKE ${searchTerm}
      )`;
    }

    if (consent) {
      if (consent === 'YES') {
        query += ' AND p.consent = TRUE';
      } else if (consent === 'NO') {
        query += ' AND p.consent = FALSE';
      }
    }

    if (hiv_status) {
      query += ` AND p.hiv_status = ${hiv_status}`;
    }

    // Get total count first
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM patients p
      WHERE 1=1
    `;
    const countParams = [...params];

    // Add ORDER BY and LIMIT/OFFSET to main query
    query += ` ORDER BY p.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    // Execute count query
    const [countRows] = await pool.execute(countQuery, countParams);
    const total = parseInt(countRows[0].total);

    // Execute main query
    const [rows] = await pool.execute(query, params);

    res.json({
      patients: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/patients/:id - Get single patient
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.id,
        p.patient_id,
        p.first_name,
        p.last_name,
        p.middle_name,
        CONCAT(p.last_name, ', ', p.first_name, COALESCE(CONCAT(' ', p.middle_name), '')) as full_name,
        p.date_of_birth,
        p.gender,
        p.address,
        p.contact_number,
        p.consent,
        p.hiv_status,
        p.diagnosis_date,
        p.art_start_date,
        p.latest_cd4_count,
        p.latest_viral_load,
        p.created_at,
        p.updated_at,
        p.created_by,
        p.updated_by,
        CASE 
          WHEN p.consent = 1 THEN 'YES'
          WHEN p.consent = 0 THEN 'NO'
          ELSE 'NO'
        END as consent_status,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age
      FROM patients p
      WHERE p.patient_id = ?
    `;

    const [rows] = await pool.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/patients - Create new patient
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let {
      patient_id,
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      gender,
      address,
      contact_number,
      consent,
      hiv_status,
      diagnosis_date,
      art_start_date,
      latest_cd4_count,
      latest_viral_load
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !date_of_birth || !gender || !hiv_status) {
      return res.status(400).json({
        error: 'Missing required fields: first_name, last_name, date_of_birth, gender, and hiv_status are required'
      });
    }

    // Validate gender
    if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender. Must be either "MALE", "FEMALE", or "OTHER"'
      });
    }

    // Validate HIV status
    if (!['REACTIVE', 'NON_REACTIVE'].includes(hiv_status)) {
      return res.status(400).json({
        error: 'Invalid hiv_status. Must be either "REACTIVE" or "NON_REACTIVE"'
      });
    }

    const consentBool = Boolean(consent);
    const userInfo = getUserInfo(req);

    // Generate patient ID if not provided
    if (!patient_id) {
      // Get current year (2-digit format)
      const currentYear = new Date().getFullYear().toString().slice(-2);

      // For new patients, use current year
      const year = currentYear;

      // Generate patient ID using custom function
      patient_id = generatePatientId(first_name, last_name, middle_name, hiv_status, year);

      // Check if patient ID already exists, if yes, generate a new one
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const [existing] = await connection.execute(
          'SELECT patient_id FROM patients WHERE patient_id = ?',
          [patient_id]
        );

        if (existing.length === 0) {
          break; // ID is unique
        }

        // Regenerate with new random suffix
        patient_id = generatePatientId(first_name, last_name, middle_name, hiv_status, year);
        attempts++;
      }

      // If we couldn't find a unique ID after max attempts
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique patient ID. Please try again.');
      }
    }

    const [result] = await connection.execute(
      `INSERT INTO patients
       (patient_id, first_name, last_name, middle_name, date_of_birth, gender, 
        address, contact_number, consent, hiv_status, diagnosis_date, art_start_date,
        latest_cd4_count, latest_viral_load, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id, first_name, last_name, middle_name || null, date_of_birth, gender,
        address || null, contact_number || null, consentBool, hiv_status,
        diagnosis_date || null, art_start_date || null,
        latest_cd4_count || null, latest_viral_load || null,
        userInfo.admin_user_id, userInfo.admin_user_id
      ]
    );

    // Log the action to audit_logs
    await connection.execute(
      `INSERT INTO audit_logs 
       (user_id, action_type, table_name, record_id, patient_id, new_values, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userInfo.admin_user_id,
        'INSERT',
        'patients',
        patient_id,
        patient_id,
        JSON.stringify(req.body),
        `Created new patient: ${last_name}, ${first_name}`,
        userInfo.ip_address,
        req.headers['user-agent'] || null
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Patient created successfully',
      patient: {
        patient_id,
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        gender,
        address,
        contact_number,
        consent: consentBool,
        hiv_status,
        diagnosis_date,
        art_start_date,
        latest_cd4_count,
        latest_viral_load
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error creating patient:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Patient ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  } finally {
    connection.release();
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      gender,
      address,
      contact_number,
      consent,
      hiv_status,
      diagnosis_date,
      art_start_date,
      latest_cd4_count,
      latest_viral_load
    } = req.body;

    if (!first_name || !last_name || !date_of_birth || !gender || !hiv_status) {
      return res.status(400).json({
        error: 'Missing required fields: first_name, last_name, date_of_birth, gender, and hiv_status are required'
      });
    }

    // Validate gender
    if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender. Must be either "MALE", "FEMALE", or "OTHER"'
      });
    }

    // Validate HIV status
    if (!['REACTIVE', 'NON_REACTIVE'].includes(hiv_status)) {
      return res.status(400).json({
        error: 'Invalid hiv_status. Must be either "REACTIVE" or "NON_REACTIVE"'
      });
    }

    const consentBool = Boolean(consent);
    const userInfo = getUserInfo(req);

    // First, check if patient exists and get current data
    const [checkRows] = await connection.execute(
      'SELECT * FROM patients WHERE patient_id = ?',
      [id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const currentPatient = checkRows[0];

    // Check if HIV status changed from NON_REACTIVE to REACTIVE
    // If so, we should update the patient ID to reflect the new status
    let newPatientId = id;
    if (currentPatient.hiv_status === 'NON_REACTIVE' && hiv_status === 'REACTIVE') {
      // Generate new patient ID with PR prefix
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const year = new Date(currentPatient.created_at).getFullYear().toString().slice(-2) || currentYear;
      newPatientId = generatePatientId(first_name, last_name, middle_name, hiv_status, year);

      // Check if new ID already exists
      const [existing] = await connection.execute(
        'SELECT patient_id FROM patients WHERE patient_id = ?',
        [newPatientId]
      );

      if (existing.length > 0) {
        // Append a number to make it unique
        let counter = 1;
        while (counter < 10) {
          newPatientId = generatePatientId(first_name, last_name, middle_name, hiv_status, year) + counter;
          const [check] = await connection.execute(
            'SELECT patient_id FROM patients WHERE patient_id = ?',
            [newPatientId]
          );
          if (check.length === 0) break;
          counter++;
        }
      }
    }

    // Update patient
    const [result] = await connection.execute(
      `UPDATE patients
       SET patient_id = ?, first_name = ?, last_name = ?, middle_name = ?, 
           date_of_birth = ?, gender = ?, address = ?, contact_number = ?, 
           consent = ?, hiv_status = ?, diagnosis_date = ?, art_start_date = ?,
           latest_cd4_count = ?, latest_viral_load = ?, updated_by = ?
       WHERE patient_id = ?`,
      [
        newPatientId, first_name, last_name, middle_name || null,
        date_of_birth, gender, address || null, contact_number || null,
        consentBool, hiv_status, diagnosis_date || null, art_start_date || null,
        latest_cd4_count || null, latest_viral_load || null,
        userInfo.admin_user_id, id
      ]
    );

    // Log the action to audit_logs
    await connection.execute(
      `INSERT INTO audit_logs 
       (user_id, action_type, table_name, record_id, patient_id, old_values, new_values, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userInfo.admin_user_id,
        'UPDATE',
        'patients',
        newPatientId,
        newPatientId,
        JSON.stringify(currentPatient),
        JSON.stringify(req.body),
        `Updated patient: ${last_name}, ${first_name}`,
        userInfo.ip_address,
        req.headers['user-agent'] || null
      ]
    );

    await connection.commit();

    res.json({
      message: 'Patient updated successfully',
      new_patient_id: newPatientId !== id ? newPatientId : undefined
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error updating patient:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // First, get patient info for audit log
    const [patientRows] = await connection.execute(
      'SELECT first_name, last_name FROM patients WHERE patient_id = ?',
      [id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientRows[0];
    const userInfo = getUserInfo(req);

    // Log the action to audit_logs
    await connection.execute(
      `INSERT INTO audit_logs 
       (user_id, action_type, table_name, record_id, patient_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userInfo.admin_user_id,
        'DELETE',
        'patients',
        id,
        id,
        `Deleted patient: ${patient.last_name}, ${patient.first_name}`,
        userInfo.ip_address,
        req.headers['user-agent'] || null
      ]
    );

    // Delete patient
    await connection.execute('DELETE FROM patients WHERE patient_id = ?', [id]);

    await connection.commit();

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Error deleting patient:', err);

    // Check if foreign key constraint error
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: 'Cannot delete patient. There are related records (appointments, prescriptions, or lab results). Please delete those first or contact administrator.'
      });
    }

    res.status(500).json({ error: 'Internal server error', message: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;