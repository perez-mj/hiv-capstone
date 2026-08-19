// backend/models/Patient.js
const { DataTypes } = require('sequelize');
const patientCodeService = require('../services/patientCodeService');

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
    middle_name: {
      type: DataTypes.STRING(100),
      allowNull: true
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
    patient_facility_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
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
    },
    // NEW FIELDS
    enrollment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date when patient was first enrolled in the system'
    },
    treatment_transition_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when patient moved from testing to treatment status'
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true
  });

  // Hook to set enrollment date before creation
  Patient.beforeCreate(async (patient, options) => {
    // Set enrollment date to current date if not provided
    if (!patient.enrollment_date) {
      patient.enrollment_date = new Date().toISOString().split('T')[0];
    }
    
    // Generate facility code
    try {
      if (!patient.first_name || !patient.last_name) {
        throw new Error('First name and last name are required to generate facility code');
      }
      
      if (!patient.patient_facility_code) {
        patient.patient_facility_code = await patientCodeService.generateFacilityCode({
          first_name: patient.first_name,
          middle_name: patient.middle_name || '',
          last_name: patient.last_name,
          status: patient.status || 'testing',
          enrollment_date: patient.enrollment_date,
          treatment_transition_date: patient.treatment_transition_date
        });
      }
    } catch (error) {
      console.error('Error generating patient facility code:', error);
      const timestamp = Date.now().toString().slice(-6);
      patient.patient_facility_code = `ERR-${timestamp}`;
    }
  });

  // Hook to handle status change to treatment
  Patient.beforeUpdate(async (patient, options) => {
    // If status is changing to 'treatment' and transition date is not set
    if (patient.changed('status') && 
        patient.status === 'treatment' && 
        !patient.treatment_transition_date) {
      patient.treatment_transition_date = new Date().toISOString().split('T')[0];
      
      // Regenerate facility code with new status and transition date
      try {
        const newCode = await patientCodeService.generateFacilityCode({
          first_name: patient.first_name,
          middle_name: patient.middle_name || '',
          last_name: patient.last_name,
          status: patient.status,
          enrollment_date: patient.enrollment_date,
          treatment_transition_date: patient.treatment_transition_date
        });
        
        // Only update if code is different
        if (newCode !== patient.patient_facility_code) {
          patient.patient_facility_code = newCode;
        }
      } catch (error) {
        console.error('Error regenerating facility code on status change:', error);
      }
    }
  });

  // Instance method to regenerate code
  Patient.prototype.regenerateFacilityCode = async function() {
    const newCode = await patientCodeService.regenerateCode(this);
    this.patient_facility_code = newCode;
    return newCode;
  };

  // Static method to generate code (for use without instance)
  Patient.generateFacilityCode = async function(patientData) {
    return await patientCodeService.generateFacilityCode(patientData);
  };

  // Static method to validate code
  Patient.validateFacilityCode = function(code) {
    return patientCodeService.validateFacilityCode(code);
  };

  // Static method to parse code
  Patient.parseFacilityCode = function(code) {
    return patientCodeService.parseFacilityCode(code);
  };

  // Static method for bulk generation
  Patient.bulkGenerateCodes = async function(patients) {
    return await patientCodeService.bulkGenerateCodes(patients);
  };

  Patient.associate = function(models) {
    Patient.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User'
    });
    
    Patient.hasMany(models.Appointment, {
      foreignKey: 'patient_id',
      as: 'Appointments'
    });
    
    Patient.hasMany(models.TestingEncounter, {
      foreignKey: 'patient_id',
      as: 'TestingEncounters'
    });
    
    Patient.hasMany(models.TreatmentEncounter, {
      foreignKey: 'patient_id',
      as: 'TreatmentEncounters'
    });
    
    Patient.hasMany(models.QueueEntry, {
      foreignKey: 'patient_id',
      as: 'QueueEntries'
    });
  };

  return Patient;
};