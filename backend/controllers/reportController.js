// backend/controllers/reportController.js
const pool = require('../db');
const { sendSuccess, sendBadRequest } = require('../utils/responseHandler');
const PDFDocument = require('pdfkit');

class ReportController {
  constructor() {
    // Bind all methods to ensure proper 'this' context
    this.getAppointmentReport = this.getAppointmentReport.bind(this);
    this.getPatientReport = this.getPatientReport.bind(this);
    this.getQueueReport = this.getQueueReport.bind(this);
    this.getLabResultsReport = this.getLabResultsReport.bind(this);
    this.getStaffPerformanceReport = this.getStaffPerformanceReport.bind(this);
    this.getHIVSummaryReport = this.getHIVSummaryReport.bind(this);
    this.getDashboardSummaryReport = this.getDashboardSummaryReport.bind(this);
    this.exportToCSV = this.exportToCSV.bind(this);
    this.exportToPDF = this.exportToPDF.bind(this);
    this.getAvailableReportTypes = this.getAvailableReportTypes.bind(this);
  }

  // Helper method to fetch report data directly from database
  async fetchReportDataDirect(type, queryParams) {
    const { startDate, endDate, status, hivStatus, sex, testType, stream } = queryParams;
    
    try {
      switch(type) {
        case 'appointments': {
          let query = `
            SELECT 
              a.id,
              a.appointment_number,
              CONCAT(p.first_name, ' ', p.last_name) as patient_name,
              p.patient_facility_code,
              p.hiv_status,
              at.type_name as appointment_type,
              a.scheduled_at,
              a.status,
              a.notes,
              a.cancellation_reason,
              u.username as created_by,
              a.created_at,
              a.updated_at
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            LEFT JOIN users u ON a.created_by = u.id
            WHERE 1=1
          `;
          
          const params = [];
          if (startDate && endDate) {
            query += ` AND DATE(a.scheduled_at) >= ? AND DATE(a.scheduled_at) <= ?`;
            params.push(startDate, endDate);
          }
          if (status) {
            query += ` AND a.status = ?`;
            params.push(status);
          }
          query += ` ORDER BY a.scheduled_at DESC`;
          
          const [data] = await pool.execute(query, params);
          
          // Fix: Separate stats query to avoid parameter issues
          let statsQuery = `
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
              SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
            FROM appointments
          `;
          
          if (startDate && endDate) {
            statsQuery += ` WHERE DATE(scheduled_at) >= ? AND DATE(scheduled_at) <= ?`;
            const [stats] = await pool.execute(statsQuery, [startDate, endDate]);
            return { data, summary: stats[0] || {} };
          } else {
            const [stats] = await pool.execute(statsQuery);
            return { data, summary: stats[0] || {} };
          }
        }
        
        case 'patients': {
          let query = `
            SELECT 
              p.id,
              p.patient_facility_code,
              CONCAT(p.first_name, ' ', p.last_name) as full_name,
              p.first_name,
              p.last_name,
              p.middle_name,
              p.date_of_birth,
              TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
              p.sex,
              p.address,
              p.contact_number,
              p.hiv_status,
              p.diagnosis_date,
              p.art_start_date,
              p.latest_cd4_count,
              p.latest_viral_load,
              u.email,
              u.last_login
            FROM patients p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
          `;
          
          const params = [];
          if (startDate && endDate) {
            query += ` AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?`;
            params.push(startDate, endDate);
          }
          if (hivStatus) {
            query += ` AND p.hiv_status = ?`;
            params.push(hivStatus);
          }
          if (sex) {
            query += ` AND p.sex = ?`;
            params.push(sex);
          }
          query += ` ORDER BY p.created_at DESC`;
          
          const [data] = await pool.execute(query, params);
          
          let demoQuery = `
            SELECT 
              COUNT(*) as total_patients,
              SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive,
              SUM(CASE WHEN hiv_status = 'NON_REACTIVE' THEN 1 ELSE 0 END) as non_reactive,
              SUM(CASE WHEN sex = 'MALE' THEN 1 ELSE 0 END) as male,
              SUM(CASE WHEN sex = 'FEMALE' THEN 1 ELSE 0 END) as female,
              SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art,
              AVG(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE())) as avg_age
            FROM patients
          `;
          
          if (startDate && endDate) {
            demoQuery += ` WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?`;
            const [summary] = await pool.execute(demoQuery, [startDate, endDate]);
            return { data, summary: summary[0] || {} };
          } else {
            const [summary] = await pool.execute(demoQuery);
            return { data, summary: summary[0] || {} };
          }
        }
        
        case 'queue': {
          let query = `
            SELECT 
              q.id,
              q.queue_number,
              q.queue_code,
              q.queue_stream,
              q.stream_queue_number,
              CONCAT(p.first_name, ' ', p.last_name) as patient_name,
              p.patient_facility_code,
              at.type_name as appointment_type,
              q.status,
              q.created_at,
              q.called_at,
              q.served_at,
              q.completed_at,
              TIMESTAMPDIFF(MINUTE, q.created_at, COALESCE(q.called_at, q.served_at, q.completed_at, NOW())) as wait_time_minutes
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.id
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            WHERE 1=1
          `;
          
          const params = [];
          if (startDate && endDate) {
            query += ` AND DATE(q.created_at) >= ? AND DATE(q.created_at) <= ?`;
            params.push(startDate, endDate);
          }
          if (stream) {
            query += ` AND q.queue_stream = ?`;
            params.push(stream);
          }
          query += ` ORDER BY q.created_at DESC`;
          
          const [data] = await pool.execute(query, params);
          
          const metrics = {
            total_in_queue: data.length,
            completed: data.filter(q => q.status === 'COMPLETED').length,
            average_wait_time_minutes: data.length > 0 
              ? Math.round(data.reduce((sum, q) => sum + (parseInt(q.wait_time_minutes) || 0), 0) / data.length)
              : 0
          };
          
          return { data, summary: metrics };
        }
        
        case 'lab-results': {
          let query = `
            SELECT 
              lr.id,
              CONCAT(p.first_name, ' ', p.last_name) as patient_name,
              p.patient_facility_code,
              lr.test_type,
              lr.test_date,
              lr.result_value,
              lr.result_unit,
              lr.reference_range,
              lr.interpretation,
              a.appointment_number
            FROM lab_results lr
            JOIN patients p ON lr.patient_id = p.id
            LEFT JOIN appointments a ON lr.appointment_id = a.id
            WHERE 1=1
          `;
          
          const params = [];
          if (startDate && endDate) {
            query += ` AND lr.test_date >= ? AND lr.test_date <= ?`;
            params.push(startDate, endDate);
          }
          if (testType) {
            query += ` AND lr.test_type = ?`;
            params.push(testType);
          }
          query += ` ORDER BY lr.test_date DESC`;
          
          const [data] = await pool.execute(query, params);
          
          const summary = {
            total_tests: data.length,
            completed_tests: data.filter(lr => lr.result_value && lr.result_value !== '').length,
            pending_tests: data.filter(lr => !lr.result_value || lr.result_value === '').length
          };
          
          return { data, summary };
        }
        
        case 'hiv-summary': {
          const [data] = await pool.execute(`
            SELECT 
              hiv_status,
              COUNT(*) as count,
              SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art
            FROM patients
            GROUP BY hiv_status
          `);
          
          const [summary] = await pool.execute(`
            SELECT 
              COUNT(*) as total_patients,
              SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive_count,
              SUM(CASE WHEN hiv_status = 'NON_REACTIVE' THEN 1 ELSE 0 END) as non_reactive_count,
              SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art_count
            FROM patients
          `);
          
          return { data, summary: summary[0] || {} };
        }
        
        default:
          return { data: [], summary: {} };
      }
    } catch (error) {
      console.error('Error in fetchReportDataDirect:', error);
      throw error;
    }
  }

