// backend/routes/appointmentSettings.js
const express = require('express');
const router = express.Router();
const { AppointmentSetting } = require('../models');
const { Op, sequelize } = require('sequelize');
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

// All admin routes require authentication and admin role
router.use(auth);
router.use(roleCheck('admin'));

// Get all appointment settings
router.get('/', async (req, res) => {
  try {
    const settings = await AppointmentSetting.findAll({
      order: [
        ['office', 'ASC'], // NULLs will appear last by default in MySQL
        ['id', 'ASC']
      ]
    });
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching appointment settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment settings',
      error: error.message
    });
  }
});

// Get settings for a specific office (or global)
router.get('/office/:office', async (req, res) => {
  try {
    const office = req.params.office === 'null' ? null : req.params.office;
    const settings = await AppointmentSetting.getSettingsObject(office);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching office settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch office settings',
      error: error.message
    });
  }
});

// Get a single appointment setting by ID
router.get('/:id', async (req, res) => {
  try {
    const setting = await AppointmentSetting.findByPk(req.params.id);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Appointment setting not found'
      });
    }
    
    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching appointment setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment setting',
      error: error.message
    });
  }
});

// Create a new appointment setting
router.post('/', async (req, res) => {
  try {
    const {
      office,
      start_time,
      end_time,
      slot_duration_minutes,
      max_capacity_per_slot,
      lunch_start,
      lunch_end,
      daily_capacity,
      working_days,
      holidays,
      advance_booking_days,
      booking_lead_time_minutes,
      max_appointments_per_patient_per_day,
      allow_online_booking,
      allow_online_cancellation,
      cancellation_deadline_hours,
      is_active
    } = req.body;

    // Check if settings already exist for this office
    if (office) {
      const existing = await AppointmentSetting.findOne({
        where: { office }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Settings already exist for office: ${office}`
        });
      }
    }

    const setting = await AppointmentSetting.create({
      office: office || null,
      start_time: start_time || '08:00:00',
      end_time: end_time || '17:00:00',
      slot_duration_minutes: slot_duration_minutes || 30,
      max_capacity_per_slot: max_capacity_per_slot || 5,
      lunch_start: lunch_start || '12:00:00',
      lunch_end: lunch_end || '13:00:00',
      daily_capacity: daily_capacity || 20,
      working_days: working_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
      holidays: holidays || [],
      advance_booking_days: advance_booking_days || 30,
      booking_lead_time_minutes: booking_lead_time_minutes || 60,
      max_appointments_per_patient_per_day: max_appointments_per_patient_per_day || 1,
      allow_online_booking: allow_online_booking !== undefined ? allow_online_booking : true,
      allow_online_cancellation: allow_online_cancellation !== undefined ? allow_online_cancellation : true,
      cancellation_deadline_hours: cancellation_deadline_hours || 24,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({
      success: true,
      data: setting,
      message: 'Appointment setting created successfully'
    });
  } catch (error) {
    console.error('Error creating appointment setting:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create appointment setting',
      error: error.message
    });
  }
});

// Update an appointment setting
router.put('/:id', async (req, res) => {
  try {
    const setting = await AppointmentSetting.findByPk(req.params.id);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Appointment setting not found'
      });
    }

    const {
      office,
      start_time,
      end_time,
      slot_duration_minutes,
      max_capacity_per_slot,
      lunch_start,
      lunch_end,
      daily_capacity,
      working_days,
      holidays,
      advance_booking_days,
      booking_lead_time_minutes,
      max_appointments_per_patient_per_day,
      allow_online_booking,
      allow_online_cancellation,
      cancellation_deadline_hours,
      is_active
    } = req.body;

    // If changing office, check for conflicts
    if (office && office !== setting.office) {
      const existing = await AppointmentSetting.findOne({
        where: { 
          office,
          id: { [Op.ne]: setting.id }
        }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Settings already exist for office: ${office}`
        });
      }
    }

    await setting.update({
      office: office !== undefined ? office : setting.office,
      start_time: start_time || setting.start_time,
      end_time: end_time || setting.end_time,
      slot_duration_minutes: slot_duration_minutes || setting.slot_duration_minutes,
      max_capacity_per_slot: max_capacity_per_slot || setting.max_capacity_per_slot,
      lunch_start: lunch_start || setting.lunch_start,
      lunch_end: lunch_end || setting.lunch_end,
      daily_capacity: daily_capacity || setting.daily_capacity,
      working_days: working_days || setting.working_days,
      holidays: holidays !== undefined ? holidays : setting.holidays,
      advance_booking_days: advance_booking_days || setting.advance_booking_days,
      booking_lead_time_minutes: booking_lead_time_minutes || setting.booking_lead_time_minutes,
      max_appointments_per_patient_per_day: max_appointments_per_patient_per_day || setting.max_appointments_per_patient_per_day,
      allow_online_booking: allow_online_booking !== undefined ? allow_online_booking : setting.allow_online_booking,
      allow_online_cancellation: allow_online_cancellation !== undefined ? allow_online_cancellation : setting.allow_online_cancellation,
      cancellation_deadline_hours: cancellation_deadline_hours || setting.cancellation_deadline_hours,
      is_active: is_active !== undefined ? is_active : setting.is_active
    });

    res.json({
      success: true,
      data: setting,
      message: 'Appointment setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment setting:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update appointment setting',
      error: error.message
    });
  }
});

