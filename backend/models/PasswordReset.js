// backend/models/PasswordReset.js
const pool = require('../db');

class PasswordReset {
  static async createTable() {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_user_id (user_id)
      )
    `);
  }
  
  static async create(userId, token, expiresInHours = 1) {
    const [result] = await pool.execute(
      `INSERT INTO password_resets (user_id, token, expires_at) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
      [userId, token, expiresInHours]
    );
    return result.insertId;
  }
  
  static async findByToken(token) {
    const [rows] = await pool.execute(
      `SELECT id, user_id, token, expires_at, used 
       FROM password_resets 
       WHERE token = ? AND expires_at > NOW() AND used = 0`,
      [token]
    );
    return rows[0];
  }
  
  static async markAsUsed(token) {
    const [result] = await pool.execute(
      'UPDATE password_resets SET used = 1 WHERE token = ?',
      [token]
    );
    return result.affectedRows > 0;
  }
  
  static async deleteExpired() {
    const [result] = await pool.execute(
      'DELETE FROM password_resets WHERE expires_at < NOW()'
    );
    return result.affectedRows;
  }
}

module.exports = PasswordReset;