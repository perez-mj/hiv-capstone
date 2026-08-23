// backend/models/AppointmentSetting.js
const { DataTypes, Op } = require('sequelize');  // Add Op here

module.exports = (sequelize) => {
  const AppointmentSetting = sequelize.define('AppointmentSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    office: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null
    },
    // Working hours
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '08:00:00'
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '17:00:00'
    },
    slot_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 5,
        max: 120
      }
    },
    max_capacity_per_slot: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 20
      }
    },
    // Lunch break
    lunch_start: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '12:00:00'
    },
    lunch_end: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '13:00:00'
    },
    // Daily capacity
    daily_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      validate: {
        min: 1,
        max: 100
      }
    },
    // Working days (store as JSON array)
    working_days: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['mon', 'tue', 'wed', 'thu', 'fri'],
      validate: {
        isValidWorkingDays(value) {
          if (!Array.isArray(value)) throw new Error('Working days must be an array');
          const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
          for (const day of value) {
            if (!validDays.includes(day)) {
              throw new Error(`Invalid day: ${day}`);
            }
          }
        }
      }
    },
    // Holidays (store as JSON array of dates)
    holidays: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    // Booking rules
    advance_booking_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 1,
        max: 365
      }
    },
    booking_lead_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      validate: {
        min: 0,
        max: 1440
      }
    },
    max_appointments_per_patient_per_day: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10
      }
    },
    // Features
    allow_online_booking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    allow_online_cancellation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    cancellation_deadline_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 24,
      validate: {
        min: 0,
        max: 168 // 7 days
      }
    },
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'appointment_settings',
    timestamps: true,
    underscored: true,
    indexes: [
      // Only enforce unique constraint for non-null office values
      // For MySQL/PostgreSQL, this is the correct syntax
      {
        name: 'unique_office_settings',
        fields: ['office'],
        unique: true,
        where: {
          office: {
            [Op.ne]: null
          }
        }
      },
      { fields: ['is_active'] }
    ]
  });

  // Instance method to get working days as array
  AppointmentSetting.prototype.getWorkingDays = function() {
    return this.working_days || ['mon', 'tue', 'wed', 'thu', 'fri'];
  };

  // Instance method to get holidays as array
  AppointmentSetting.prototype.getHolidays = function() {
    return this.holidays || [];
  };

  // Static method to get settings for an office (or global)
  AppointmentSetting.getSettingsForOffice = async function(office = null) {
    let settings;
    
    if (office) {
      // Try to get office-specific settings first
      settings = await this.findOne({
        where: { office, is_active: true }
      });
    }
    
    // Fall back to global settings
    if (!settings) {
      settings = await this.findOne({
        where: { office: null, is_active: true }
      });
    }
    
    // If no settings exist, create default
    if (!settings) {
      settings = await this.create({
        office: null,
        is_active: true
      });
    }
    
    return settings;
  };

  // Static method to get settings as a plain object
  AppointmentSetting.getSettingsObject = async function(office = null) {
    const settings = await this.getSettingsForOffice(office);
    return settings.toJSON();
  };

  return AppointmentSetting;
};