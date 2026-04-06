// backend/models/User.js
const pool = require('../db');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const [rows] = await pool.execute(
      `SELECT 
        id, username, password_hash, email, role, is_active, last_login, created_at, updated_at
       FROM users 
       WHERE username = ?`,
      [username]
    );
    return rows[0];
  }
  
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT 
        id, username, password_hash, email, role, is_active, last_login, created_at, updated_at
       FROM users 
       WHERE email = ?`,
      [email]
    );
    return rows[0];
  }
  
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        id, username, email, role, is_active, last_login, created_at, updated_at
       FROM users 
       WHERE id = ?`,
      [id]
    );
    return rows[0];
  }
  
  static async create(userData) {
    const { username, password_hash, email, role } = userData;
    
    const [result] = await pool.execute(
      `INSERT INTO users (username, password_hash, email, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [username, password_hash, email || null, role || 'PATIENT']
    );
    
    return result.insertId;
  }
  
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    if (updateData.password_hash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updateData.password_hash);
    }
    if (updateData.email !== undefined) {
      fields.push('email = ?');
      values.push(updateData.email);
    }
    if (updateData.role !== undefined) {
      fields.push('role = ?');
      values.push(updateData.role);
    }
    if (updateData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.is_active);
    }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }
  
  static async updateLastLogin(id) {
    const [result] = await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
  
  static async updatePassword(id, passwordHash) {
    const [result] = await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, id]
    );
    return result.affectedRows > 0;
  }
  
  static async verifyPassword(userId, plainPassword) {
    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length === 0) return false;
    return await bcrypt.compare(plainPassword, rows[0].password_hash);
  }
  
  static async changePassword(userId, currentPassword, newPassword) {
    // Verify current password
    const isValid = await this.verifyPassword(userId, currentPassword);
    if (!isValid) return false;
    
    // Check if new password is different from old
    const isSame = await this.verifyPassword(userId, newPassword);
    if (isSame) return false;
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await this.updatePassword(userId, newPasswordHash);
    return true;
  }
  
  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  static async getAll(filters = {}, pagination = {}) {
    const { role, is_active, search } = filters;
    const { limit = 100, offset = 0 } = pagination;
    
    // Convert limit and offset to integers at the beginning
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    
    let query = `
      SELECT 
        id, username, email, role, is_active, last_login, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (role) {
      query += ` AND role = ?`;
      queryParams.push(role);
    }
    
    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      queryParams.push(is_active);
    }
    
    if (search) {
      query += ` AND (username LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    // Add ORDER BY and concatenated LIMIT/OFFSET
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
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
    const { role, is_active, search } = filters;
    
    let query = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const queryParams = [];
    
    if (role) {
      query += ` AND role = ?`;
      queryParams.push(role);
    }
    
    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      queryParams.push(is_active);
    }
    
    if (search) {
      query += ` AND (username LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }
}

module.exports = User;