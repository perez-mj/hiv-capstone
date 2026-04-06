// backend/models/Queue.js
const pool = require('../db');

class Queue {
  static async generateQueueCode(queueNumber) {
    return `Q-${String(queueNumber).padStart(3, '0')}`;
  }

  // ADD THIS MISSING METHOD
  static async createForAppointment(appointmentId, created_by = null) {
    try {
      // Get next queue number for today
      const nextNumber = await this.getNextQueueNumber();
      
      // Generate queue code
      const queueCode = await this.generateQueueCode(nextNumber);
      
      // Create queue entry
      const queueId = await this.create({
        appointment_id: appointmentId,
        queue_number: nextNumber,
        queue_code: queueCode,
        priority: 0,
        created_by: created_by
      });
      
      // Return the created queue entry
      const queueEntry = await this.findById(queueId);
      return queueEntry;
    } catch (error) {
      console.error('Error in createForAppointment:', error);
      throw error;
    }
  }

  // ADD THIS MISSING METHOD
  static async updateStatusByAppointment(appointmentId, status, additionalData = {}) {
    try {
      // First find the queue entry for this appointment
      const queueEntry = await this.findByAppointmentId(appointmentId);
      if (!queueEntry) {
        return false;
      }
      
      // Update the status
      const updated = await this.updateStatus(queueEntry.id, status, additionalData);
      
      // Also update appointment status if needed
      if (status === 'COMPLETED') {
        await pool.execute(
          `UPDATE appointments SET status = 'COMPLETED', updated_at = NOW() WHERE id = ?`,
          [appointmentId]
        );
      } else if (status === 'SKIPPED') {
        await pool.execute(
          `UPDATE appointments SET status = 'NO_SHOW', updated_at = NOW() WHERE id = ?`,
          [appointmentId]
        );
      }
      
      return updated;
    } catch (error) {
      console.error('Error in updateStatusByAppointment:', error);
      throw error;
    }
  }

  // ADD THIS MISSING METHOD
  static async confirmAppointment(appointmentId, userId = null) {
    try {
      // Update appointment status to CONFIRMED
      await pool.execute(
        `UPDATE appointments SET status = 'CONFIRMED', updated_at = NOW() WHERE id = ?`,
        [appointmentId]
      );
      
      // Create queue entry
      const queueEntry = await this.createForAppointment(appointmentId, userId);
      
      return queueEntry;
    } catch (error) {
      console.error('Error in confirmAppointment:', error);
      throw error;
    }
  }

  // ADD THIS MISSING METHOD
  static async checkAppointmentInQueue(appointmentId) {
    try {
      const [rows] = await pool.execute(
        `SELECT id, queue_number, queue_code, status 
         FROM queue 
         WHERE appointment_id = ? AND DATE(created_at) = CURDATE()`,
        [appointmentId]
      );
      
      if (rows.length > 0) {
        return {
          in_queue: true,
          queue_id: rows[0].id,
          queue_number: rows[0].queue_number,
          queue_code: rows[0].queue_code,
          status: rows[0].status
        };
      }
      
      return { in_queue: false };
    } catch (error) {
      console.error('Error in checkAppointmentInQueue:', error);
      throw error;
    }
  }

  // ADD THIS MISSING METHOD
  static async deleteByAppointment(appointmentId) {
    try {
      const result = await this.deleteByAppointmentId(appointmentId);
      return result;
    } catch (error) {
      console.error('Error in deleteByAppointment:', error);
      throw error;
    }
  }

