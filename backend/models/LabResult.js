// backend/models/LabResult.js
const pool = require('../db');
const path = require('path');
const fs = require('fs').promises;

class LabResult {
  static async findAll(filters = {}, pagination = {}) {
    const { patient_id, test_type, start_date, end_date, search } = filters;
    const { limit = 100, offset = 0 } = pagination;

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

    if (start_date) {
      query += ` AND lr.test_date >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND lr.test_date <= ?`;
      queryParams.push(end_date);
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

    query += ` ORDER BY lr.test_date DESC, lr.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, queryParams);
    return rows;
  }

  static async count(filters = {}) {
    const { patient_id, test_type, start_date, end_date, search } = filters;

    let query = `
      SELECT COUNT(*) as total 
      FROM lab_results lr
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

    if (start_date) {
      query += ` AND lr.test_date >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND lr.test_date <= ?`;
      queryParams.push(end_date);
    }

    if (search) {
      query += ` AND (
        EXISTS (SELECT 1 FROM patients p WHERE p.id = lr.patient_id AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_facility_code LIKE ?)) OR
        lr.test_type LIKE ? OR
        lr.result_value LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
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
      [id]
    );
    return rows[0];
  }

  static async findByPatientId(patientId, filters = {}, pagination = {}) {
    const { test_type, start_date, end_date } = filters;
    const { limit = 100, offset = 0 } = pagination;

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

    query += ` ORDER BY lr.test_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countByPatientId(patientId, filters = {}) {
    const { test_type, start_date, end_date } = filters;

    let query = 'SELECT COUNT(*) as total FROM lab_results WHERE patient_id = ?';
    const params = [patientId];

    if (test_type) {
      query += ` AND test_type = ?`;
      params.push(test_type);
    }

    if (start_date) {
      query += ` AND test_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND test_date <= ?`;
      params.push(end_date);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  static async findByTestType(testType, filters = {}, pagination = {}) {
    const { start_date, end_date } = filters;
    const { limit = 100, offset = 0 } = pagination;

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

    query += ` ORDER BY lr.test_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async countByTestType(testType, filters = {}) {
    const { start_date, end_date } = filters;

    let query = 'SELECT COUNT(*) as total FROM lab_results WHERE test_type = ?';
    const params = [testType];

    if (start_date) {
      query += ` AND test_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND test_date <= ?`;
      params.push(end_date);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }

  static async getTestTypeSummary(testType) {
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
    return stats[0];
  }

  static async getRecent(limit = 10) {
    const [rows] = await pool.execute(
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
    return rows;
  }

  static async getStatistics(period = 'month') {
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

    return {
      overall: overall[0],
      by_type: byType,
      monthly_trends: monthly,
      correlation: correlation[0],
      abnormal_results: abnormal
    };
  }

  static async getPatientSummary(patientId) {
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
    return summary[0];
  }

  static async getHistoricalResults(patientId, testType, excludeId, limit = 5) {
    const [rows] = await pool.execute(
      `SELECT test_date, result_value, result_unit
       FROM lab_results
       WHERE patient_id = ? AND test_type = ? AND id != ?
       ORDER BY test_date DESC
       LIMIT ?`,
      [patientId, testType, excludeId, limit]
    );
    return rows;
  }

  static async getOverallStats(periodDays = 30) {
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
      WHERE test_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [periodDays]
    );
    return stats[0];
  }

  static async create(labResultData) {
    const {
      patient_id,
      appointment_id,
      test_type,
      test_date,
      result_value,
      result_unit,
      reference_range,
      interpretation,
      file_path,
      performed_by,
      created_by
    } = labResultData;

    const [result] = await pool.execute(
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
        interpretation || null,
        file_path,
        performed_by,
        created_by
      ]
    );

    return result.insertId;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    const updatableFields = [
      'test_type', 'test_date', 'result_value', 'result_unit',
      'reference_range', 'interpretation', 'file_path', 'updated_by'
    ];

    for (const field of updatableFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE lab_results SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM lab_results WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async hasFile(id) {
    const [rows] = await pool.execute('SELECT file_path FROM lab_results WHERE id = ?', [id]);
    return rows[0]?.file_path || null;
  }

  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  static async getFileInfo(id) {
    const [rows] = await pool.execute('SELECT file_path, test_type, patient_id FROM lab_results WHERE id = ?', [id]);
    return rows[0];
  }

  static generateInterpretation(test_type, result_value, reference_range) {
    if (!result_value || !reference_range) return null;

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
}

module.exports = LabResult;