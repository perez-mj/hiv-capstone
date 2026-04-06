// backend/models/Appointment.js
const pool = require('../db');

class Appointment {
  // Helper method to ensure connection exists
  static async getConnection() {
    if (!pool || !pool.execute) {
      throw new Error('Database connection not available. Please check your database configuration.');
    }
    return pool;
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      const db = await this.getConnection();
      const { status, patient_id, type_id, search, start_date, end_date } = filters;
      const { limit = 100, offset = 0 } = pagination;

      // Convert limit and offset to integers at the beginning
      const limitNum = parseInt(limit) || 100;
      const offsetNum = parseInt(offset) || 0;

      let query = `
        SELECT 
          a.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.contact_number as patient_contact,
          at.type_name,
          at.duration_minutes,
          at.description as type_description,
          u.username as created_by_username,
          q.id as queue_id,
          q.queue_number,
          q.status as queue_status
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE 1=1
      `;

      const queryParams = [];

      if (status) {
        query += ` AND a.status = ?`;
        queryParams.push(status);
      }

      if (patient_id) {
        query += ` AND a.patient_id = ?`;
        queryParams.push(patient_id);
      }

      if (type_id) {
        query += ` AND a.appointment_type_id = ?`;
        queryParams.push(type_id);
      }

      if (start_date) {
        query += ` AND DATE(a.scheduled_at) >= ?`;
        queryParams.push(start_date);
      }

      if (end_date) {
        query += ` AND DATE(a.scheduled_at) <= ?`;
        queryParams.push(end_date);
      }

      if (search) {
        query += ` AND (
          a.appointment_number LIKE ? OR
          p.first_name LIKE ? OR
          p.last_name LIKE ? OR
          p.patient_facility_code LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Add LIMIT and OFFSET as string concatenation
      query += ` ORDER BY a.scheduled_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      // Handle two execution scenarios
      let rows;
      if (queryParams.length > 0) {
        // If there are WHERE parameters, use them with the query
        const [result] = await db.execute(query, queryParams);
        rows = result;
      } else {
        // If no WHERE parameters, execute without params
        const [result] = await db.execute(query);
        rows = result;
      }
      
      return rows;
    } catch (error) {
      console.error('Error in Appointment.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT 
          a.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          p.date_of_birth,
          p.sex,
          p.contact_number,
          p.address,
          p.hiv_status,
          at.type_name,
          at.duration_minutes,
          at.description as type_description,
          u.username as created_by_username,
          creator.username as creator_name,
          updater.username as updater_name,
          q.id as queue_id,
          q.queue_number,
          q.status as queue_status,
          q.called_at,
          q.served_at,
          q.completed_at
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN users creator ON a.created_by = creator.id
        LEFT JOIN users updater ON a.updated_by = updater.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE a.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Appointment.findById:', error);
      throw error;
    }
  }

  static async findByPatientId(patientId, pagination = {}) {
    try {
      const db = await this.getConnection();
      const { limit = 100, offset = 0 } = pagination;

      // Convert limit and offset to integers
      const limitNum = parseInt(limit) || 100;
      const offsetNum = parseInt(offset) || 0;

      // Build query with concatenated LIMIT and OFFSET
      const query = `
        SELECT 
          a.*,
          at.type_name,
          at.duration_minutes,
          q.queue_number,
          q.status as queue_status
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE a.patient_id = ?
        ORDER BY a.scheduled_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      const [rows] = await db.execute(query, [patientId]);
      return rows;
    } catch (error) {
      console.error('Error in Appointment.findByPatientId:', error);
      throw error;
    }
  }

  static async getTodayAppointments() {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT 
          a.*,
          p.patient_facility_code,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          p.middle_name as patient_middle_name,
          at.type_name,
          at.duration_minutes,
          q.id as queue_id,
          q.queue_number,
          q.status as queue_status,
          TIMESTAMPDIFF(MINUTE, NOW(), a.scheduled_at) as minutes_until
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN queue q ON a.id = q.appointment_id
        WHERE DATE(a.scheduled_at) = CURDATE()
        ORDER BY 
          CASE 
            WHEN a.status = 'IN_PROGRESS' THEN 1
            WHEN a.status = 'CONFIRMED' THEN 2
            WHEN a.status = 'SCHEDULED' THEN 3
            ELSE 4
          END,
          a.scheduled_at ASC`
      );

      return rows;
    } catch (error) {
      console.error('Error in Appointment.getTodayAppointments:', error);
      throw error;
    }
  }