  // ADD THIS MISSING METHOD
  static async getCurrentQueue() {
    try {
      const waiting = await pool.execute(
        `SELECT 
          q.*,
          q.queue_code,
          a.appointment_number,
          a.scheduled_at,
          p.id as patient_id,
          p.first_name,
          p.last_name,
          p.patient_facility_code,
          at.type_name
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE DATE(q.created_at) = CURDATE() AND q.status = 'WAITING'
        ORDER BY q.queue_number ASC`
      );
      
      const called = await pool.execute(
        `SELECT 
          q.*,
          q.queue_code,
          a.appointment_number,
          a.scheduled_at,
          p.id as patient_id,
          p.first_name,
          p.last_name,
          p.patient_facility_code,
          at.type_name
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE DATE(q.created_at) = CURDATE() AND q.status = 'CALLED'
        ORDER BY q.queue_number ASC`
      );
      
      const serving = await pool.execute(
        `SELECT 
          q.*,
          q.queue_code,
          a.appointment_number,
          a.scheduled_at,
          p.id as patient_id,
          p.first_name,
          p.last_name,
          p.patient_facility_code,
          at.type_name
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        WHERE DATE(q.created_at) = CURDATE() AND q.status = 'SERVING'
        ORDER BY q.queue_number ASC`
      );
      
      return {
        waiting: waiting[0],
        called: called[0],
        serving: serving[0]
      };
    } catch (error) {
      console.error('Error in getCurrentQueue:', error);
      throw error;
    }
  }

  // Keep all your existing methods below...
  
  static async getTodayQueue() {
    const [rows] = await pool.execute(
      `SELECT 
        q.*,
        q.queue_code,
        a.appointment_number,
        a.scheduled_at,
        p.id as patient_id,
        p.patient_facility_code,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.middle_name as patient_middle_name,
        at.type_name,
        at.duration_minutes,
        creator.username as created_by_username,
        updater.username as updated_by_username
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN users creator ON q.created_by = creator.id
      LEFT JOIN users updater ON q.updated_by = updater.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        q.priority DESC,
        q.queue_number ASC`
    );
    return rows;
  }

  static async getQueueDisplay() {
    const [rows] = await pool.execute(
      `SELECT 
        q.queue_number,
        q.queue_code,
        q.status,
        q.called_at,
        p.first_name,
        p.last_name,
        CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as display_name,
        at.type_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        CASE q.status
          WHEN 'SERVING' THEN 1
          WHEN 'CALLED' THEN 2
          ELSE 3
        END,
        q.queue_number ASC`
    );
    return rows;
  }

