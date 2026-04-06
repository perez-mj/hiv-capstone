// backend/models/Dashboard.js
const pool = require('../db');

class Dashboard {
  // ==================== ADMIN DASHBOARD MODELS ====================
  
  static async getAdminOverview() {
    const [totalPatients] = await pool.execute(
      'SELECT COUNT(*) as count FROM patients'
    );

    const [patientsByStatus] = await pool.execute(`
      SELECT 
        hiv_status,
        COUNT(*) as count
      FROM patients
      GROUP BY hiv_status
    `);

    const [staffCount] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role IN ('ADMIN', 'NURSE')
    `);

    const [todayAppointments] = await pool.execute(`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
      FROM appointments 
      WHERE DATE(scheduled_at) = CURDATE()
    `);

    const [queueStatus] = await pool.execute(`
      SELECT 
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN q.status = 'CALLED' THEN 1 ELSE 0 END) as called,
        SUM(CASE WHEN q.status = 'SERVING' THEN 1 ELSE 0 END) as serving,
        SUM(CASE WHEN q.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM queue q
      WHERE DATE(q.created_at) = CURDATE()
    `);

    return {
      total_patients: totalPatients[0].count,
      total_staff: staffCount[0].count,
      patients_by_status: patientsByStatus,
      today_appointments: todayAppointments[0],
      current_queue: queueStatus[0] || { 
        total_in_queue: 0, 
        waiting: 0, 
        called: 0, 
        serving: 0, 
        completed: 0 
      }
    };
  }

  static async getRecentAppointments(limit = 10) {
  const intLimit = parseInt(limit, 10);
  const [rows] = await pool.execute(`
    SELECT 
      a.id,
      a.appointment_number,
      CONCAT(p.first_name, ' ', p.last_name) as patient_name,
      p.patient_facility_code,
      at.type_name as appointment_type,
      a.scheduled_at,
      a.status,
      a.notes,
      u.username as created_by_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN appointment_types at ON a.appointment_type_id = at.id
    LEFT JOIN users u ON a.created_by = u.id
    ORDER BY a.created_at DESC
    LIMIT ${intLimit}
  `);
  return rows;
}

  static async getMonthlyStats(months = 6) {
    const [rows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(scheduled_at, '%Y-%m') as month,
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      WHERE scheduled_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(scheduled_at, '%Y-%m')
      ORDER BY month DESC
    `, [months]);
    return rows;
  }

  static async getTodayQueue() {
    const [rows] = await pool.execute(`
      SELECT 
        q.id,
        q.queue_number,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        at.type_name as appointment_type,
        q.status,
        q.created_at,
        TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) as waiting_minutes
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
      ORDER BY 
        CASE q.status
          WHEN 'SERVING' THEN 1
          WHEN 'CALLED' THEN 2
          WHEN 'WAITING' THEN 3
          ELSE 4
        END,
        q.queue_number
    `);
    return rows;
  }

  static async getAppointmentTrends(months = 12) {
    const [rows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(scheduled_at, '%Y-%m') as month,
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      WHERE scheduled_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(scheduled_at, '%Y-%m')
      ORDER BY month DESC
    `, [months]);
    return rows;
  }

  static async getPatientDemographics() {
    const [totalPatients] = await pool.execute('SELECT COUNT(*) as total FROM patients');
    
    const [byStatus] = await pool.execute(`
      SELECT hiv_status, COUNT(*) as count 
      FROM patients 
      GROUP BY hiv_status
    `);
    
    const [bySex] = await pool.execute(`
      SELECT sex, COUNT(*) as count 
      FROM patients 
      GROUP BY sex
    `);
    
    const [ageDistribution] = await pool.execute(`
      SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) < 18 THEN 'Under 18'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 18 AND 30 THEN '18-30'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 31 AND 45 THEN '31-45'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 46 AND 60 THEN '46-60'
          ELSE 'Over 60'
        END as age_group,
        COUNT(*) as count
      FROM patients
      GROUP BY age_group
    `);

    return {
      total: totalPatients[0].total,
      by_hiv_status: byStatus,
      by_sex: bySex,
      age_distribution: ageDistribution
    };
  }

  static async getQueuePerformanceMetrics(days = 30) {
    const [avgWaitTimes] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as avg_wait_time,
        AVG(TIMESTAMPDIFF(MINUTE, called_at, completed_at)) as avg_service_time,
        COUNT(*) as patients_served
      FROM queue
      WHERE status = 'COMPLETED'
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [days]);

    const [peakHours] = await pool.execute(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as total_calls,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) as avg_response_time
      FROM queue
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY total_calls DESC
      LIMIT 5
    `);

    return {
      daily_performance: avgWaitTimes,
      peak_hours: peakHours,
      period_days: days
    };
  }

  // ==================== NURSE DASHBOARD MODELS ====================

  static async getNurseInfo(userId) {
    const [rows] = await pool.execute(
      `SELECT s.*, u.username, u.email 
       FROM staff s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  static async getTodayAppointmentsForNurse() {
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.appointment_number,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.patient_facility_code,
        p.date_of_birth,
        p.hiv_status,
        p.contact_number,
        at.type_name as appointment_type,
        a.scheduled_at,
        a.status,
        a.notes,
        q.queue_number,
        q.status as queue_status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id AND DATE(q.created_at) = CURDATE()
      WHERE DATE(a.scheduled_at) = CURDATE()
      ORDER BY 
        CASE 
          WHEN q.queue_number IS NOT NULL THEN 0
          ELSE 1
        END,
        q.queue_number,
        a.scheduled_at
    `);
    return rows;
  }

  static async getCurrentQueueForNurse() {
    const [rows] = await pool.execute(`
      SELECT 
        q.id,
        q.queue_number,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.patient_facility_code,
        at.type_name as appointment_type,
        q.status,
        q.created_at,
        TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) as waiting_minutes,
        a.id as appointment_id,
        a.notes as appointment_notes
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        CASE q.status
          WHEN 'SERVING' THEN 1
          WHEN 'CALLED' THEN 2
          WHEN 'WAITING' THEN 3
        END,
        q.queue_number
    `);
    return rows;
  }

  static async getRecentEncountersByStaff(staffId, limit = 10) {
    const [rows] = await pool.execute(`
      SELECT 
        ce.id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.patient_facility_code,
        ce.type,
        ce.encounter_date,
        ce.notes
      FROM clinical_encounters ce
      JOIN patients p ON ce.patient_id = p.id
      WHERE ce.staff_id = ?
      ORDER BY ce.encounter_date DESC
      LIMIT ?
    `, [staffId, limit]);
    return rows;
  }

  static async getPendingLabResults(limit = 20) {
    const [rows] = await pool.execute(`
      SELECT 
        lr.id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.patient_facility_code,
        lr.test_type,
        lr.test_date,
        a.appointment_number,
        a.id as appointment_id
      FROM lab_results lr
      JOIN patients p ON lr.patient_id = p.id
      LEFT JOIN appointments a ON lr.appointment_id = a.id
      WHERE (lr.result_value IS NULL OR lr.result_value = '')
        AND lr.test_date <= CURDATE()
      ORDER BY lr.test_date DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  static async getNurseSchedule(date) {
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.appointment_number,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.patient_facility_code,
        p.contact_number,
        p.hiv_status,
        at.type_name as appointment_type,
        at.duration_minutes,
        a.scheduled_at,
        a.status as appointment_status,
        q.queue_number,
        q.status as queue_status,
        q.called_at,
        q.served_at,
        CASE 
          WHEN q.id IS NOT NULL THEN 'In Queue'
          WHEN a.status = 'COMPLETED' THEN 'Completed'
          WHEN a.status = 'CANCELLED' THEN 'Cancelled'
          WHEN a.status = 'NO_SHOW' THEN 'No Show'
          ELSE 'Scheduled'
        END as current_status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id AND DATE(q.created_at) = DATE(a.scheduled_at)
      WHERE DATE(a.scheduled_at) = ?
      ORDER BY 
        CASE 
          WHEN q.status = 'SERVING' THEN 1
          WHEN q.status = 'CALLED' THEN 2
          WHEN q.status = 'WAITING' THEN 3
          WHEN a.status = 'SCHEDULED' THEN 4
          WHEN a.status = 'CONFIRMED' THEN 5
          ELSE 6
        END,
        q.queue_number,
        a.scheduled_at
    `, [date]);
    return rows;
  }

  static async getNurseQueueSummary() {
    const currentQueue = await this.getCurrentQueueForNurse();
    
    return {
      waiting: currentQueue.filter(q => q.status === 'WAITING').length,
      called: currentQueue.filter(q => q.status === 'CALLED').length,
      serving: currentQueue.filter(q => q.status === 'SERVING').length,
      total: currentQueue.length
    };
  }

  static async getNurseScheduleStats(date) {
    const schedule = await this.getNurseSchedule(date);
    
    return {
      total: schedule.length,
      in_queue: schedule.filter(s => s.queue_status && ['WAITING', 'CALLED', 'SERVING'].includes(s.queue_status)).length,
      completed: schedule.filter(s => s.appointment_status === 'COMPLETED').length,
      scheduled: schedule.filter(s => ['SCHEDULED', 'CONFIRMED'].includes(s.appointment_status) && !s.queue_status).length,
      cancelled: schedule.filter(s => s.appointment_status === 'CANCELLED').length,
      no_show: schedule.filter(s => s.appointment_status === 'NO_SHOW').length
    };
  }

  // ==================== PATIENT DASHBOARD MODELS ====================

  static async getPatientInfo(userId) {
    const [rows] = await pool.execute(`
      SELECT 
        p.*,
        u.username,
        u.email,
        u.last_login
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `, [userId]);
    return rows[0];
  }

  static async getPatientUpcomingAppointments(patientId, limit = 5) {
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.appointment_number,
        at.type_name as appointment_type,
        a.scheduled_at,
        a.status,
        a.notes,
        q.queue_number,
        q.status as queue_status
      FROM appointments a
      JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN queue q ON a.id = q.appointment_id AND DATE(q.created_at) = CURDATE()
      WHERE a.patient_id = ? 
        AND a.scheduled_at >= NOW()
        AND a.status IN ('SCHEDULED', 'CONFIRMED')
      ORDER BY a.scheduled_at
      LIMIT ?
    `, [patientId, limit]);
    return rows;
  }

  static async getPatientRecentLabResults(patientId, limit = 10) {
    const [rows] = await pool.execute(`
      SELECT 
        id,
        test_type,
        test_date,
        result_value,
        result_unit,
        reference_range,
        interpretation,
        file_path
      FROM lab_results
      WHERE patient_id = ?
      ORDER BY test_date DESC
      LIMIT ?
    `, [patientId, limit]);
    return rows;
  }

  static async getPatientRecentEncounters(patientId, limit = 5) {
    const [rows] = await pool.execute(`
      SELECT 
        ce.id,
        ce.type,
        ce.encounter_date,
        ce.notes,
        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
        s.position
      FROM clinical_encounters ce
      JOIN staff s ON ce.staff_id = s.id
      WHERE ce.patient_id = ?
      ORDER BY ce.encounter_date DESC
      LIMIT ?
    `, [patientId, limit]);
    return rows;
  }

  static async getPatientCurrentQueue(patientId) {
    const [rows] = await pool.execute(`
      SELECT 
        q.id,
        q.queue_number,
        q.status,
        q.created_at,
        a.scheduled_at,
        at.type_name as appointment_type,
        (
          SELECT COUNT(*) + 1 
          FROM queue q2 
          WHERE DATE(q2.created_at) = CURDATE() 
            AND q2.status IN ('WAITING', 'CALLED')
            AND q2.queue_number < q.queue_number
        ) as position_ahead,
        (
          SELECT COUNT(*) 
          FROM queue q2 
          WHERE DATE(q2.created_at) = CURDATE() 
            AND q2.status IN ('WAITING', 'CALLED')
        ) as total_waiting
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.patient_id = ? 
        AND DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY q.created_at DESC
      LIMIT 1
    `, [patientId]);
    return rows[0];
  }

  static async getPatientSummary(patientId) {
    const upcomingCount = await this.getPatientUpcomingAppointments(patientId, 100);
    const labResults = await this.getPatientRecentLabResults(patientId, 100);
    const encounters = await this.getPatientRecentEncounters(patientId, 100);
    const patient = await this.getPatientInfoByPatientId(patientId);

    return {
      total_upcoming: upcomingCount.length,
      total_lab_results: labResults.length,
      total_encounters: encounters.length,
      latest_cd4: patient?.latest_cd4_count,
      latest_viral_load: patient?.latest_viral_load,
      on_art: patient?.art_start_date ? true : false
    };
  }

  static async getPatientInfoByPatientId(patientId) {
    const [rows] = await pool.execute(`
      SELECT * FROM patients WHERE id = ?
    `, [patientId]);
    return rows[0];
  }

  // ==================== PUBLIC QUEUE MODELS ====================

  static async getPublicQueue(limit = 20) {
    const [rows] = await pool.execute(`
      SELECT 
        q.queue_number,
        CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as patient_name_initial,
        at.type_name as appointment_type,
        q.status,
        q.created_at,
        TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) as waiting_minutes,
        CASE 
          WHEN q.status = 'WAITING' AND TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) > 30 THEN 'long_wait'
          WHEN q.status = 'WAITING' AND TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) > 15 THEN 'medium_wait'
          ELSE 'normal'
        END as wait_category
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY 
        CASE q.status
          WHEN 'SERVING' THEN 1
          WHEN 'CALLED' THEN 2
          WHEN 'WAITING' THEN 3
        END,
        q.queue_number
      LIMIT ?
    `, [limit]);
    return rows;
  }

  static async getCurrentlyServing() {
    const [rows] = await pool.execute(`
      SELECT 
        q.queue_number,
        CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as patient_name_initial,
        at.type_name as appointment_type,
        q.served_at
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE DATE(q.created_at) = CURDATE()
        AND q.status = 'SERVING'
      ORDER BY q.served_at DESC
      LIMIT 1
    `);
    return rows[0];
  }

  static async getPublicQueueStats() {
    const queue = await this.getPublicQueue(100);
    const waitingCount = queue.filter(q => q.status === 'WAITING').length;
    const avgServiceTime = 15; // minutes, can be calculated from historical data
    const estimatedWaitTime = waitingCount * avgServiceTime;

    return {
      total_waiting: waitingCount,
      total_in_queue: queue.length,
      estimated_wait_time: estimatedWaitTime,
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = Dashboard;