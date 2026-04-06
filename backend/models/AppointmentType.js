// backend/models/AppointmentType.js
const pool = require('../db');

class AppointmentType {
  static async findAll(activeOnly = true) {
    let query = 'SELECT * FROM appointment_types';
    const params = [];
    
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    
    query += ' ORDER BY type_name';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }
  
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM appointment_types WHERE id = ?',
      [id]
    );
    return rows[0];
  }
  
  static async findByName(typeName) {
    const [rows] = await pool.execute(
      'SELECT id FROM appointment_types WHERE type_name = ?',
      [typeName]
    );
    return rows[0];
  }
  
  static async create(typeData) {
    const { type_name, description, duration_minutes } = typeData;
    
    const [result] = await pool.execute(
      `INSERT INTO appointment_types (type_name, description, duration_minutes, is_active, created_at) 
       VALUES (?, ?, ?, 1, NOW())`,
      [type_name, description || null, duration_minutes || 30]
    );
    
    return result.insertId;
  }
  
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    if (updateData.type_name !== undefined) {
      fields.push('type_name = ?');
      values.push(updateData.type_name);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.duration_minutes !== undefined) {
      fields.push('duration_minutes = ?');
      values.push(updateData.duration_minutes);
    }
    if (updateData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.is_active);
    }
    
    if (fields.length === 0) return false;
    
    values.push(id);
    
    const [result] = await pool.execute(
      `UPDATE appointment_types SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }
  
  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM appointment_types WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  static async isInUse(id) {
    const [rows] = await pool.execute(
      'SELECT id FROM appointments WHERE appointment_type_id = ? LIMIT 1',
      [id]
    );
    return rows.length > 0;
  }
}

module.exports = AppointmentType;