  static async getQueueStatistics() {
    const [todayStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called,
        SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
        AVG(CASE WHEN status = 'COMPLETED' 
          THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) 
          ELSE NULL END) as avg_total_time,
        AVG(CASE WHEN status = 'COMPLETED' 
          THEN TIMESTAMPDIFF(MINUTE, created_at, called_at) 
          ELSE NULL END) as avg_wait_time,
        AVG(CASE WHEN status = 'COMPLETED' 
          THEN TIMESTAMPDIFF(MINUTE, called_at, served_at) 
          ELSE NULL END) as avg_service_time
      FROM queue
      WHERE DATE(created_at) = CURDATE()`
    );

    const [hourly] = await pool.execute(
      `SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as count
      FROM queue
      WHERE DATE(created_at) = CURDATE()
      GROUP BY HOUR(created_at)
      ORDER BY hour`
    );

    const [byType] = await pool.execute(
      `SELECT 
        at.type_name,
        COUNT(*) as count,
        AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.completed_at)) as avg_time
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status = 'COMPLETED'
      GROUP BY at.type_name`
    );

    const [peakHours] = await pool.execute(
      `SELECT 
        HOUR(created_at) as hour,
        AVG(COUNT(*)) OVER() as avg_count,
        COUNT(*) as total_count
      FROM queue
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY total_count DESC
      LIMIT 5`
    );

    return {
      today: {
        ...todayStats[0],
        avg_total_time: Math.round(todayStats[0].avg_total_time || 0),
        avg_wait_time: Math.round(todayStats[0].avg_wait_time || 0),
        avg_service_time: Math.round(todayStats[0].avg_service_time || 0)
      },
      hourly_distribution: hourly,
      by_appointment_type: byType,
      peak_hours: peakHours
    };
  }

  static async getQueueHistory(filters = {}, pagination = {}) {
    const { start_date, end_date, status } = filters;
    const { limit = 20, offset = 0 } = pagination;
    
    const limitNum = parseInt(limit) || 20;
    const offsetNum = parseInt(offset) || 0;
    
    let query = `
      SELECT 
        q.*,
        q.queue_code,
        a.appointment_number,
        a.scheduled_at,
        p.patient_facility_code,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        at.type_name,
        creator.username as created_by_username,
        TIMESTAMPDIFF(MINUTE, q.called_at, q.served_at) as service_duration,
        TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at) as wait_duration
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN users creator ON q.created_by = creator.id
      WHERE 1=1
    `;
    
    const queryParams = [];

    if (start_date) {
      query += ` AND DATE(q.created_at) >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(q.created_at) <= ?`;
      queryParams.push(end_date);
    }

    if (status) {
      const statusArray = status.split(',');
      if (statusArray.length > 1) {
        query += ` AND q.status IN (${statusArray.map(() => '?').join(', ')})`;
        queryParams.push(...statusArray);
      } else {
        query += ` AND q.status = ?`;
        queryParams.push(status);
      }
    }

    query += ` ORDER BY q.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
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

  static async countHistory(filters = {}) {
    const { start_date, end_date, status } = filters;
    
    let query = `
      SELECT COUNT(*) as total 
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE 1=1
    `;
    
    const queryParams = [];

    if (start_date) {
      query += ` AND DATE(q.created_at) >= ?`;
      queryParams.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(q.created_at) <= ?`;
      queryParams.push(end_date);
    }

    if (status) {
      const statusArray = status.split(',');
      if (statusArray.length > 1) {
        query += ` AND q.status IN (${statusArray.map(() => '?').join(', ')})`;
        queryParams.push(...statusArray);
      } else {
        query += ` AND q.status = ?`;
        queryParams.push(status);
      }
    }
    
    const [rows] = await pool.execute(query, queryParams);
    return rows[0].total;
  }

  static async getTodaySummary() {
    const [summary] = await pool.execute(
      `SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as avg_wait_time,
        AVG(TIMESTAMPDIFF(MINUTE, called_at, served_at)) as avg_service_time,
        COUNT(*) as total_served,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_count
      FROM queue
      WHERE DATE(created_at) = CURDATE()`
    );
    return summary[0];
  }

  static async getCurrentSummary() {
    const [summary] = await pool.execute(
      `SELECT 
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called,
        SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving,
        MIN(CASE WHEN status = 'WAITING' THEN queue_number ELSE NULL END) as next_number,
        MIN(CASE WHEN status = 'WAITING' THEN queue_code ELSE NULL END) as next_code
      FROM queue
      WHERE DATE(created_at) = CURDATE()
        AND status IN ('WAITING', 'CALLED', 'SERVING')`
    );
    return summary[0];
  }

  static async getDailyStats(start_date, end_date) {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
        AVG(CASE WHEN status = 'COMPLETED' 
          THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) 
          ELSE NULL END) as avg_total_time
      FROM queue
      WHERE 1=1
    `;
    
    const params = [];

    if (start_date) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async getPeakHours() {
    const [rows] = await pool.execute(
      `SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as total_count,
        AVG(COUNT(*)) OVER() as avg_count
      FROM queue
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY total_count DESC`
    );
    return rows;
  }

  static async getNextQueueNumber() {
    const [lastQueue] = await pool.execute(
      `SELECT MAX(queue_number) as max_num 
       FROM queue 
       WHERE DATE(created_at) = CURDATE()`
    );
    return (lastQueue[0].max_num || 0) + 1;
  }

  static async create(queueData) {
    const { appointment_id, queue_number, queue_code, priority, created_by } = queueData;
    
    const [result] = await pool.execute(
      `INSERT INTO queue (
        appointment_id, queue_number, queue_code, priority, status, 
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'WAITING', ?, NOW(), NOW())`,
      [appointment_id, queue_number, queue_code, priority || 0, created_by]
    );
    
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        q.*,
        q.queue_code,
        a.appointment_number,
        a.id as appointment_id,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.id as patient_id,
        at.type_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE q.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByAppointmentId(appointmentId) {
    const [rows] = await pool.execute(
      `SELECT q.*, q.queue_code
       FROM queue q
       WHERE q.appointment_id = ?
         AND DATE(q.created_at) = CURDATE()
         AND q.status IN ('WAITING', 'CALLED', 'SERVING')`,
      [appointmentId]
    );
    return rows[0];
  }

  static async findByPatientId(patientId, pagination = {}) {
    const { limit = 100, offset = 0 } = pagination;
    
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    
    const query = `
      SELECT 
        q.*,
        q.queue_code,
        a.appointment_number,
        a.scheduled_at,
        at.type_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.patient_id = ?
      ORDER BY q.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    
    const [rows] = await pool.execute(query, [patientId]);
    return rows;
  }

  static async countByPatientId(patientId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE a.patient_id = ?`,
      [patientId]
    );
    return rows[0].total;
  }

  static async getPatientPositionInQueue(queueNumber) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) + 1 as position
       FROM queue
       WHERE DATE(created_at) = CURDATE()
         AND status = 'WAITING'
         AND queue_number < ?`,
      [queueNumber]
    );
    return rows[0].position;
  }

  static async getPatientCurrentQueue(patientId) {
    const [rows] = await pool.execute(
      `SELECT 
        q.*,
        q.queue_code,
        a.appointment_number,
        a.scheduled_at,
        a.id as appointment_id,
        at.type_name,
        at.duration_minutes,
        (SELECT COUNT(*) + 1 
         FROM queue q2 
         WHERE DATE(q2.created_at) = CURDATE() 
           AND q2.status IN ('WAITING', 'CALLED')
           AND q2.queue_number < q.queue_number) as position
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.patient_id = ?
        AND DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY q.created_at DESC
      LIMIT 1`,
      [patientId]
    );
    return rows[0];
  }

  static async updateStatus(id, status, updateData = {}) {
    const fields = ['status = ?', 'updated_at = NOW()'];
    const values = [status];
    
    if (updateData.called_at) {
      fields.push('called_at = ?');
      values.push(updateData.called_at);
    }
    if (updateData.served_at) {
      fields.push('served_at = ?');
      values.push(updateData.served_at);
    }
    if (updateData.completed_at) {
      fields.push('completed_at = ?');
      values.push(updateData.completed_at);
    }
    if (updateData.updated_by) {
      fields.push('updated_by = ?');
      values.push(updateData.updated_by);
    }
    
    values.push(id);
    
    const [result] = await pool.execute(
      `UPDATE queue SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  static async updatePriority(id, priority, updated_by) {
    const [result] = await pool.execute(
      `UPDATE queue 
       SET priority = ?, updated_by = ?, updated_at = NOW() 
       WHERE id = ?`,
      [priority, updated_by, id]
    );
    return result.affectedRows > 0;
  }

  static async getNextWaitingPatient() {
    const [rows] = await pool.execute(
      `SELECT q.*, a.patient_id, a.id as appointment_id,
              p.first_name, p.last_name
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       WHERE DATE(q.created_at) = CURDATE()
         AND q.status = 'WAITING'
       ORDER BY q.priority DESC, q.queue_number ASC
       LIMIT 1`
    );
    return rows[0];
  }

  static async deleteByAppointmentId(appointmentId) {
    const [result] = await pool.execute(
      'DELETE FROM queue WHERE appointment_id = ?',
      [appointmentId]
    );
    return result.affectedRows;
  }

  static async deleteById(id) {
    const [result] = await pool.execute('DELETE FROM queue WHERE id = ?', [id]);
    return result.affectedRows;
  }

  static async deleteByDate(date) {
    let query = 'DELETE FROM queue';
    const params = [];
    
    if (date) {
      query += ' WHERE DATE(created_at) = ?';
      params.push(date);
    } else {
      query += ' WHERE DATE(created_at) = CURDATE()';
    }
    
    const [result] = await pool.execute(query, params);
    return result.affectedRows;
  }

  static async deleteByFilters(filters = {}) {
    const { appointment_id, date } = filters;
    let query = 'DELETE FROM queue WHERE 1=1';
    const params = [];
    
    if (appointment_id) {
      query += ' AND appointment_id = ?';
      params.push(appointment_id);
    }
    
    if (date) {
      query += ' AND DATE(created_at) = ?';
      params.push(date);
    } else if (!appointment_id) {
      query += ' AND DATE(created_at) = CURDATE()';
    }
    
    const [result] = await pool.execute(query, params);
    return result.affectedRows;
  }

  static async getQueueEntriesForReset(filters = {}) {
    const { appointment_id, date } = filters;
    let query = `
      SELECT q.*, a.patient_id, p.first_name, p.last_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (appointment_id) {
      query += ' AND q.appointment_id = ?';
      params.push(appointment_id);
    }
    
    if (date) {
      query += ' AND DATE(q.created_at) = ?';
      params.push(date);
    } else if (!appointment_id) {
      query += ' AND DATE(q.created_at) = CURDATE()';
    }
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async getCheckInStatus(appointmentId) {
    const [rows] = await pool.execute(
      `SELECT 
        q.id,
        q.queue_number,
        q.queue_code,
        q.status,
        (SELECT COUNT(*) + 1 
         FROM queue q2 
         WHERE DATE(q2.created_at) = CURDATE() 
           AND q2.status IN ('WAITING', 'CALLED')
           AND q2.queue_number < q.queue_number) as position
      FROM queue q
      WHERE q.appointment_id = ?
        AND DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')`,
      [appointmentId]
    );
    return rows[0];
  }

