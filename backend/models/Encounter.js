// backend/models/Encounter.js
const pool = require('../db');

class Encounter {
  static async findAll(filters = {}, pagination = {}) {
    const { patient_id, staff_id, type, start_date, end_date, search } = filters;
    const { limit = 100, offset = 0 } = pagination;

    // Convert limit and offset to integers at the beginning
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;

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
      s.position as staff_position
    FROM clinical_encounters ce
    LEFT JOIN patients p ON ce.patient_id = p.id
    LEFT JOIN staff s ON ce.staff_id = s.id
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

    if (start_date) {
      query += ` AND DATE(ce.encounter_date) >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(ce.encounter_date) <= ?`;
      queryParams.push(end_date);
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

    // Add ORDER BY and concatenated LIMIT/OFFSET
    query += ` ORDER BY ce.encounter_date DESC, ce.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    // Handle two execution scenarios
    let rows;
    if (queryParams.length > 0) {
      const [result] = await pool.execute(query, queryParams);
      rows = result;
    } else {
      const [result] = await pool.execute(query);
      rows = result;
    }

    return rows;
  }

  static async count(filters = {}) {
    const { patient_id, staff_id, type, start_date, end_date, search } = filters;

    let query = `
      SELECT COUNT(*) as total 
      FROM clinical_encounters ce
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

    if (start_date) {
      query += ` AND DATE(ce.encounter_date) >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(ce.encounter_date) <= ?`;
      queryParams.push(end_date);
    }

    if (search) {
      query += ` AND (
        EXISTS (SELECT 1 FROM patients p WHERE p.id = ce.patient_id AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_facility_code LIKE ?)) OR
        ce.notes LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
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
      s.contact_number as staff_contact
    FROM clinical_encounters ce
    LEFT JOIN patients p ON ce.patient_id = p.id
    LEFT JOIN staff s ON ce.staff_id = s.id
    WHERE ce.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByPatientId(patientId, filters = {}, pagination = {}) {
    const { type, start_date, end_date } = filters;
    const { limit = 100, offset = 0 } = pagination;

    // Convert limit and offset to integers
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;

    let query = `
    SELECT 
      ce.*,
      s.first_name as staff_first_name,
      s.last_name as staff_last_name,
      s.position as staff_position
    FROM clinical_encounters ce
    LEFT JOIN staff s ON ce.staff_id = s.id
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

    // Add ORDER BY and concatenated LIMIT/OFFSET
    query += ` ORDER BY ce.encounter_date DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countByPatientId(patientId, filters = {}) {
    const { type, start_date, end_date } = filters;

    let query = 'SELECT COUNT(*) as total FROM clinical_encounters WHERE patient_id = ?';
    const params = [patientId];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    if (start_date) {
      query += ` AND DATE(encounter_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(encounter_date) <= ?`;
      params.push(end_date);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  static async getTodayEncounters() {
    const [rows] = await pool.execute(
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
    return rows;
  }

  static async getEncounterTypes() {
    const [rows] = await pool.execute(
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
    return rows;
  }

  static async getMonthlyTrends() {
    const [rows] = await pool.execute(
      `SELECT 
        DATE_FORMAT(encounter_date, '%Y-%m') as month,
        type,
        COUNT(*) as count
      FROM clinical_encounters
      WHERE encounter_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(encounter_date, '%Y-%m'), type
      ORDER BY month DESC, type`
    );
    return rows;
  }

  static async getStatistics(period = 'month') {
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

    const [byDayOfWeek] = await pool.execute(
      `SELECT 
        DAYOFWEEK(encounter_date) as day_of_week,
        COUNT(*) as count
      FROM clinical_encounters
      WHERE ${dateCondition}
      GROUP BY DAYOFWEEK(encounter_date)
      ORDER BY day_of_week`
    );

    return {
      overall: overall[0],
      by_type: byType,
      daily_trends: daily,
      top_staff: byStaff,
      hourly_distribution: byHour,
      day_of_week_distribution: byDayOfWeek
    };
  }

  static async getPatientSummary(patientId) {
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
    return summary[0];
  }

  static async getPreviousEncounters(patientId, excludeId, limit = 5) {
    // Convert limit to integer
    const limitNum = parseInt(limit) || 5;

    const query = `
      SELECT 
        id, encounter_date, type, notes,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name
      FROM clinical_encounters ce
      LEFT JOIN staff s ON ce.staff_id = s.id
      WHERE ce.patient_id = ? AND ce.id != ?
      ORDER BY ce.encounter_date DESC
      LIMIT ${limitNum}
    `;

    const [rows] = await pool.execute(query, [patientId, excludeId]);
    return rows;
  }

  static async getSummary(periodDays = 30) {
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
      WHERE DATE(encounter_date) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [periodDays]
    );
    return summary[0];
  }

  static async create(encounterData) {
    const {
      patient_id,
      staff_id,
      encounter_date,
      type,
      notes,
      created_by
    } = encounterData;

    const [result] = await pool.execute(
      `INSERT INTO clinical_encounters (
        patient_id, staff_id, encounter_date, type, notes, 
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [patient_id, staff_id, encounter_date, type, notes || null, created_by]
    );

    return result.insertId;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    if (updateData.encounter_date !== undefined) {
      fields.push('encounter_date = ?');
      values.push(updateData.encounter_date);
    }
    if (updateData.type !== undefined) {
      fields.push('type = ?');
      values.push(updateData.type);
    }
    if (updateData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updateData.notes);
    }
    if (updateData.updated_by !== undefined) {
      fields.push('updated_by = ?');
      values.push(updateData.updated_by);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE clinical_encounters SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM clinical_encounters WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getHourlyDistribution() {
    const hourly = Array(24).fill(0);
    const [encounters] = await pool.execute(
      `SELECT HOUR(encounter_date) as hour FROM clinical_encounters WHERE DATE(encounter_date) = CURDATE()`
    );
    encounters.forEach(e => {
      hourly[e.hour]++;
    });
    return hourly.map((count, hour) => ({ hour, count }));
  }

  static async getTodayStats() {
    const encounters = await this.getTodayEncounters();
    return {
      total: encounters.length,
      unique_patients: new Set(encounters.map(e => e.patient_id)).size,
      unique_staff: new Set(encounters.map(e => e.staff_id)).size
    };
  }

  // Add missing method for last visit date
  static async getLastVisitDate(patientId) {
    const [rows] = await pool.execute(
      `SELECT encounter_date FROM clinical_encounters 
       WHERE patient_id = ? ORDER BY encounter_date DESC LIMIT 1`,
      [patientId]
    );
    return rows[0]?.encounter_date || null;
  }
}

module.exports = Encounter;