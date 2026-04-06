// backend/models/KioskDevice.js
const pool = require('../db');

class KioskDevice {
  static async findByDeviceId(deviceId) {
    const [rows] = await pool.execute(
      `SELECT id, device_id, device_name, last_seen, is_authorized, created_at 
       FROM kiosk_devices 
       WHERE device_id = ?`,
      [deviceId]
    );
    return rows[0];
  }

  static async register(deviceId) {
    const [result] = await pool.execute(
      `INSERT INTO kiosk_devices (device_id, last_seen, is_authorized) 
       VALUES (?, NOW(), 0)`,
      [deviceId]
    );
    return result.insertId;
  }

  static async updateLastSeen(deviceId) {
    const [result] = await pool.execute(
      'UPDATE kiosk_devices SET last_seen = NOW() WHERE device_id = ?',
      [deviceId]
    );
    return result.affectedRows > 0;
  }

  static async updateDeviceName(deviceId, deviceName) {
    const [result] = await pool.execute(
      'UPDATE kiosk_devices SET device_name = ? WHERE device_id = ?',
      [deviceName, deviceId]
    );
    return result.affectedRows > 0;
  }

  static async authorize(deviceId, authorized = true) {
    const [result] = await pool.execute(
      'UPDATE kiosk_devices SET is_authorized = ? WHERE device_id = ?',
      [authorized ? 1 : 0, deviceId]
    );
    return result.affectedRows > 0;
  }

  static async delete(deviceId) {
    const [result] = await pool.execute(
      'DELETE FROM kiosk_devices WHERE device_id = ?',
      [deviceId]
    );
    return result.affectedRows > 0;
  }

  static async getAllDevices() {
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        device_id, 
        COALESCE(device_name, CONCAT('Kiosk-', LEFT(device_id, 8))) as device_name,
        last_seen, 
        is_authorized, 
        created_at,
        CASE 
          WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
          ELSE 'Offline'
        END as status,
        TIMESTAMPDIFF(MINUTE, last_seen, NOW()) as minutes_since_seen
      FROM kiosk_devices
      ORDER BY 
        is_authorized DESC,
        CASE WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 0 ELSE 1 END,
        created_at DESC`
    );
    return rows;
  }

  static async getDeviceDetails(deviceId) {
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        device_id, 
        device_name,
        last_seen, 
        is_authorized, 
        created_at,
        CASE 
          WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
          ELSE 'Offline'
        END as status
      FROM kiosk_devices 
      WHERE device_id = ?`,
      [deviceId]
    );
    return rows[0];
  }

  static async cleanupInactiveDevices(hoursInactive = 24) {
    const [result] = await pool.execute(
      'DELETE FROM kiosk_devices WHERE last_seen < DATE_SUB(NOW(), INTERVAL ? HOUR) AND is_authorized = 0',
      [hoursInactive]
    );
    return result.affectedRows;
  }

  static async getActivityLog(limit = 50, deviceId = null) {
    let query = `
      SELECT 
        kd.device_id,
        COALESCE(kd.device_name, CONCAT('Kiosk-', LEFT(kd.device_id, 8))) as device_name,
        kd.last_seen,
        kd.is_authorized,
        kd.created_at as first_seen,
        CASE 
          WHEN kd.last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
          ELSE 'Offline'
        END as current_status
      FROM kiosk_devices kd
      WHERE 1=1
    `;
    
    const params = [];

    if (deviceId) {
      query += ` AND kd.device_id = ?`;
      params.push(deviceId);
    }

    query += ` ORDER BY kd.last_seen DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = KioskDevice;