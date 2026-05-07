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

  // ========== QUEUE DISPLAY METHODS (Added for separation of concerns) ==========
  
static async getCurrentServing() {
  // Get ALL currently serving/called patients (both streams can have one each)
  const [rows] = await pool.execute(
    `SELECT 
      q.queue_code,
      COALESCE(at.type_name, 'Other') as type_name,
      at.duration_minutes,
      q.status,
      q.called_at,
      q.served_at,
      q.queue_stream
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
    WHERE q.status IN ('SERVING', 'CALLED')
      AND DATE(q.created_at) = CURDATE()
    ORDER BY 
      q.queue_stream,
      CASE q.status
        WHEN 'SERVING' THEN 1
        WHEN 'CALLED' THEN 2
      END,
      q.updated_at DESC`
  );
  
  // Return as array with stream information
  return rows.map(row => ({
    queue_code: row.queue_code,
    type: row.type_name,
    status: row.status,
    stream: row.queue_stream
  }));
}

// Replace getWaitingByType method to include CALLED status
// Replace the getWaitingByType method
static async getWaitingByType() {
  // Separate by stream: TESTING vs CONSULTATION
  const [testingRows] = await pool.execute(
    `SELECT 
      'Testing' as type_name,
      SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_count,
      SUM(CASE WHEN q.status = 'CALLED' THEN 1 ELSE 0 END) as called_count,
      MIN(CASE WHEN q.status = 'WAITING' THEN q.queue_code END) as next_code,
      MIN(CASE WHEN q.status = 'CALLED' THEN q.queue_code END) as called_code,
      GROUP_CONCAT(
        DISTINCT 
        CASE WHEN q.status != 'COMPLETED' THEN
          CONCAT(
            '{"queue_code":"', q.queue_code,
            '","time":"', DATE_FORMAT(q.created_at, '%H:%i'),
            '","status":"', q.status, '"}'
          )
        END
        SEPARATOR '|'
      ) as patients_json
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
    WHERE q.status IN ('WAITING', 'CALLED')
      AND DATE(q.created_at) = CURDATE()
      AND q.queue_stream = 'TESTING'`,
    []
  );

  const [consultationRows] = await pool.execute(
    `SELECT 
      'Consultation' as type_name,
      SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_count,
      SUM(CASE WHEN q.status = 'CALLED' THEN 1 ELSE 0 END) as called_count,
      MIN(CASE WHEN q.status = 'WAITING' THEN q.queue_code END) as next_code,
      MIN(CASE WHEN q.status = 'CALLED' THEN q.queue_code END) as called_code,
      GROUP_CONCAT(
        DISTINCT 
        CASE WHEN q.status != 'COMPLETED' THEN
          CONCAT(
            '{"queue_code":"', q.queue_code,
            '","time":"', DATE_FORMAT(q.created_at, '%H:%i'),
            '","status":"', q.status, '"}'
          )
        END
        SEPARATOR '|'
      ) as patients_json
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
    WHERE q.status IN ('WAITING', 'CALLED')
      AND DATE(q.created_at) = CURDATE()
      AND q.queue_stream = 'CONSULTATION'`,
    []
  );
  
  // Process Testing
  const testingGroup = testingRows[0] || {};
  const testingPatients = testingGroup.patients_json 
    ? testingGroup.patients_json.split('|').map(p => {
        try { return JSON.parse(p); } 
        catch(e) { return null; }
      }).filter(p => p)
    : [];
  
  // Process Consultation
  const consultationGroup = consultationRows[0] || {};
  const consultationPatients = consultationGroup.patients_json 
    ? consultationGroup.patients_json.split('|').map(p => {
        try { return JSON.parse(p); } 
        catch(e) { return null; }
      }).filter(p => p)
    : [];
  
  // Separate waiting and called for each
  const testingWaiting = testingPatients.filter(p => p.status === 'WAITING');
  const testingCalled = testingPatients.filter(p => p.status === 'CALLED');
  const consultationWaiting = consultationPatients.filter(p => p.status === 'WAITING');
  const consultationCalled = consultationPatients.filter(p => p.status === 'CALLED');
  
  return [
    {
      type: 'Testing',
      waiting_count: testingGroup.waiting_count || 0,
      called_count: testingGroup.called_count || 0,
      count: (testingGroup.waiting_count || 0) + (testingGroup.called_count || 0),
      next_code: testingGroup.next_code,
      current_serving_code: testingGroup.called_code || null,
      patients: [...testingCalled, ...testingWaiting] // Called show first (they're announced)
    },
    {
      type: 'Consultation',
      waiting_count: consultationGroup.waiting_count || 0,
      called_count: consultationGroup.called_count || 0,
      count: (consultationGroup.waiting_count || 0) + (consultationGroup.called_count || 0),
      next_code: consultationGroup.next_code,
      current_serving_code: consultationGroup.called_code || null,
      patients: [...consultationCalled, ...consultationWaiting] // Called show first
    }
  ];
}

// Replace getAllWaiting method
static async getAllWaiting() {
  const [rows] = await pool.execute(
    `SELECT 
      q.queue_number,
      q.queue_code,
      q.status,
      DATE_FORMAT(q.created_at, '%H:%i') as time,
      DATE_FORMAT(q.called_at, '%H:%i') as called_time,
      CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as patient_name,
      COALESCE(at.type_name, 'Other') as appointment_type
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
    WHERE q.status IN ('WAITING', 'CALLED')
      AND DATE(q.created_at) = CURDATE()
    ORDER BY 
      CASE q.status
        WHEN 'CALLED' THEN 1
        WHEN 'WAITING' THEN 2
      END,
      CASE COALESCE(at.type_name, 'Other')
        WHEN 'Consultation' THEN 1
        WHEN 'Testing' THEN 2
        WHEN 'Refill' THEN 3
        ELSE 4
      END,
      q.queue_number ASC
    LIMIT 30`
  );
  return rows;
}

// Replace getQueueStats method
static async getQueueStats() {
  const [rows] = await pool.execute(
    `SELECT 
      COUNT(*) as total_in_queue,
      SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called,
      SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving
    FROM queue
    WHERE DATE(created_at) = CURDATE()
      AND status IN ('WAITING', 'SERVING', 'CALLED')`
  );
  return rows[0] || { total_in_queue: 0, waiting: 0, called: 0, serving: 0 };
}

  static async getAverageWaitTimes() {
    const [rows] = await pool.execute(
      `SELECT 
        at.type_name,
        AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at)) as avg_wait
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status = 'COMPLETED'
        AND q.called_at IS NOT NULL
      GROUP BY at.type_name`
    );
    
    const waitMap = {};
    rows.forEach(item => {
      waitMap[item.type_name] = Math.round(item.avg_wait || 0);
    });
    return waitMap;
  }
}

module.exports = KioskDevice;