  static async create(appointmentData) {
    try {
      const db = await this.getConnection();
      const {
        appointment_number,
        patient_id,
        appointment_type_id,
        scheduled_at,
        notes,
        created_by
      } = appointmentData;

      const [result] = await db.execute(
        `INSERT INTO appointments (
          appointment_number, patient_id, appointment_type_id, 
          scheduled_at, notes, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, NOW(), NOW())`,
        [appointment_number, patient_id, appointment_type_id, scheduled_at, notes || null, created_by]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error in Appointment.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const db = await this.getConnection();
      const fields = [];
      const values = [];

      if (updateData.appointment_type_id !== undefined) {
        fields.push('appointment_type_id = ?');
        values.push(updateData.appointment_type_id);
      }
      if (updateData.scheduled_at !== undefined) {
        fields.push('scheduled_at = ?');
        values.push(updateData.scheduled_at);
      }
      if (updateData.notes !== undefined) {
        fields.push('notes = ?');
        values.push(updateData.notes);
      }
      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }

      if (fields.length === 0) return false;

      fields.push('updated_at = NOW()');
      values.push(id);

      const [result] = await db.execute(
        `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Appointment.update:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, userId) {
    try {
      const db = await this.getConnection();
      const [result] = await db.execute(
        `UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?`,
        [status, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Appointment.updateStatus:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const db = await this.getConnection();
      const [result] = await db.execute('DELETE FROM appointments WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Appointment.delete:', error);
      throw error;
    }
  }

  static async count(filters = {}) {
    try {
      const db = await this.getConnection();
      const { status, patient_id, type_id, search, start_date, end_date } = filters;

      let query = 'SELECT COUNT(*) as total FROM appointments a WHERE 1=1';
      const queryParams = [];

      if (status) {
        query += ` AND a.status = ?`;
        queryParams.push(status);
      }
      if (patient_id) {
        query += ` AND a.patient_id = ?`;
        queryParams.push(patient_id);
      }
      if (type_id) {
        query += ` AND a.appointment_type_id = ?`;
        queryParams.push(type_id);
      }
      if (start_date) {
        query += ` AND DATE(a.scheduled_at) >= ?`;
        queryParams.push(start_date);
      }
      if (end_date) {
        query += ` AND DATE(a.scheduled_at) <= ?`;
        queryParams.push(end_date);
      }
      if (search) {
        query += ` AND (
          a.appointment_number LIKE ? OR
          EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id AND (p.first_name LIKE ? OR p.last_name LIKE ?))
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const [rows] = await db.execute(query, queryParams);
      return rows[0].total;
    } catch (error) {
      console.error('Error in Appointment.count:', error);
      throw error;
    }
  }

  static async checkConflicts(patientId, scheduledAt, excludeId = null) {
    try {
      const db = await this.getConnection();
      const scheduledTime = new Date(scheduledAt);
      const bufferMinutes = 15;
      const startBuffer = new Date(scheduledTime.getTime() - bufferMinutes * 60000);
      const endBuffer = new Date(scheduledTime.getTime() + 60 * 60000 + bufferMinutes * 60000);

      let query = `
        SELECT a.*, p.first_name, p.last_name 
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.patient_id = ? 
          AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
          AND a.scheduled_at BETWEEN ? AND ?
      `;

      const params = [patientId, startBuffer, endBuffer];

      if (excludeId) {
        query += ` AND a.id != ?`;
        params.push(excludeId);
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in Appointment.checkConflicts:', error);
      throw error;
    }
  }

  static async checkSlotAvailability(date, hour, minute) {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM appointments 
         WHERE DATE(scheduled_at) = ? 
         AND HOUR(scheduled_at) = ? 
         AND MINUTE(scheduled_at) = ?
         AND status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [date, hour, minute]
      );

      return rows[0].count;
    } catch (error) {
      console.error('Error in Appointment.checkSlotAvailability:', error);
      throw error;
    }
  }

  static async getStatusCounts() {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT status, COUNT(*) as count 
         FROM appointments 
         WHERE DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY status`
      );
      return rows;
    } catch (error) {
      console.error('Error in Appointment.getStatusCounts:', error);
      throw error;
    }
  }

  static async generateNumber(prefix) {
    try {
      const db = await this.getConnection();
      const [lastAppointment] = await db.execute(
        `SELECT appointment_number FROM appointments 
       WHERE appointment_number LIKE ? 
       ORDER BY id DESC LIMIT 1`,
        [`${prefix}%`]
      );

      let sequence = 1;
      if (lastAppointment.length > 0) {
        const lastSeq = parseInt(lastAppointment[0].appointment_number.split('-')[1]);
        sequence = lastSeq + 1;
      }

      return `${prefix}-${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error in Appointment.generateNumber:', error);
      throw error;
    }
  }