  // Get appointment report
  async getAppointmentReport(req, res, next) {
    try {
      const { startDate, endDate, status, typeId } = req.query;
      
      let query = `
        SELECT 
          a.id,
          a.appointment_number,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          p.patient_facility_code,
          p.hiv_status,
          at.type_name as appointment_type,
          a.scheduled_at,
          a.status,
          a.notes,
          a.cancellation_reason,
          u.username as created_by,
          a.created_at,
          a.updated_at
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON a.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        query += ` AND DATE(a.scheduled_at) >= ? AND DATE(a.scheduled_at) <= ?`;
        params.push(startDate, endDate);
      }
      
      if (status) {
        query += ` AND a.status = ?`;
        params.push(status);
      }
      
      if (typeId) {
        query += ` AND a.appointment_type_id = ?`;
        params.push(typeId);
      }
      
      query += ` ORDER BY a.scheduled_at DESC`;
      
      const [appointments] = await pool.execute(query, params);
      
      let statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show,
          SUM(CASE WHEN status IN ('SCHEDULED', 'CONFIRMED') THEN 1 ELSE 0 END) as scheduled,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress
        FROM appointments
      `;
      
      let statsParams = [];
      
      if (startDate && endDate) {
        statsQuery += ` WHERE DATE(scheduled_at) >= ? AND DATE(scheduled_at) <= ?`;
        statsParams.push(startDate, endDate);
        const [stats] = await pool.execute(statsQuery, statsParams);
        
        sendSuccess(res, 'Appointment report generated successfully', {
          filters: { startDate, endDate, status, typeId },
          summary: stats[0] || { total: 0, completed: 0, cancelled: 0, no_show: 0, scheduled: 0, in_progress: 0 },
          appointments,
          total: appointments.length,
          generated_at: new Date().toISOString()
        });
      } else {
        const [stats] = await pool.execute(statsQuery);
        
        sendSuccess(res, 'Appointment report generated successfully', {
          filters: { startDate, endDate, status, typeId },
          summary: stats[0] || { total: 0, completed: 0, cancelled: 0, no_show: 0, scheduled: 0, in_progress: 0 },
          appointments,
          total: appointments.length,
          generated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getAppointmentReport:', error);
      next(error);
    }
  }
  
  // Get patient report
  async getPatientReport(req, res, next) {
    try {
      const { startDate, endDate, hivStatus, sex } = req.query;
      
      let query = `
        SELECT 
          p.id,
          p.patient_facility_code,
          CONCAT(p.first_name, ' ', p.last_name) as full_name,
          p.first_name,
          p.last_name,
          p.middle_name,
          p.date_of_birth,
          TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
          p.sex,
          p.address,
          p.contact_number,
          p.hiv_status,
          p.diagnosis_date,
          p.art_start_date,
          p.latest_cd4_count,
          p.latest_viral_load,
          u.email,
          u.last_login,
          u.is_active as user_active,
          (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id) as total_appointments,
          (SELECT COUNT(*) FROM clinical_encounters WHERE patient_id = p.id) as total_encounters,
          (SELECT COUNT(*) FROM lab_results WHERE patient_id = p.id) as total_lab_tests
        FROM patients p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        query += ` AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?`;
        params.push(startDate, endDate);
      }
      
      if (hivStatus) {
        query += ` AND p.hiv_status = ?`;
        params.push(hivStatus);
      }
      
      if (sex) {
        query += ` AND p.sex = ?`;
        params.push(sex);
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [patients] = await pool.execute(query, params);
      
      let demoQuery = `
        SELECT 
          COUNT(*) as total_patients,
          SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive,
          SUM(CASE WHEN hiv_status = 'NON_REACTIVE' THEN 1 ELSE 0 END) as non_reactive,
          SUM(CASE WHEN hiv_status = 'INDETERMINATE' THEN 1 ELSE 0 END) as indeterminate,
          SUM(CASE WHEN sex = 'MALE' THEN 1 ELSE 0 END) as male,
          SUM(CASE WHEN sex = 'FEMALE' THEN 1 ELSE 0 END) as female,
          SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art,
          SUM(CASE WHEN latest_cd4_count < 200 THEN 1 ELSE 0 END) as low_cd4,
          AVG(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE())) as avg_age,
          AVG(latest_cd4_count) as avg_cd4
        FROM patients
      `;
      
      if (startDate && endDate) {
        demoQuery += ` WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?`;
        const [demographics] = await pool.execute(demoQuery, [startDate, endDate]);
        
        sendSuccess(res, 'Patient report generated successfully', {
          filters: { startDate, endDate, hivStatus, sex },
          summary: demographics[0] || {
            total_patients: 0,
            reactive: 0,
            non_reactive: 0,
            indeterminate: 0,
            male: 0,
            female: 0,
            on_art: 0,
            low_cd4: 0,
            avg_age: 0,
            avg_cd4: 0
          },
          patients,
          total: patients.length,
          generated_at: new Date().toISOString()
        });
      } else {
        const [demographics] = await pool.execute(demoQuery);
        
        sendSuccess(res, 'Patient report generated successfully', {
          filters: { startDate, endDate, hivStatus, sex },
          summary: demographics[0] || {
            total_patients: 0,
            reactive: 0,
            non_reactive: 0,
            indeterminate: 0,
            male: 0,
            female: 0,
            on_art: 0,
            low_cd4: 0,
            avg_age: 0,
            avg_cd4: 0
          },
          patients,
          total: patients.length,
          generated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getPatientReport:', error);
      next(error);
    }
  }
  
  // Get queue report
async getQueueReport(req, res, next) {
  try {
    const { startDate, endDate, status, stream } = req.query;
    
    let query = `
      SELECT 
        q.id,
        q.queue_number,
        q.queue_code,
        q.queue_stream,
        q.stream_queue_number,
        q.priority,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.patient_facility_code,
        at.type_name as appointment_type,
        q.status,
        q.reason_on_skip,
        q.created_at,
        q.called_at,
        q.served_at,
        q.completed_at,
        TIMESTAMPDIFF(MINUTE, q.created_at, COALESCE(q.called_at, q.served_at, q.completed_at, NOW())) as wait_to_call_minutes,
        TIMESTAMPDIFF(MINUTE, q.called_at, q.served_at) as service_minutes,
        TIMESTAMPDIFF(MINUTE, q.created_at, q.completed_at) as total_minutes,
        CASE 
          WHEN q.queue_stream = 'TESTING' THEN 'Testing Stream'
          WHEN q.queue_stream = 'CONSULTATION' THEN 'Consultation Stream'
          ELSE q.queue_stream
        END as stream_label,
        CONCAT(s.first_name, ' ', s.last_name) as served_by,
        u.username as created_by_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN appointment_types at ON a.appointment_type_id = at.id
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN staff s ON a.created_by = s.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ` AND DATE(q.created_at) >= ? AND DATE(q.created_at) <= ?`;
      params.push(startDate, endDate);
    }
    
    if (status) {
      query += ` AND q.status = ?`;
      params.push(status);
    }
    
    if (stream) {
      query += ` AND q.queue_stream = ?`;
      params.push(stream);
    }
    
    query += ` ORDER BY q.created_at DESC`;
    
    const [queueItems] = await pool.execute(query, params);
    
    const completedItems = queueItems.filter(q => q.status === 'COMPLETED');
    const avgWaitTime = completedItems.length > 0 
      ? Math.round(completedItems.reduce((sum, q) => sum + (parseInt(q.wait_to_call_minutes) || 0), 0) / completedItems.length)
      : 0;
    const avgServiceTime = completedItems.length > 0
      ? Math.round(completedItems.reduce((sum, q) => sum + (parseInt(q.service_minutes) || 0), 0) / completedItems.length)
      : 0;
    
    // FIX: Added GROUP BY clause
    let streamQuery = `
      SELECT 
        queue_stream,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(called_at, served_at, completed_at, NOW()))) as avg_wait_time
      FROM queue
      WHERE 1=1
      GROUP BY queue_stream
    `;
    
    let streamParams = [];
    
    if (startDate && endDate) {
      streamQuery = `
        SELECT 
          queue_stream,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(called_at, served_at, completed_at, NOW()))) as avg_wait_time
        FROM queue
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
        GROUP BY queue_stream
      `;
      streamParams.push(startDate, endDate);
      const [streamMetrics] = await pool.execute(streamQuery, streamParams);
      
      sendSuccess(res, 'Queue report generated successfully', {
        filters: { startDate, endDate, status, stream },
        metrics: {
          total_in_queue: queueItems.length,
          completed: completedItems.length,
          average_wait_time_minutes: avgWaitTime,
          average_service_time_minutes: avgServiceTime,
          stream_metrics: streamMetrics
        },
        queue_items: queueItems,
        total: queueItems.length,
        generated_at: new Date().toISOString()
      });
    } else {
      const [streamMetrics] = await pool.execute(streamQuery);
      
      sendSuccess(res, 'Queue report generated successfully', {
        filters: { startDate, endDate, status, stream },
        metrics: {
          total_in_queue: queueItems.length,
          completed: completedItems.length,
          average_wait_time_minutes: avgWaitTime,
          average_service_time_minutes: avgServiceTime,
          stream_metrics: streamMetrics
        },
        queue_items: queueItems,
        total: queueItems.length,
        generated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in getQueueReport:', error);
    next(error);
  }
}
  
  // Get lab results report
  async getLabResultsReport(req, res, next) {
    try {
      const { startDate, endDate, testType } = req.query;
      
      let query = `
        SELECT 
          lr.id,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          p.patient_facility_code,
          lr.test_type,
          lr.test_date,
          lr.result_value,
          lr.result_unit,
          lr.reference_range,
          lr.interpretation,
          a.appointment_number,
          u.username as entered_by,
          lr.file_path,
          lr.created_at
        FROM lab_results lr
        JOIN patients p ON lr.patient_id = p.id
        LEFT JOIN appointments a ON lr.appointment_id = a.id
        LEFT JOIN users u ON lr.performed_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        query += ` AND lr.test_date >= ? AND lr.test_date <= ?`;
        params.push(startDate, endDate);
      }
      
      if (testType) {
        query += ` AND lr.test_type = ?`;
        params.push(testType);
      }
      
      query += ` ORDER BY lr.test_date DESC`;
      
      const [labResults] = await pool.execute(query, params);
      
      const summary = {
        total_tests: labResults.length,
        by_test_type: {},
        abnormal_results: labResults.filter(lr => 
          lr.interpretation && lr.interpretation.toLowerCase().includes('abnormal')
        ).length,
        pending_results: labResults.filter(lr => !lr.result_value || lr.result_value === '').length,
        cd4_count_completed: labResults.filter(lr => lr.test_type === 'CD4' && lr.result_value).length,
        viral_load_completed: labResults.filter(lr => lr.test_type === 'VIRAL_LOAD' && lr.result_value).length
      };
      
      labResults.forEach(lr => {
        if (!summary.by_test_type[lr.test_type]) {
          summary.by_test_type[lr.test_type] = 0;
        }
        summary.by_test_type[lr.test_type]++;
      });
      
      sendSuccess(res, 'Lab results report generated successfully', {
        filters: { startDate, endDate, testType },
        summary,
        lab_results: labResults,
        total: labResults.length,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getLabResultsReport:', error);
      next(error);
    }
  }
  
  // Get staff performance report
async getStaffPerformanceReport(req, res, next) {
  try {
    const { startDate, endDate, staffId } = req.query;
    
    // Remove appointment join since clinical_encounters doesn't have appointment_id
    let query = `
      SELECT 
        s.id,
        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
        s.position,
        s.contact_number,
        COUNT(DISTINCT ce.id) as total_encounters,
        SUM(CASE WHEN DATE(ce.encounter_date) = CURDATE() THEN 1 ELSE 0 END) as today_encounters,
        SUM(CASE WHEN DATE(ce.encounter_date) = CURDATE() - INTERVAL 1 DAY THEN 1 ELSE 0 END) as yesterday_encounters
      FROM staff s
      LEFT JOIN clinical_encounters ce ON s.id = ce.staff_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ` AND DATE(ce.encounter_date) >= ? AND DATE(ce.encounter_date) <= ?`;
      params.push(startDate, endDate);
    }
    
    if (staffId) {
      query += ` AND s.id = ?`;
      params.push(staffId);
    }
    
    query += ` GROUP BY s.id ORDER BY total_encounters DESC`;
    
    const [staffPerformance] = await pool.execute(query, params);
    
    sendSuccess(res, 'Staff performance report generated successfully', {
      filters: { startDate, endDate, staffId },
      staff_performance: staffPerformance,
      total: staffPerformance.length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getStaffPerformanceReport:', error);
    next(error);
  }
}
  
  // Get HIV summary report
  async getHIVSummaryReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      const [summary] = await pool.execute(`
        SELECT 
          COUNT(*) as total_patients,
          SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive_count,
          SUM(CASE WHEN hiv_status = 'NON_REACTIVE' THEN 1 ELSE 0 END) as non_reactive_count,
          SUM(CASE WHEN hiv_status = 'INDETERMINATE' THEN 1 ELSE 0 END) as indeterminate_count,
          SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art_count,
          SUM(CASE WHEN art_start_date IS NULL AND hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as not_on_art_count,
          SUM(CASE WHEN latest_cd4_count IS NOT NULL AND latest_cd4_count < 200 THEN 1 ELSE 0 END) as low_cd4_count,
          SUM(CASE WHEN latest_cd4_count IS NOT NULL AND latest_cd4_count BETWEEN 200 AND 349 THEN 1 ELSE 0 END) as medium_cd4_count,
          SUM(CASE WHEN latest_cd4_count IS NOT NULL AND latest_cd4_count >= 350 THEN 1 ELSE 0 END) as high_cd4_count,
          AVG(latest_cd4_count) as avg_cd4_count,
          AVG(latest_viral_load) as avg_viral_load
        FROM patients
      `);
      
      let trendsQuery = `
        SELECT 
          DATE_FORMAT(diagnosis_date, '%Y-%m') as month,
          COUNT(*) as new_diagnoses,
          SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as started_art
        FROM patients
        WHERE diagnosis_date IS NOT NULL
      `;
      
      let trendsParams = [];
      
      if (startDate && endDate) {
        trendsQuery += ` AND diagnosis_date >= ? AND diagnosis_date <= ?`;
        trendsParams.push(startDate, endDate);
        trendsQuery += ` GROUP BY DATE_FORMAT(diagnosis_date, '%Y-%m') ORDER BY month DESC LIMIT 12`;
        
        const [monthlyTrends] = await pool.execute(trendsQuery, trendsParams);
        
        const [artOutcomes] = await pool.execute(`
          SELECT 
            SUM(CASE WHEN DATEDIFF(NOW(), art_start_date) <= 90 THEN 1 ELSE 0 END) as new_on_art,
            SUM(CASE WHEN DATEDIFF(NOW(), art_start_date) BETWEEN 91 AND 180 THEN 1 ELSE 0 END) as on_art_3_6_months,
            SUM(CASE WHEN DATEDIFF(NOW(), art_start_date) > 180 THEN 1 ELSE 0 END) as on_art_over_6_months
          FROM patients
          WHERE art_start_date IS NOT NULL
            AND hiv_status = 'REACTIVE'
        `);
        
        sendSuccess(res, 'HIV summary report generated successfully', {
          filters: { startDate, endDate },
          summary: summary[0] || {
            total_patients: 0,
            reactive_count: 0,
            non_reactive_count: 0,
            indeterminate_count: 0,
            on_art_count: 0,
            not_on_art_count: 0,
            low_cd4_count: 0,
            medium_cd4_count: 0,
            high_cd4_count: 0,
            avg_cd4_count: 0,
            avg_viral_load: 0
          },
          art_outcomes: artOutcomes[0] || { new_on_art: 0, on_art_3_6_months: 0, on_art_over_6_months: 0 },
          monthly_trends: monthlyTrends,
          generated_at: new Date().toISOString()
        });
      } else {
        trendsQuery += ` GROUP BY DATE_FORMAT(diagnosis_date, '%Y-%m') ORDER BY month DESC LIMIT 12`;
        
        const [monthlyTrends] = await pool.execute(trendsQuery);
        
        const [artOutcomes] = await pool.execute(`
          SELECT 
            SUM(CASE WHEN DATEDIFF(NOW(), art_start_date) <= 90 THEN 1 ELSE 0 END) as new_on_art,
            SUM(CASE WHEN DATEDIFF(NOW(), art_start_date) BETWEEN 91 AND 180 THEN 1 ELSE 0 END) as on_art_3_6_months,
            SUM(CASE WHEN DATEDIFF(NOW(), art_start_date) > 180 THEN 1 ELSE 0 END) as on_art_over_6_months
          FROM patients
          WHERE art_start_date IS NOT NULL
            AND hiv_status = 'REACTIVE'
        `);
        
        sendSuccess(res, 'HIV summary report generated successfully', {
          filters: { startDate, endDate },
          summary: summary[0] || {
            total_patients: 0,
            reactive_count: 0,
            non_reactive_count: 0,
            indeterminate_count: 0,
            on_art_count: 0,
            not_on_art_count: 0,
            low_cd4_count: 0,
            medium_cd4_count: 0,
            high_cd4_count: 0,
            avg_cd4_count: 0,
            avg_viral_load: 0
          },
          art_outcomes: artOutcomes[0] || { new_on_art: 0, on_art_3_6_months: 0, on_art_over_6_months: 0 },
          monthly_trends: monthlyTrends,
          generated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in getHIVSummaryReport:', error);
      next(error);
    }
  }
  
  // Get dashboard summary report
  async getDashboardSummaryReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      let aptQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
        FROM appointments
      `;
      
      if (startDate && endDate) {
        aptQuery += ` WHERE DATE(scheduled_at) >= ? AND DATE(scheduled_at) <= ?`;
        const [appointmentStats] = await pool.execute(aptQuery, [startDate, endDate]);
        
        let patientQuery = `
          SELECT 
            COUNT(*) as total_new_patients,
            SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive_new
          FROM patients
          WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
        `;
        
        const [patientStats] = await pool.execute(patientQuery, [startDate, endDate]);
        
        let queueQuery = `
          SELECT 
            COUNT(*) as total_served,
            AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_wait_time
          FROM queue
          WHERE status = 'COMPLETED' AND DATE(created_at) >= ? AND DATE(created_at) <= ?
        `;
        
        const [queueStats] = await pool.execute(queueQuery, [startDate, endDate]);
        
        let labQuery = `
          SELECT 
            COUNT(*) as total_tests,
            SUM(CASE WHEN result_value IS NOT NULL AND result_value != '' THEN 1 ELSE 0 END) as completed_tests
          FROM lab_results
          WHERE test_date >= ? AND test_date <= ?
        `;
        
        const [labStats] = await pool.execute(labQuery, [startDate, endDate]);
        
        let hivQuery = `
          SELECT 
            COUNT(*) as total_hiv_patients,
            SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art
          FROM patients
          WHERE hiv_status = 'REACTIVE' AND DATE(created_at) >= ? AND DATE(created_at) <= ?
        `;
        
        const [hivStats] = await pool.execute(hivQuery, [startDate, endDate]);
        
        sendSuccess(res, 'Dashboard summary report generated successfully', {
          period: { startDate, endDate, generated: new Date().toISOString() },
          appointments: appointmentStats[0] || { total: 0, completed: 0, cancelled: 0, no_show: 0 },
          patients: patientStats[0] || { total_new_patients: 0, reactive_new: 0 },
          queue: queueStats[0] || { total_served: 0, avg_wait_time: 0 },
          laboratory: labStats[0] || { total_tests: 0, completed_tests: 0 },
          hiv: hivStats[0] || { total_hiv_patients: 0, on_art: 0 }
        });
      } else {
        const [appointmentStats] = await pool.execute(aptQuery);
        
        let patientQuery = `
          SELECT 
            COUNT(*) as total_new_patients,
            SUM(CASE WHEN hiv_status = 'REACTIVE' THEN 1 ELSE 0 END) as reactive_new
          FROM patients
        `;
        
        const [patientStats] = await pool.execute(patientQuery);
        
        let queueQuery = `
          SELECT 
            COUNT(*) as total_served,
            AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_wait_time
          FROM queue
          WHERE status = 'COMPLETED'
        `;
        
        const [queueStats] = await pool.execute(queueQuery);
        
        let labQuery = `
          SELECT 
            COUNT(*) as total_tests,
            SUM(CASE WHEN result_value IS NOT NULL AND result_value != '' THEN 1 ELSE 0 END) as completed_tests
          FROM lab_results
        `;
        
        const [labStats] = await pool.execute(labQuery);
        
        let hivQuery = `
          SELECT 
            COUNT(*) as total_hiv_patients,
            SUM(CASE WHEN art_start_date IS NOT NULL THEN 1 ELSE 0 END) as on_art
          FROM patients
          WHERE hiv_status = 'REACTIVE'
        `;
        
        const [hivStats] = await pool.execute(hivQuery);
        
        sendSuccess(res, 'Dashboard summary report generated successfully', {
          period: { startDate, endDate, generated: new Date().toISOString() },
          appointments: appointmentStats[0] || { total: 0, completed: 0, cancelled: 0, no_show: 0 },
          patients: patientStats[0] || { total_new_patients: 0, reactive_new: 0 },
          queue: queueStats[0] || { total_served: 0, avg_wait_time: 0 },
          laboratory: labStats[0] || { total_tests: 0, completed_tests: 0 },
          hiv: hivStats[0] || { total_hiv_patients: 0, on_art: 0 }
        });
      }
    } catch (error) {
      console.error('Error in getDashboardSummaryReport:', error);
      next(error);
    }
  }
  
  // Get available report types
  async getAvailableReportTypes(req, res, next) {
    const reportTypes = [
      { id: 'appointments', name: 'Appointments Report', description: 'View appointment statistics, status distribution, and trends', icon: 'mdi-calendar-check' },
      { id: 'patients', name: 'Patients Report', description: 'Patient demographics, HIV status distribution, and treatment progress', icon: 'mdi-account-group' },
      { id: 'queue', name: 'Queue Performance Report', description: 'Queue metrics, wait time analysis, and stream performance', icon: 'mdi-format-list-group' },
      { id: 'lab-results', name: 'Laboratory Results Report', description: 'Lab test results, completion rates, and test type distribution', icon: 'mdi-flask' },
      { id: 'staff-performance', name: 'Staff Performance Report', description: 'Staff productivity metrics and encounter statistics', icon: 'mdi-account-tie' },
      { id: 'hiv-summary', name: 'HIV Summary Report', description: 'HIV patient statistics, ART outcomes, and treatment trends', icon: 'mdi-heart-pulse' },
      { id: 'dashboard-summary', name: 'Dashboard Summary', description: 'Combined metrics and KPIs from all modules', icon: 'mdi-view-dashboard' }
    ];
    
    sendSuccess(res, 'Available report types retrieved', reportTypes);
  }
  
  // Export to CSV
  async exportToCSV(req, res, next) {
    try {
      const { type } = req.params;
      const queryParams = req.query;
      
      const { data } = await this.fetchReportDataDirect(type, queryParams);
      
      if (!data || data.length === 0) {
        // Return empty CSV with headers
        const filename = `${type}_report_${queryParams.startDate || 'all'}_to_${queryParams.endDate || 'all'}`;
        const emptyCsv = 'No data found for the selected criteria.';
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(emptyCsv);
      }
      
      const filename = `${type}_report_${queryParams.startDate || 'all'}_to_${queryParams.endDate || 'all'}`;
      
      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvRows = [];
      
      // Add headers
      csvRows.push(headers.join(','));
      
      // Add data rows
      for (const row of data) {
        const values = headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) value = '';
          if (value instanceof Date) value = value.toISOString();
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      }
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      return res.send(csvContent);
    } catch (error) {
      console.error('Error in exportToCSV:', error);
      next(error);
    }
  }
  
  // Export to PDF using PDFKit
  async exportToPDF(req, res, next) {
    try {
      const { type } = req.params;
      const queryParams = req.query;
      
      const { data, summary } = await this.fetchReportDataDirect(type, queryParams);
      
      const filename = `${type}_report_${queryParams.startDate || 'all'}_to_${queryParams.endDate || 'all'}`;
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
      
      doc.pipe(res);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(`${type.toUpperCase()} REPORT`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.text(`Period: ${queryParams.startDate || 'All'} to ${queryParams.endDate || 'Present'}`, { align: 'center' });
      doc.moveDown();
      
      // Summary Section
      if (summary && Object.keys(summary).length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica');
        for (const [key, value] of Object.entries(summary)) {
          if (value !== null && value !== undefined && typeof value !== 'object') {
            doc.text(`${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
          }
        }
        doc.moveDown();
      }
      
      // Data Table
      if (data && data.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Detailed Data', { underline: true });
        doc.moveDown(0.5);
        
        // Get headers (limit to first 6 columns for better fit)
        const headers = Object.keys(data[0]).slice(0, 6);
        let tableTop = doc.y;
        const rowHeight = 20;
        const colWidth = (doc.page.width - 100) / headers.length;
        
        // Draw table headers
        doc.fontSize(9).font('Helvetica-Bold');
        let currentX = 50;
        headers.forEach(header => {
          doc.text(header.replace(/_/g, ' ').toUpperCase(), currentX, tableTop, {
            width: colWidth,
            align: 'left'
          });
          currentX += colWidth;
        });
        
        // Draw data rows (limit to first 20 records for PDF)
        let currentY = tableTop + rowHeight;
        doc.fontSize(8).font('Helvetica');
        
        for (let i = 0; i < Math.min(data.length, 20); i++) {
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;
            tableTop = currentY - rowHeight;
            
            // Redraw headers on new page
            currentX = 50;
            doc.fontSize(9).font('Helvetica-Bold');
            headers.forEach(header => {
              doc.text(header.replace(/_/g, ' ').toUpperCase(), currentX, tableTop, {
                width: colWidth,
                align: 'left'
              });
              currentX += colWidth;
            });
            doc.fontSize(8).font('Helvetica');
          }
          
          currentX = 50;
          const row = data[i];
          headers.forEach(header => {
            let value = row[header];
            if (value === null || value === undefined) value = '';
            if (value instanceof Date) value = value.toLocaleDateString();
            if (typeof value === 'object') value = JSON.stringify(value);
            doc.text(String(value).substring(0, 30), currentX, currentY, {
              width: colWidth,
              align: 'left'
            });
            currentX += colWidth;
          });
          currentY += rowHeight;
        }
        
        if (data.length > 20) {
          doc.moveDown();
          doc.fontSize(9).font('Helvetica-Oblique')
            .text(`Note: Showing first 20 of ${data.length} records. Export to CSV for all records.`, { align: 'center' });
        }
      } else {
        doc.fontSize(12).font('Helvetica-Oblique').text('No data found for the selected criteria.', { align: 'center' });
      }
      
      // Footer
      doc.on('end', () => {
        console.log('PDF generation completed');
      });
      
      doc.end();
    } catch (error) {
      console.error('Error in exportToPDF:', error);
      next(error);
    }
  }
}

module.exports = new ReportController();