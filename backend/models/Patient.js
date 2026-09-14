// backend/models/Patient.js
const { DataTypes } = require('sequelize');
const patientCodeService = require('../services/patientCodeService');
const { encrypt, decrypt, hmac } = require('../utils/crypto');

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
      references: { model: 'users', key: 'id' }
    },

    // ---------- ENCRYPTED PII ----------
    first_name: {
      type: DataTypes.TEXT,        // ciphertext is longer than plaintext
      allowNull: false,
      set(value) {
        this.setDataValue('first_name', encrypt(value));
        this.setDataValue('first_name_hash', hmac(value)); // for exact search
      },
      get() { return decrypt(this.getDataValue('first_name')); }
    },
    first_name_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },

    middle_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) {
        this.setDataValue('middle_name', encrypt(value));
        this.setDataValue('middle_name_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('middle_name')); }
    },
    middle_name_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },

    last_name: {
      type: DataTypes.TEXT,
      allowNull: false,
      set(value) {
        this.setDataValue('last_name', encrypt(value));
        this.setDataValue('last_name_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('last_name')); }
    },
    last_name_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },

    birth_date: {
      type: DataTypes.TEXT,        // encrypted string
      allowNull: false,
      set(value) {
        this.setDataValue('birth_date', encrypt(value));
        this.setDataValue('birth_date_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('birth_date')); }
    },
    birth_date_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },

    gender: {
      type: DataTypes.TEXT,
      allowNull: false,
      set(value) {
        this.setDataValue('gender', encrypt(value));
        this.setDataValue('gender_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('gender')); }
    },
    gender_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },

    // contact_number was UNIQUE — now unique on hash instead
    contact_number: {
      type: DataTypes.TEXT,
      allowNull: false,
      set(value) {
        this.setDataValue('contact_number', encrypt(value));
        this.setDataValue('contact_number_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('contact_number')); }
    },
    contact_number_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      index: true
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) { this.setDataValue('address', encrypt(value)); },
      get() { return decrypt(this.getDataValue('address')); }
    },

    // ---------- HIV STATUS (sensitive) ----------
    status: {
      type: DataTypes.TEXT,
      defaultValue: encrypt('testing'),
      set(value) {
        this.setDataValue('status', encrypt(value));
        this.setDataValue('status_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('status')); }
    },
    status_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },

    // ---------- FACILITY CODE — PLAINTEXT (Option 1) ----------
    // Contains PR/P + year + initials + counter. Searchable, sortable, groupable.
    // Protected by RBAC + audit + TDE at rest.
    patient_facility_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      index: true
    },

    // ---------- EMERGENCY / GUARDIAN (encrypted) ----------
    emergency_contact: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) { this.setDataValue('emergency_contact', encrypt(value)); },
      get() { return decrypt(this.getDataValue('emergency_contact')); }
    },
    emergency_phone: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) {
        this.setDataValue('emergency_phone', encrypt(value));
        this.setDataValue('emergency_phone_hash', hmac(value));
      },
      get() { return decrypt(this.getDataValue('emergency_phone')); }
    },
    emergency_phone_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      index: true
    },
    guardian_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) { this.setDataValue('guardian_name', encrypt(value)); },
      get() { return decrypt(this.getDataValue('guardian_name')); }
    },
    guardian_contact: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) { this.setDataValue('guardian_contact', encrypt(value)); },
      get() { return decrypt(this.getDataValue('guardian_contact')); }
    },

    // ---------- DATES ----------
    enrollment_date: {
      type: DataTypes.DATEONLY,     // keep plaintext — used for reporting
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    treatment_transition_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true
  });

  // ---------- HOOKS ----------
  Patient.beforeCreate(async (patient) => {
    if (!patient.enrollment_date) {
      patient.enrollment_date = new Date().toISOString().split('T')[0];
    }
    try {
      if (!patient.first_name || !patient.last_name) {
        throw new Error('First name and last name are required');
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

  Patient.beforeUpdate(async (patient) => {
    if (patient.changed('status') &&
        patient.status === 'treatment' &&
        !patient.treatment_transition_date) {
      patient.treatment_transition_date = new Date().toISOString().split('T')[0];
      try {
        const newCode = await patientCodeService.generateFacilityCode({
          first_name: patient.first_name,
          middle_name: patient.middle_name || '',
          last_name: patient.last_name,
          status: patient.status,
          enrollment_date: patient.enrollment_date,
          treatment_transition_date: patient.treatment_transition_date
        });
        if (newCode !== patient.patient_facility_code) {
          patient.patient_facility_code = newCode;
        }
      } catch (error) {
        console.error('Error regenerating facility code:', error);
      }
    }
  });

  // ---------- INSTANCE METHODS ----------
  Patient.prototype.regenerateFacilityCode = async function() {
    const newCode = await patientCodeService.regenerateCode(this);
    this.patient_facility_code = newCode;
    return newCode;
  };

  // ---------- STATIC METHODS ----------
  Patient.generateFacilityCode = async function(data) {
    return await patientCodeService.generateFacilityCode(data);
  };
  Patient.validateFacilityCode = function(code) {
    return patientCodeService.validateFacilityCode(code);
  };
  Patient.parseFacilityCode = function(code) {
    return patientCodeService.parseFacilityCode(code);
  };
  Patient.bulkGenerateCodes = async function(patients) {
    return await patientCodeService.bulkGenerateCodes(patients);
  };

  // ---------- SERIALIZATION ----------
  // Hide ciphertext + hash columns from API responses by default.
  Patient.prototype.toJSON = function() {
    const values = { ...this.get() };
    const hidden = [
      'first_name_hash', 'middle_name_hash', 'last_name_hash',
      'birth_date_hash', 'gender_hash', 'contact_number_hash',
      'status_hash', 'emergency_phone_hash'
    ];
    hidden.forEach(k => delete values[k]);
    return values;
  };

  // ---------- ASSOCIATIONS ----------
  Patient.associate = function(models) {
    Patient.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    Patient.hasMany(models.Appointment, { foreignKey: 'patient_id', as: 'Appointments' });
    Patient.hasMany(models.TestingEncounter, { foreignKey: 'patient_id', as: 'TestingEncounters' });
    Patient.hasMany(models.TreatmentEncounter, { foreignKey: 'patient_id', as: 'TreatmentEncounters' });
    Patient.hasMany(models.QueueEntry, { foreignKey: 'patient_id', as: 'QueueEntries' });
  };

  return Patient;
};