  static async getStatistics(period = 'week') {
    try {
      const db = await this.getConnection();
      let dateCondition = '';
      let interval = '';
      let groupBy = '';

      switch (period) {
        case 'week':
          dateCondition = 'DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          interval = 'DATE(scheduled_at)';
          groupBy = 'DATE(scheduled_at)';
          break;
        case 'month':
          dateCondition = 'DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          interval = 'DATE(scheduled_at)';
          groupBy = 'DATE(scheduled_at)';
          break;
        case 'year':
          dateCondition = 'YEAR(scheduled_at) = YEAR(CURDATE())';
          interval = 'MONTH(scheduled_at)';
          groupBy = 'MONTH(scheduled_at)';
          break;
        default:
          dateCondition = 'DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          interval = 'DATE(scheduled_at)';
          groupBy = 'DATE(scheduled_at)';
      }

      // Get status breakdown
      const [statusStats] = await db.execute(
        `SELECT status, COUNT(*) as count 
         FROM appointments 
         WHERE ${dateCondition}
         GROUP BY status`
      );

      // Get timeline statistics
      const [timelineStats] = await db.execute(
        `SELECT ${interval} as period, COUNT(*) as count 
         FROM appointments 
         WHERE ${dateCondition}
         GROUP BY ${groupBy}
         ORDER BY period DESC 
         LIMIT 10`
      );

      // Get appointment type distribution
      const [typeStats] = await db.execute(
        `SELECT at.type_name, COUNT(*) as count 
         FROM appointments a
         JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE ${dateCondition}
         GROUP BY at.type_name`
      );

      // Get average wait time
      const [avgWaitTime] = await db.execute(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, a.scheduled_at, q.served_at)) as avg_wait_minutes
         FROM appointments a
         JOIN queue q ON a.id = q.appointment_id
         WHERE a.status = 'COMPLETED' 
           AND q.served_at IS NOT NULL
           AND ${dateCondition}`
      );

      // Get no-show statistics
      const [noShowStats] = await db.execute(
        `SELECT 
          COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_shows,
          COUNT(*) as total,
          ROUND(COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) * 100.0 / COUNT(*), 2) as no_show_rate
         FROM appointments 
         WHERE ${dateCondition}`
      );

      return {
        period,
        status_breakdown: statusStats,
        timeline: timelineStats,
        type_distribution: typeStats,
        average_wait_minutes: avgWaitTime[0]?.avg_wait_minutes || 0,
        no_show_rate: noShowStats[0]?.no_show_rate || 0,
        total_appointments: noShowStats[0]?.total || 0,
        no_shows: noShowStats[0]?.no_shows || 0
      };
    } catch (error) {
      console.error('Error in Appointment.getStatistics:', error);
      throw error;
    }
  }

  static async getStatusCountsByDateRange(startDate, endDate) {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT status, COUNT(*) as count 
         FROM appointments 
         WHERE DATE(scheduled_at) BETWEEN ? AND ?
         GROUP BY status`,
        [startDate, endDate]
      );
      return rows;
    } catch (error) {
      console.error('Error in Appointment.getStatusCountsByDateRange:', error);
      throw error;
    }
  }

  static async getDailyAppointmentsCount(days = 7) {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT 
          DATE(scheduled_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
         FROM appointments 
         WHERE DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(scheduled_at)
         ORDER BY date DESC`,
        [days]
      );
      return rows;
    } catch (error) {
      console.error('Error in Appointment.getDailyAppointmentsCount:', error);
      throw error;
    }
  }

  static async getPeakHours() {
    try {
      const db = await this.getConnection();
      const [rows] = await db.execute(
        `SELECT 
          HOUR(scheduled_at) as hour,
          COUNT(*) as appointment_count
         FROM appointments 
         WHERE DATE(scheduled_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           AND status NOT IN ('CANCELLED', 'NO_SHOW')
         GROUP BY HOUR(scheduled_at)
         ORDER BY appointment_count DESC
         LIMIT 5`
      );
      return rows;
    } catch (error) {
      console.error('Error in Appointment.getPeakHours:', error);
      throw error;
    }
  }
}

module.exports = Appointment;