// Delete an appointment setting (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const setting = await AppointmentSetting.findByPk(req.params.id);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Appointment setting not found'
      });
    }

    // Don't allow deleting global settings if they're the only ones
    if (!setting.office) {
      const count = await AppointmentSetting.count();
      if (count === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only global settings. At least one setting must exist.'
        });
      }
    }

    await setting.destroy();

    res.json({
      success: true,
      message: 'Appointment setting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment setting',
      error: error.message
    });
  }
});

// Toggle active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const setting = await AppointmentSetting.findByPk(req.params.id);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Appointment setting not found'
      });
    }

    // Don't allow deactivating global settings if no other active settings exist
    if (setting.is_active && !setting.office) {
      const activeCount = await AppointmentSetting.count({
        where: { is_active: true }
      });
      
      if (activeCount === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the only active settings. At least one setting must be active.'
        });
      }
    }

    await setting.update({
      is_active: !setting.is_active
    });

    res.json({
      success: true,
      data: setting,
      message: `Settings ${setting.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling appointment setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle appointment setting',
      error: error.message
    });
  }
});

// Bulk update (for applying global settings to all offices)
router.post('/apply-to-all', async (req, res) => {
  try {
    const { sourceSettingId, targetOffice } = req.body;
    
    const sourceSetting = await AppointmentSetting.findByPk(sourceSettingId);
    if (!sourceSetting) {
      return res.status(404).json({
        success: false,
        message: 'Source setting not found'
      });
    }

    // Get all settings for the target office or all offices
    const whereClause = {};
    if (targetOffice) {
      whereClause.office = targetOffice;
    } else {
      whereClause.office = { [Op.ne]: null };
    }

    const targetSettings = await AppointmentSetting.findAll({
      where: whereClause
    });

    const results = [];
    for (const target of targetSettings) {
      await target.update({
        start_time: sourceSetting.start_time,
        end_time: sourceSetting.end_time,
        slot_duration_minutes: sourceSetting.slot_duration_minutes,
        max_capacity_per_slot: sourceSetting.max_capacity_per_slot,
        lunch_start: sourceSetting.lunch_start,
        lunch_end: sourceSetting.lunch_end,
        daily_capacity: sourceSetting.daily_capacity,
        working_days: sourceSetting.working_days,
        holidays: sourceSetting.holidays,
        advance_booking_days: sourceSetting.advance_booking_days,
        booking_lead_time_minutes: sourceSetting.booking_lead_time_minutes,
        max_appointments_per_patient_per_day: sourceSetting.max_appointments_per_patient_per_day,
        allow_online_booking: sourceSetting.allow_online_booking,
        allow_online_cancellation: sourceSetting.allow_online_cancellation,
        cancellation_deadline_hours: sourceSetting.cancellation_deadline_hours
      });
      results.push(target);
    }

    res.json({
      success: true,
      data: results,
      message: `Settings applied to ${results.length} office(s) successfully`
    });
  } catch (error) {
    console.error('Error applying settings to all:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply settings',
      error: error.message
    });
  }
});

module.exports = router;