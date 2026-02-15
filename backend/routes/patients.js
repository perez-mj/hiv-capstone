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
function generatePatientId(name, hivStatus, year) {
  // Get initials from name: Firstname + Middlename + Lastname
  const nameParts = name.trim().split(' ');
  let initials = '';
  
  if (nameParts.length >= 1) {
    initials += nameParts[0].charAt(0).toUpperCase(); // Firstname initial
  }
  if (nameParts.length >= 2) {
    // Check if middle name has a period (like "P.") or is a single letter
    const middlePart = nameParts[1];
    if (middlePart.length === 1 || (middlePart.length === 2 && middlePart.endsWith('.'))) {
      initials += middlePart.charAt(0).toUpperCase(); // Middle initial
    } else if (nameParts.length >= 3) {
      // If second part is not a middle initial, try third part
      initials += nameParts[2].charAt(0).toUpperCase(); // Lastname initial
    } else {
      initials += nameParts[1].charAt(0).toUpperCase(); // Use second part as lastname
    }
  }
  if (nameParts.length >= 3) {
    initials += nameParts[nameParts.length - 1].charAt(0).toUpperCase(); // Lastname initial
  }
  
  // Ensure we have at least 3 initials, pad with X if needed
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
  const prefix = hivStatus === 'Reactive' ? 'PR' : 'P';
  
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
        SUM(CASE WHEN hiv_status = 'Reactive' THEN 1 ELSE 0 END) as reactive,
        SUM(CASE WHEN hiv_status = 'Non-Reactive' THEN 1 ELSE 0 END) as non_reactive
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
      SELECT DISTINCT
        patient_id,
        name
      FROM patients
      WHERE 1=1
    `;
    
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR patient_id LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY name ASC`;

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

    // Build the main query WITHOUT parameterized LIMIT/OFFSET
    let query = `
      SELECT 
        p.id,
        p.patient_id,
        p.name,
        p.date_of_birth,
        p.contact_info,
        p.consent,
        p.hiv_status,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.consent = 1 THEN 'YES'
          WHEN p.consent = 0 THEN 'NO'
          ELSE 'NO'
        END as consent_status
      FROM patients p
      WHERE 1=1
    `;
    
    const params = [];

    if (search) {
      query += ` AND (p.name LIKE ? OR p.patient_id LIKE ? OR p.contact_info LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (consent) {
      if (consent === 'YES') {
        query += ' AND p.consent = TRUE';
      } else if (consent === 'NO') {
        query += ' AND p.consent = FALSE';
      }
    }

    if (hiv_status) {
      query += ` AND p.hiv_status = ?`;
      params.push(hiv_status);
    }

    // Use string interpolation for LIMIT/OFFSET to avoid parameter issues
    query += ` ORDER BY p.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM patients p
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (p.name LIKE ? OR p.patient_id LIKE ? OR p.contact_info LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (consent) {
      if (consent === 'YES') {
        countQuery += ' AND p.consent = TRUE';
      } else if (consent === 'NO') {
        countQuery += ' AND p.consent = FALSE';
      }
    }

    if (hiv_status) {
      countQuery += ` AND p.hiv_status = ?`;
      countParams.push(hiv_status);
    }

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = parseInt(countRows[0].total);

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
        p.name,
        p.date_of_birth,
        p.contact_info,
        p.consent,
        p.hiv_status,
        p.created_at,
        p.updated_at,
        CASE 
          WHEN p.consent = 1 THEN 'YES'
          WHEN p.consent = 0 THEN 'NO'
          ELSE 'NO'
        END as consent_status
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

// POST /api/patients - Create new patient (UPDATED TO REMOVE DEFAULT ID GENERATION)
router.post('/', async (req, res) => {
  try {
    let { patient_id, name, date_of_birth, contact_info, consent, hiv_status } = req.body;

    // Validate required fields
    if (!name || !date_of_birth || !hiv_status) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, date_of_birth, and hiv_status are required' 
      });
    }

    // Validate HIV status
    if (!['Reactive', 'Non-Reactive'].includes(hiv_status)) {
      return res.status(400).json({ 
        error: 'Invalid hiv_status. Must be either "Reactive" or "Non-Reactive"' 
      });
    }

    const consentBool = Boolean(consent);
    
    // REMOVED: The default ID generation (HIV-timestamp-random)
    // Only use the custom generatePatientId function if no patient_id provided
    if (!patient_id) {
      // Get current year (2-digit format)
      const currentYear = new Date().getFullYear().toString().slice(-2);
      
      // For new patients, use current year
      const year = currentYear;
      
      // Generate patient ID using custom function
      patient_id = generatePatientId(name, hiv_status, year);
      
      // Check if patient ID already exists, if yes, generate a new one
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const [existing] = await pool.execute(
          'SELECT patient_id FROM patients WHERE patient_id = ?',
          [patient_id]
        );
        
        if (existing.length === 0) {
          break; // ID is unique
        }
        
        // Regenerate with new random suffix
        patient_id = generatePatientId(name, hiv_status, year);
        attempts++;
      }
      
      // If we couldn't find a unique ID after max attempts
      if (attempts >= maxAttempts) {
        return res.status(500).json({ 
          error: 'Failed to generate unique patient ID. Please try again.' 
        });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO patients
       (patient_id, name, date_of_birth, contact_info, consent, hiv_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, name, date_of_birth, contact_info || null, consentBool, hiv_status]
    );

    const userInfo = getUserInfo(req);
   
    // Log the action


    res.status(201).json({
      message: 'Patient created successfully',
      patient: {
        patient_id,
        name,
        date_of_birth,
        contact_info,
        consent: consentBool,
        hiv_status
      }
    });
  } catch (err) {
    console.error('Error creating patient:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Patient ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date_of_birth, contact_info, consent, hiv_status } = req.body;

    if (!name || !date_of_birth || !hiv_status) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, date_of_birth, and hiv_status are required' 
      });
    }

    // Validate HIV status
    if (!['Reactive', 'Non-Reactive'].includes(hiv_status)) {
      return res.status(400).json({ 
        error: 'Invalid hiv_status. Must be either "Reactive" or "Non-Reactive"' 
      });
    }

    const consentBool = Boolean(consent);

    // First, check if patient exists and get current data
    const [checkRows] = await pool.execute(
      'SELECT patient_id, hiv_status, created_at FROM patients WHERE patient_id = ?',
      [id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const currentPatient = checkRows[0];
    
    // Check if HIV status changed from Non-Reactive to Reactive
    // If so, we should update the patient ID to reflect the new status
    let newPatientId = id;
    if (currentPatient.hiv_status === 'Non-Reactive' && hiv_status === 'Reactive') {
      // Generate new patient ID with PR prefix
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const year = new Date(currentPatient.created_at).getFullYear().toString().slice(-2) || currentYear;
      newPatientId = generatePatientId(name, hiv_status, year);
      
      // Check if new ID already exists
      const [existing] = await pool.execute(
        'SELECT patient_id FROM patients WHERE patient_id = ?',
        [newPatientId]
      );
      
      if (existing.length > 0) {
        // Append a number to make it unique
        let counter = 1;
        while (counter < 10) {
          newPatientId = generatePatientId(name, hiv_status, year) + counter;
          const [check] = await pool.execute(
            'SELECT patient_id FROM patients WHERE patient_id = ?',
            [newPatientId]
          );
          if (check.length === 0) break;
          counter++;
        }
      }
    }

    // Update patient
    const [result] = await pool.execute(
      `UPDATE patients
       SET patient_id = ?, name = ?, date_of_birth = ?, contact_info = ?, consent = ?, hiv_status = ?
       WHERE patient_id = ?`,
      [newPatientId, name, date_of_birth, contact_info || null, consentBool, hiv_status, id]
    );

    const userInfo = getUserInfo(req);

    // Log the action


    res.json({ 
      message: 'Patient updated successfully',
      new_patient_id: newPatientId !== id ? newPatientId : undefined
    });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, get patient info for audit log
    const [patientRows] = await pool.execute(
      'SELECT name FROM patients WHERE patient_id = ?',
      [id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientName = patientRows[0].name;

    // Delete related audit logs first (optional, but keeps data clean)
    await pool.execute('DELETE FROM audit_logs WHERE patient_id = ?', [id]);
    
    // Delete patient
    const [result] = await pool.execute('DELETE FROM patients WHERE patient_id = ?', [id]);

    const userInfo = getUserInfo(req);

    // Log the action


    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error('Error deleting patient:', err);
    
    // Check if foreign key constraint error
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'Cannot delete patient. There are related records. Please contact administrator.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;