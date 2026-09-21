// backend/models/Patient.js
const { DataTypes } = require('sequelize');
const patientCodeService = require('../services/patientCodeService');
const { encrypt, decrypt, hmac } = require('../utils/crypto');

module.exports = (sequelize) => {
  const safeEncrypt = (value) =>
    value === undefined || value === null || value === ''
      ? null
      : encrypt(value);

  const safeDecrypt = (value) =>
    value === undefined || value === null || value === ''
      ? null
      : decrypt(value);

  const safeHmac = (value) =>
    value === undefined || value === null || value === ''
      ? null
      : hmac(value);

  const Patient = sequelize.define(
    'Patient',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },

      // ---------- ENCRYPTED PII ----------
      first_name: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue('first_name', safeEncrypt(value));
          this.setDataValue('first_name_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('first_name')); },
      },
      first_name_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      middle_name: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('middle_name', safeEncrypt(value));
          this.setDataValue('middle_name_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('middle_name')); },
      },
      middle_name_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      last_name: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue('last_name', safeEncrypt(value));
          this.setDataValue('last_name_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('last_name')); },
      },
      last_name_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      suffix: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('suffix', safeEncrypt(value));
          this.setDataValue('suffix_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('suffix')); },
      },
      suffix_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      birth_date: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue('birth_date', safeEncrypt(value));
          this.setDataValue('birth_date_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('birth_date')); },
      },
      birth_date_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      gender: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue('gender', safeEncrypt(value));
          this.setDataValue('gender_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('gender')); },
      },
      gender_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      contact_number: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue('contact_number', safeEncrypt(value));
          this.setDataValue('contact_number_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('contact_number')); },
      },
      contact_number_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        index: true,
      },

      // ---------- CONTACT / SOCIAL ----------
      email: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('email', safeEncrypt(value));
          this.setDataValue('email_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('email')); },
      },
      email_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      facebook_messenger: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('facebook_messenger', safeEncrypt(value));
          this.setDataValue('facebook_messenger_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('facebook_messenger')); },
      },
      facebook_messenger_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      // ---------- STRUCTURED ADDRESS ----------
      // Free-text portion below barangay: house # / street / purok / sitio.
      sitio_street: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) { this.setDataValue('sitio_street', safeEncrypt(value)); },
        get() { return safeDecrypt(this.getDataValue('sitio_street')); },
      },
      barangay_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'barangays', key: 'id' },
        field: 'barangay_id',
      },
      city_municipality_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'cities_municipalities', key: 'id' },
        field: 'city_municipality_id',
      },
      province_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'provinces', key: 'id' },
        field: 'province_id',
      },

      // ---------- PURPOSE ----------
      purpose: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('purpose', safeEncrypt(value));
          this.setDataValue('purpose_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('purpose')); },
      },
      purpose_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      status: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('status', safeEncrypt(value));
          this.setDataValue('status_hash', safeHmac(value));
        },
        get() { return safeDecrypt(this.getDataValue('status')); },
      },
      status_hash: { type: DataTypes.STRING(64), allowNull: true, index: true },

      patient_facility_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        index: true,
      },

      enrollment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      treatment_transition_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: 'patients',
      timestamps: true,
      underscored: true,
    }
  );

  // ---------- HOOKS ----------
  Patient.beforeValidate(async (patient) => {
    if (!patient.enrollment_date) {
      patient.enrollment_date = new Date().toISOString().split('T')[0];
    }

    if (patient.isNewRecord && !patient.status) {
      patient.status = 'testing';
    }

    if (patient.isNewRecord && !patient.patient_facility_code) {
      try {
        if (!patient.first_name || !patient.last_name) {
          throw new Error('First name and last name are required');
        }
        patient.patient_facility_code =
          await patientCodeService.generateFacilityCode({
            first_name: patient.first_name,
            middle_name: patient.middle_name || '',
            last_name: patient.last_name,
            suffix: patient.suffix || '',
            status: patient.status || 'testing',
            enrollment_date: patient.enrollment_date,
            treatment_transition_date: patient.treatment_transition_date,
          });
      } catch (error) {
        console.error('Error generating patient facility code:', error);
        const timestamp = Date.now().toString().slice(-6);
        patient.patient_facility_code = `ERR-${timestamp}`;
      }
    }
  });

  Patient.beforeUpdate(async (patient) => {
    if (
      patient.changed('status') &&
      patient.status === 'treatment' &&
      !patient.treatment_transition_date
    ) {
      patient.treatment_transition_date = new Date()
        .toISOString()
        .split('T')[0];

      try {
        const newCode = await patientCodeService.generateFacilityCode({
          first_name: patient.first_name,
          middle_name: patient.middle_name || '',
          last_name: patient.last_name,
          suffix: patient.suffix || '',
          status: patient.status,
          enrollment_date: patient.enrollment_date,
          treatment_transition_date: patient.treatment_transition_date,
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
  Patient.prototype.regenerateFacilityCode = async function () {
    const newCode = await patientCodeService.regenerateCode(this);
    this.patient_facility_code = newCode;
    return newCode;
  };

  // ---------- STATIC METHODS ----------
  Patient.generateFacilityCode = async function (data) {
    return await patientCodeService.generateFacilityCode(data);
  };
  Patient.validateFacilityCode = function (code) {
    return patientCodeService.validateFacilityCode(code);
  };
  Patient.parseFacilityCode = function (code) {
    return patientCodeService.parseFacilityCode(code);
  };
  Patient.bulkGenerateCodes = async function (patients) {
    return await patientCodeService.bulkGenerateCodes(patients);
  };

  // ---------- SERIALIZATION ----------
  Patient.prototype.toJSON = function () {
    const values = { ...this.get() };
    const hidden = [
      'first_name_hash',
      'middle_name_hash',
      'last_name_hash',
      'suffix_hash',
      'birth_date_hash',
      'gender_hash',
      'contact_number_hash',
      'email_hash',
      'facebook_messenger_hash',
      'purpose_hash',
      'status_hash',
    ];
    hidden.forEach((k) => delete values[k]);
    return values;
  };

  // ---------- ASSOCIATIONS ----------
  Patient.associate = function (models) {
    Patient.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });

    // Structured address
    Patient.belongsTo(models.Barangay, {
      foreignKey: 'barangay_id',
      as: 'Barangay',
    });
    Patient.belongsTo(models.CityMunicipality, {
      foreignKey: 'city_municipality_id',
      as: 'CityMunicipality',
    });
    Patient.belongsTo(models.Province, {
      foreignKey: 'province_id',
      as: 'Province',
    });

    Patient.hasMany(models.Appointment, {
      foreignKey: 'patient_id',
      as: 'Appointments',
    });
    Patient.hasMany(models.TestingEncounter, {
      foreignKey: 'patient_id',
      as: 'TestingEncounters',
    });
    Patient.hasMany(models.TreatmentEncounter, {
      foreignKey: 'patient_id',
      as: 'TreatmentEncounters',
    });
    Patient.hasMany(models.QueueEntry, {
      foreignKey: 'patient_id',
      as: 'QueueEntries',
    });
  };

  return Patient;
};