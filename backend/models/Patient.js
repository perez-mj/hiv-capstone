// backend/models/Patient.js
const pool = require('../db');
const { calculateAge } = require('../utils/helpers');

class Patient {
  static async findAll(filters = {}, pagination = {}) {
    const { search, hiv_status, sex, sort_by = 'created_at', sort_order = 'DESC' } = filters;
    const { limit = 100, offset = 0 } = pagination;

    // Convert limit and offset to integers at the beginning
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;

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

    const validSortColumns = ['created_at', 'last_name', 'first_name', 'date_of_birth', 'patient_facility_code'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Add ORDER BY and concatenated LIMIT/OFFSET
    query += ` ORDER BY p.${sortColumn} ${sortDirection} LIMIT ${limitNum} OFFSET ${offsetNum}`;

    // Handle two execution scenarios
    let rows;
    if (queryParams.length > 0) {
      // If there are WHERE parameters, use them with the query
      const [result] = await pool.execute(query, queryParams);
      rows = result;
    } else {
      // If no WHERE parameters, execute without params
      const [result] = await pool.execute(query);
      rows = result;
    }

    // Add calculated age
    rows.forEach(patient => {
      patient.age = calculateAge(patient.date_of_birth);
    });

    return rows;
  }

  static async count(filters = {}) {
    const { search, hiv_status, sex } = filters;

    let query = 'SELECT COUNT(*) as total FROM patients p WHERE 1=1';
    const queryParams = [];

    if (search) {
      query += ` AND (
        p.first_name LIKE ? OR 
        p.last_name LIKE ? OR 
        p.patient_facility_code LIKE ? OR
        p.contact_number LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (hiv_status) {
      query += ` AND p.hiv_status = ?`;
      queryParams.push(hiv_status);
    }

    if (sex) {
      query += ` AND p.sex = ?`;
      queryParams.push(sex);
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
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
      [id]
    );

    if (rows[0]) {
      rows[0].age = calculateAge(rows[0].date_of_birth);
    }

    return rows[0];
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT 
        p.*,
        u.username,
        u.email,
        u.role,
        u.last_login,
        u.is_active,
        CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) as full_name
      FROM patients p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?`,
      [userId]
    );

    if (rows[0]) {
      rows[0].age = calculateAge(rows[0].date_of_birth);
    }

    return rows[0];
  }

  static async findByPatientCode(code) {
    const [rows] = await pool.execute(
      'SELECT * FROM patients WHERE patient_facility_code = ?',
      [code]
    );
    return rows[0];
  }

  static async search(searchTerm, limit = 10) {
    if (!searchTerm || searchTerm.length < 2) return [];

    // Convert limit to integer
    const limitNum = parseInt(limit) || 10;

    const like = `%${searchTerm}%`;
    const query = `
      SELECT 
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
          WHEN CONCAT(p.first_name, ' ', p.last_name) LIKE ? THEN 4
          ELSE 5
        END,
        p.last_name ASC
      LIMIT ${limitNum}
    `;

    const [rows] = await pool.execute(query, [like, like, like, like, like, like, like, like]);

    return rows;
  }

  static async create(patientData) {
    const {
      patient_facility_code,
      user_id,
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
      created_by,
      updated_by
    } = patientData;

    const [result] = await pool.execute(
      `INSERT INTO patients (
        patient_facility_code, user_id, first_name, last_name, middle_name,
        date_of_birth, sex, address, contact_number,
        hiv_status, diagnosis_date, art_start_date, latest_cd4_count,
        latest_viral_load, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        patient_facility_code,
        user_id || null,
        first_name,
        last_name,
        middle_name || null,
        date_of_birth,
        sex,
        address || null,
        contact_number || null,
        hiv_status,
        diagnosis_date || null,
        art_start_date || null,
        latest_cd4_count || null,
        latest_viral_load || null,
        created_by,
        updated_by
      ]
    );

    return result.insertId;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    const updatableFields = [
      'patient_facility_code', 'first_name', 'last_name', 'middle_name',
      'date_of_birth', 'sex', 'address', 'contact_number', 'hiv_status',
      'diagnosis_date', 'art_start_date', 'latest_cd4_count', 'latest_viral_load'
    ];

    for (const field of updatableFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field] === null || updateData[field] === '' ? null : updateData[field]);
      }
    }

    if (updateData.updated_by !== undefined) {
      fields.push('updated_by = ?');
      values.push(updateData.updated_by);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM patients WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getStatistics() {
    const [totalPatients] = await pool.execute('SELECT COUNT(*) as total FROM patients');

    const [byStatus] = await pool.execute(
      `SELECT hiv_status, COUNT(*) as count FROM patients GROUP BY hiv_status`
    );

    const [bySex] = await pool.execute(
      `SELECT sex, COUNT(*) as count FROM patients GROUP BY sex`
    );

    const [onART] = await pool.execute(
      `SELECT COUNT(*) as count FROM patients WHERE art_start_date IS NOT NULL`
    );

    const [recentRegistrations] = await pool.execute(
      `SELECT COUNT(*) as count FROM patients WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

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

    const [monthlyRegistrations] = await pool.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count
      FROM patients
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC`
    );

    return {
      total_patients: totalPatients[0].total,
      by_hiv_status: byStatus,
      by_sex: bySex,
      on_art: onART[0].count,
      recent_registrations: recentRegistrations[0].count,
      age_distribution: ageDistribution,
      monthly_registrations: monthlyRegistrations
    };
  }
  
    static async linkUserAccount(patientId, userId, updatedBy) {
    // Check if patient exists
    const patient = await this.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    // Check if patient already has a user account
    if (patient.user_id) {
      throw new Error('Patient already has a user account linked');
    }
    
    // Update patient with user_id
    const [result] = await pool.execute(
      'UPDATE patients SET user_id = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [userId, updatedBy, patientId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Failed to link user account');
    }
    
    // Return the updated patient
    return await this.findById(patientId);
  }

  static async getPatientSummary(patientId) {
    const patient = await this.findById(patientId);
    if (!patient) return null;

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

    // Get recent activity
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

    return {
      patient_info: {
        id: patient.id,
        patient_facility_code: patient.patient_facility_code,
        name: `${patient.first_name} ${patient.last_name}`,
        age: patient.age,
        sex: patient.sex,
        hiv_status: patient.hiv_status,
        on_art: patient.art_start_date !== null,
        art_start_date: patient.art_start_date,
        diagnosis_date: patient.diagnosis_date
      },
      next_appointment: nextAppointment[0] || null,
      last_visit: lastVisit[0] || null,
      latest_cd4: latestCD4[0] || null,
      latest_viral_load: latestVL[0] || null,
      appointment_statistics: appointmentStats,
      recent_activity: recentActivity
    };
  }

  static async checkFacilityCodeExists(code, excludeId = null) {
    let query = 'SELECT id FROM patients WHERE patient_facility_code = ?';
    const params = [code];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute(query, params);
    return rows.length > 0;
  }

  static async getLatestLabResults(patientId, limit = 5) {
    // Convert limit to integer
    const limitNum = parseInt(limit) || 5;

    const query = `
      SELECT test_type, result_value, result_unit, test_date 
      FROM lab_results 
      WHERE patient_id = ? 
      ORDER BY test_date DESC LIMIT ${limitNum}
    `;

    const [rows] = await pool.execute(query, [patientId]);
    return rows;
  }

  static async getUpcomingAppointments(patientId, limit = 3) {
    // Convert limit to integer
    const limitNum = parseInt(limit) || 3;

    const query = `
      SELECT a.*, at.type_name 
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.patient_id = ? 
        AND a.scheduled_at >= NOW() 
        AND a.status IN ('SCHEDULED', 'CONFIRMED')
      ORDER BY a.scheduled_at ASC 
      LIMIT ${limitNum}
    `;

    const [rows] = await pool.execute(query, [patientId]);
    return rows;
  }

  static async getCurrentQueue(patientId) {
    const [rows] = await pool.execute(
      `SELECT q.* 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE a.patient_id = ? 
         AND DATE(q.created_at) = CURDATE()
         AND q.status IN ('WAITING', 'CALLED', 'SERVING')
       LIMIT 1`,
      [patientId]
    );
    return rows[0] || null;
  }

  static async getPatientStatistics(patientId) {
    const [rows] = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM appointments WHERE patient_id = ?) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'COMPLETED') as completed_appointments,
        (SELECT COUNT(*) FROM lab_results WHERE patient_id = ?) as total_lab_results,
        (SELECT COUNT(*) FROM clinical_encounters WHERE patient_id = ?) as total_encounters,
        (SELECT COUNT(*) FROM queue q 
         JOIN appointments a ON q.appointment_id = a.id 
         WHERE a.patient_id = ? AND DATE(q.created_at) = CURDATE()) as in_queue_today
      `,
      [patientId, patientId, patientId, patientId, patientId]
    );
    return rows[0];
  }

  static async getMedicalHistory(patientId) {
    const [labResults] = await pool.execute(
      `SELECT lr.*, u.username as performed_by_username, a.appointment_number
       FROM lab_results lr
       LEFT JOIN users u ON lr.performed_by = u.id
       LEFT JOIN appointments a ON lr.appointment_id = a.id
       WHERE lr.patient_id = ?
       ORDER BY lr.test_date DESC`,
      [patientId]
    );

    const [appointments] = await pool.execute(
      `SELECT a.*, at.type_name, at.duration_minutes, q.queue_number, q.status as queue_status
       FROM appointments a
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       LEFT JOIN queue q ON a.id = q.appointment_id
       WHERE a.patient_id = ?
       ORDER BY a.scheduled_at DESC`,
      [patientId]
    );

    const [encounters] = await pool.execute(
      `SELECT ce.*, s.first_name as staff_first_name, s.last_name as staff_last_name, s.position
       FROM clinical_encounters ce
       LEFT JOIN staff s ON ce.staff_id = s.id
       WHERE ce.patient_id = ?
       ORDER BY ce.encounter_date DESC`,
      [patientId]
    );

    const [summary] = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM appointments WHERE patient_id = ?) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'COMPLETED') as completed_appointments,
        (SELECT COUNT(*) FROM lab_results WHERE patient_id = ?) as total_lab_results,
        (SELECT COUNT(*) FROM clinical_encounters WHERE patient_id = ?) as total_encounters,
        (SELECT MAX(test_date) FROM lab_results WHERE patient_id = ?) as last_lab_date,
        (SELECT MAX(encounter_date) FROM clinical_encounters WHERE patient_id = ?) as last_encounter_date
      `,
      [patientId, patientId, patientId, patientId, patientId, patientId]
    );

    return {
      lab_results: labResults,
      appointments: appointments,
      clinical_encounters: encounters,
      summary: summary[0]
    };
  }

  // Check if patient has future appointments
  static async hasFutureAppointments(patientId) {
    const [rows] = await pool.execute(
      `SELECT id FROM appointments 
     WHERE patient_id = ? AND scheduled_at > NOW() 
     AND status IN ('SCHEDULED', 'CONFIRMED')
     LIMIT 1`,
      [patientId]
    );
    return rows.length > 0;
  }
}

module.exports = Patient;