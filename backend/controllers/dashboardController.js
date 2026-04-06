// controllers/dashboardController.js
const Dashboard = require('../models/Dashboard');
const { sendSuccess, sendNotFound, sendBadRequest } = require('../utils/responseHandler');
const { calculateAge } = require('../utils/helpers');

const dashboardController = {
  // ==================== ADMIN DASHBOARD ====================
  
  async getAdminDashboard(req, res, next) {
    try {
      const overview = await Dashboard.getAdminOverview();
      const recentAppointments = await Dashboard.getRecentAppointments(10);
      const monthlyStats = await Dashboard.getMonthlyStats(6);
      const todayQueue = await Dashboard.getTodayQueue();

      sendSuccess(res, 'Admin dashboard data retrieved successfully', {
        overview,
        recent_appointments: recentAppointments,
        monthly_statistics: monthlyStats,
        today_queue: todayQueue
      });
    } catch (error) {
      next(error);
    }
  },

  async getAppointmentTrends(req, res, next) {
    try {
      const { months = 12 } = req.query;
      const monthlyStats = await Dashboard.getAppointmentTrends(parseInt(months));
      
      sendSuccess(res, 'Appointment trends retrieved successfully', {
        monthly_trends: monthlyStats
      });
    } catch (error) {
      next(error);
    }
  },

  async getPatientDemographics(req, res, next) {
    try {
      const demographics = await Dashboard.getPatientDemographics();
      sendSuccess(res, 'Patient demographics retrieved successfully', demographics);
    } catch (error) {
      next(error);
    }
  },

  async getQueuePerformanceMetrics(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const metrics = await Dashboard.getQueuePerformanceMetrics(parseInt(days));
      sendSuccess(res, 'Queue performance metrics retrieved successfully', metrics);
    } catch (error) {
      next(error);
    }
  },

  // ==================== NURSE DASHBOARD ====================

  async getNurseDashboard(req, res, next) {
    try {
      const nurseInfo = await Dashboard.getNurseInfo(req.user.id);
      
      if (!nurseInfo) {
        return sendNotFound(res, 'Nurse profile not found');
      }

      const todayAppointments = await Dashboard.getTodayAppointmentsForNurse();
      const currentQueue = await Dashboard.getCurrentQueueForNurse();
      const recentEncounters = await Dashboard.getRecentEncountersByStaff(nurseInfo.id, 10);
      const pendingLabs = await Dashboard.getPendingLabResults(20);
      const queueSummary = await Dashboard.getNurseQueueSummary();

      sendSuccess(res, 'Nurse dashboard data retrieved successfully', {
        nurse: {
          id: nurseInfo.id,
          name: `${nurseInfo.first_name} ${nurseInfo.last_name}`,
          position: nurseInfo.position,
          contact_number: nurseInfo.contact_number
        },
        today_appointments: todayAppointments,
        current_queue: currentQueue,
        recent_encounters: recentEncounters,
        pending_lab_results: pendingLabs,
        queue_summary: queueSummary
      });
    } catch (error) {
      next(error);
    }
  },

  async getNurseSchedule(req, res, next) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      const schedule = await Dashboard.getNurseSchedule(date);
      const stats = await Dashboard.getNurseScheduleStats(date);

      sendSuccess(res, 'Nurse schedule retrieved successfully', {
        date,
        appointments: schedule,
        statistics: stats
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== PATIENT DASHBOARD ====================

  async getPatientDashboard(req, res, next) {
    try {
      const patient = await Dashboard.getPatientInfo(req.user.id);
      
      if (!patient) {
        return sendNotFound(res, 'Patient profile not found');
      }

      const patientId = patient.id;
      const upcomingAppointments = await Dashboard.getPatientUpcomingAppointments(patientId, 5);
      const recentLabResults = await Dashboard.getPatientRecentLabResults(patientId, 10);
      const recentEncounters = await Dashboard.getPatientRecentEncounters(patientId, 5);
      const currentQueue = await Dashboard.getPatientCurrentQueue(patientId);
      const summary = await Dashboard.getPatientSummary(patientId);

      // Calculate age
      const age = calculateAge(patient.date_of_birth);

      // Format patient name
      const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + ' ' : ''}${patient.last_name}`;

      sendSuccess(res, 'Patient dashboard data retrieved successfully', {
        patient: {
          id: patient.id,
          facility_code: patient.patient_facility_code,
          full_name: fullName,
          first_name: patient.first_name,
          last_name: patient.last_name,
          middle_name: patient.middle_name,
          date_of_birth: patient.date_of_birth,
          age: age,
          sex: patient.sex,
          address: patient.address,
          contact_number: patient.contact_number,
          hiv_status: patient.hiv_status,
          diagnosis_date: patient.diagnosis_date,
          art_start_date: patient.art_start_date,
          latest_cd4_count: patient.latest_cd4_count,
          latest_viral_load: patient.latest_viral_load
        },
        upcoming_appointments: upcomingAppointments,
        recent_lab_results: recentLabResults,
        recent_encounters: recentEncounters,
        current_queue: currentQueue || null,
        summary
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== PUBLIC QUEUE DASHBOARD ====================

  async getPublicQueue(req, res, next) {
    try {
      const queue = await Dashboard.getPublicQueue(20);
      const currentlyServing = await Dashboard.getCurrentlyServing();
      const stats = await Dashboard.getPublicQueueStats();

      sendSuccess(res, 'Public queue status retrieved successfully', {
        currently_serving: currentlyServing || null,
        queue: queue,
        statistics: stats
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;