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

    // If user is patient, use their patient ID
    let patientIdToCheck = patientId;
    if (req.user.role === 'patient') {
      const patient = await db.Patient.findOne({ where: { user_id: req.user.id } });
      if (patient) {
        patientIdToCheck = patient.id;
      }
    }

    const result = await schedulingService.getAvailableAppointmentSlots(
      date,
      office,
      patientIdToCheck
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
      parseInt(daysToCheck)
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
 * Get appointment settings (for staff only)
 */
router.get('/settings', auth, roleCheck('staff', 'admin'), async (req, res) => {
  try {
    // Get office from query params, or use user's office if staff
    let office = req.query.office;
    if (req.user.role === 'staff' && !office) {
      office = req.user.office;
    }

    // Get settings from the new AppointmentSetting model
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
      holidays: settings.holidays,
      advance_booking_days: settings.advance_booking_days,
      booking_lead_time_minutes: settings.booking_lead_time_minutes,
      allow_online_booking: settings.allow_online_booking,
      allow_online_cancellation: settings.allow_online_cancellation,
      cancellation_deadline_hours: settings.cancellation_deadline_hours,
      max_appointments_per_patient_per_day: settings.max_appointments_per_patient_per_day,
      // Additional fields that might be useful for frontend
      office: office || 'global',
      timezone: 'Asia/Manila' // You can add this to the model if needed
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

/**
 * PUT /api/appointments/settings
 * Update appointment settings (admin only)
 */
router.put('/settings', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { office, ...updates } = req.body;
    
    // Get existing settings or create new ones
    let settings;
    if (office) {
      settings = await db.AppointmentSetting.findOne({
        where: { office, is_active: true }
      });
    }
    
    if (!settings) {
      settings = await db.AppointmentSetting.findOne({
        where: { office: null, is_active: true }
      });
    }
    
    if (!settings) {
      // Create default settings if none exist
      settings = await db.AppointmentSetting.create({
        office: office || null
      });
    }
    
    // Update only allowed fields
    const allowedFields = [
      'start_time', 'end_time', 'slot_duration_minutes', 
      'max_capacity_per_slot', 'lunch_start', 'lunch_end',
      'daily_capacity', 'working_days', 'holidays',
      'advance_booking_days', 'booking_lead_time_minutes',
      'max_appointments_per_patient_per_day', 'allow_online_booking',
      'allow_online_cancellation', 'cancellation_deadline_hours',
      'is_active'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        settings[field] = updates[field];
      }
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating appointment settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/appointments/settings/reset
 * Reset settings to defaults (admin only)
 */
router.post('/settings/reset', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { office } = req.body;
    
    // Delete existing settings
    const where = office ? { office } : { office: null };
    await db.AppointmentSetting.destroy({ where });
    
    // Create new default settings
    const settings = await db.AppointmentSetting.create({
      office: office || null
    });
    
    res.json({
      success: true,
      message: 'Settings reset to defaults',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;