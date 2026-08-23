// backend/routes/appointmentAvailability.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const schedulingService = require('../services/appointmentSchedulingService');
const db = require('../models');

/**
 * GET /api/appointments/available-slots/:date
 * Get available time slots for a specific date
 * Query params: office, patientId
 */
router.get('/available-slots/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const { office, patientId } = req.query;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // If user is patient, use their patient ID
    let patientIdToCheck = patientId;
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ 
        where: { user_id: req.user.id } 
      });
      if (patient) {
        patientIdToCheck = patient.id;
      }
    }

    const result = await schedulingService.getAvailableAppointmentSlots(
      date,
      office,
      patientIdToCheck ? parseInt(patientIdToCheck) : null
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/appointments/date-availability
 * Get date range with availability
 * Query params: startDate, endDate, office
 */
router.get('/date-availability', auth, async (req, res) => {
  try {
    const { startDate, endDate, office } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Validate date formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const availability = await schedulingService.getDateAvailability(
      startDate,
      endDate,
      office
    );

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error getting date availability:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/appointments/next-available
 * Get next available appointment date
 * Query params: office, daysToCheck
 */
router.get('/next-available', auth, async (req, res) => {
  try {
    const { office, daysToCheck = 30 } = req.query;

    const nextDate = await schedulingService.getNextAvailableDate(
      office,
      parseInt(daysToCheck, 10)
    );

    res.json({
      success: true,
      data: {
        nextAvailableDate: nextDate
      }
    });
  } catch (error) {
    console.error('Error getting next available date:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/appointments/settings
 * Get appointment settings
 */
router.get('/settings', auth, async (req, res) => {
  try {
    let office = req.query.office;
    
    // If user is staff, use their office
    if (req.user.role === 'staff' && !office) {
      office = req.user.office;
    }

    // Get settings from the AppointmentSetting model
    const settings = await db.AppointmentSetting.getSettingsObject(office);
    
    // Format the response for the frontend
    const appointmentSettings = {
      clinic_start_time: settings.start_time,
      clinic_end_time: settings.end_time,
      slot_duration_minutes: settings.slot_duration_minutes,
      max_capacity_per_slot: settings.max_capacity_per_slot,
      lunch_break_start: settings.lunch_start,
      lunch_break_end: settings.lunch_end,
      daily_capacity: settings.daily_capacity,
      working_days: settings.working_days,
      holidays: settings.holidays || [],
      advance_booking_days: settings.advance_booking_days,
      booking_lead_time_minutes: settings.booking_lead_time_minutes,
      allow_online_booking: settings.allow_online_booking,
      allow_online_cancellation: settings.allow_online_cancellation,
      cancellation_deadline_hours: settings.cancellation_deadline_hours,
      max_appointments_per_patient_per_day: settings.max_appointments_per_patient_per_day,
      office: office || 'global',
      timezone: 'Asia/Manila'
    };

    res.json({
      success: true,
      data: appointmentSettings
    });
  } catch (error) {
    console.error('Error getting appointment settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;