// Optimized method to get today's queue with a single query
static async getTodayQueueOptimized() {
  try {
    const db = await this.getConnection();
    const [rows] = await db.execute(
      `SELECT 
        q.id,
        q.appointment_id,
        q.queue_number,
        q.queue_code,
        q.status,
        q.priority,
        q.called_at,
        q.served_at,
        q.completed_at,
        q.created_at,
        a.scheduled_at,
        a.notes as appointment_notes,
        a.is_walkin,
        p.id as patient_id,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.middle_name as patient_middle_name,
        p.patient_facility_code,
        at.id as type_id,
        at.type_name,
        at.duration_minutes
      FROM queue q
      INNER JOIN appointments a ON q.appointment_id = a.id
      INNER JOIN patients p ON a.patient_id = p.id
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
      ORDER BY 
        CASE q.status
          WHEN 'SERVING' THEN 1
          WHEN 'CALLED' THEN 2
          WHEN 'WAITING' THEN 3
          ELSE 4
        END,
        q.priority DESC,
        q.queue_number ASC`
    );
    
    return rows;
  } catch (error) {
    console.error('Error in Queue.getTodayQueueOptimized:', error);
    throw error;
  }
}

// Optimized method to get next waiting patient
static async getNextWaitingPatient() {
  try {
    const db = await this.getConnection();
    const [rows] = await db.execute(
      `SELECT 
        q.*,
        a.patient_id,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE q.status = 'WAITING' 
        AND DATE(q.created_at) = CURDATE()
      ORDER BY q.priority DESC, q.queue_number ASC
      LIMIT 1`
    );
    
    return rows[0];
  } catch (error) {
    console.error('Error in Queue.getNextWaitingPatient:', error);
    throw error;
  }
}
}

module.exports = Queue;