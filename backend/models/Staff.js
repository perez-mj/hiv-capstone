// backend/models/Staff.js
const pool = require('../db');

class Staff {
  static async findAll(filters = {}, pagination = {}) {
    const { search, position } = filters;
    const { limit = 100, offset = 0 } = pagination;

    // Convert limit and offset to integers at the beginning
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;

    let query = `
      SELECT 
        s.*,
        u.username,
        u.email,
        u.role,
        u.is_active as user_active,
        u.last_login
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;

    const queryParams = [];

    if (search) {
      query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.middle_name LIKE ? OR s.position LIKE ? OR s.contact_number LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (position) {
      query += ` AND s.position = ?`;
      queryParams.push(position);
    }

    // Add ORDER BY and concatenated LIMIT/OFFSET
    query += ` ORDER BY s.last_name ASC, s.first_name ASC LIMIT ${limitNum} OFFSET ${offsetNum}`;

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
    
    return rows;
  }

  static async count(filters = {}) {
    const { search, position } = filters;

    let query = 'SELECT COUNT(*) as total FROM staff s WHERE 1=1';
    const queryParams = [];

    if (search) {
      query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.middle_name LIKE ? OR s.position LIKE ? OR s.contact_number LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (position) {
      query += ` AND s.position = ?`;
      queryParams.push(position);
    }

    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        s.*,
        u.username,
        u.email,
        u.role,
        u.is_active as user_active,
        u.last_login
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM staff WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  static async getEncounterStats(staffId) {
    const [rows] = await pool.execute(
      `SELECT 
        COUNT(*) as total_encounters,
        COUNT(DISTINCT patient_id) as unique_patients
      FROM clinical_encounters 
      WHERE staff_id = ?`,
      [staffId]
    );
    return rows[0];
  }

  static async create(staffData) {
    const {
      user_id,
      first_name,
      last_name,
      middle_name,
      position,
      contact_number
    } = staffData;

    const [result] = await pool.execute(
      `INSERT INTO staff 
        (user_id, first_name, last_name, middle_name, position, contact_number, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id || null, first_name, last_name, middle_name || null, position || null, contact_number || null]
    );

    return result.insertId;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    const updatableFields = ['user_id', 'first_name', 'last_name', 'middle_name', 'position', 'contact_number'];
    
    for (const field of updatableFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field] === null || updateData[field] === '' ? null : updateData[field]);
      }
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE staff SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM staff WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async checkUserLinked(userId, excludeId = null) {
    let query = 'SELECT id FROM staff WHERE user_id = ?';
    const params = [userId];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute(query, params);
    return rows.length > 0;
  }

  static async getStatistics() {
    const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM staff');
    const total = totalRows[0].count;

    const [linkedRows] = await pool.execute('SELECT COUNT(*) as count FROM staff WHERE user_id IS NOT NULL');
    const linked = linkedRows[0].count;

    const [unlinkedRows] = await pool.execute('SELECT COUNT(*) as count FROM staff WHERE user_id IS NULL');
    const unlinked = unlinkedRows[0].count;

    const [positionRows] = await pool.execute(
      'SELECT position, COUNT(*) as count FROM staff WHERE position IS NOT NULL GROUP BY position ORDER BY count DESC LIMIT 10'
    );

    const [weekRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM staff WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );
    const newThisWeek = weekRows[0].count;

    const [monthRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM staff WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
    );
    const newThisMonth = monthRows[0].count;

    return {
      total: parseInt(total),
      linked: parseInt(linked),
      unlinked: parseInt(unlinked),
      byPosition: positionRows.map(row => ({
        position: row.position,
        count: parseInt(row.count)
      })),
      newThisWeek: parseInt(newThisWeek),
      newThisMonth: parseInt(newThisMonth)
    };
  }

  static async getAllPositions() {
    const [rows] = await pool.execute(
      `SELECT DISTINCT position 
       FROM staff 
       WHERE position IS NOT NULL AND position != '' 
       ORDER BY position`
    );
    return rows.map(row => row.position);
  }

  static async checkClinicalEncounters(staffId) {
    const [rows] = await pool.execute(
      'SELECT id FROM clinical_encounters WHERE staff_id = ? LIMIT 1',
      [staffId]
    );
    return rows.length > 0;
  }
}

module.exports = Staff;