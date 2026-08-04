// backend/models/Patient.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    contact_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'testing'
    },
    emergency_contact: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    emergency_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    guardian_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    guardian_contact: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true
  });

  // ADD THIS ASSOCIATION METHOD
  Patient.associate = function(models) {
    // Patient belongs to User (for patient portal)
    Patient.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User'
    });
    
    // Patient has many Appointments
    Patient.hasMany(models.Appointment, {
      foreignKey: 'patient_id',
      as: 'Appointments'
    });
    
    // Patient has many TestingEncounters
    Patient.hasMany(models.TestingEncounter, {
      foreignKey: 'patient_id',
      as: 'TestingEncounters'
    });
    
    // Patient has many TreatmentEncounters
    Patient.hasMany(models.TreatmentEncounter, {
      foreignKey: 'patient_id',
      as: 'TreatmentEncounters'
    });
    
    // Patient has many QueueEntries
    Patient.hasMany(models.QueueEntry, {
      foreignKey: 'patient_id',
      as: 'QueueEntries'
    });
  };

  return Patient;
};