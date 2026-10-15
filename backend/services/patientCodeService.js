// backend/services/patientCodeService.js
const { Op } = require('sequelize');

class PatientCodeService {
  getPatientModel() {
    const db = require('../models');
    return db.Patient;
  }
  async generateFacilityCode(patientData) {
    let year;

    if (patientData.purpose?.toLowerCase() === 'treatment' && patientData.treatment_transition_date) {

      year = new Date(patientData.treatment_transition_date).getFullYear();
    } else if (patientData.enrollment_date) {
      year = new Date(patientData.enrollment_date).getFullYear();
    } else {
      year = new Date().getFullYear();
    }

    const yearSuffix = year.toString().slice(-2);

    const purposePrefix = this.getPurposePrefix(patientData.purpose);

    const initials = this.getPatientInitials(
      patientData.first_name,
      patientData.middle_name,
      patientData.last_name
    );

    const baseCode = `${purposePrefix}${yearSuffix}-${initials}`;

    return await this.makeUniqueCode(baseCode);
  }

  
  getPurposePrefix(purpose) {
    if (purpose?.toLowerCase() === 'treatment') {
      return 'PR'; 
    }
    return 'P'; 
  }

  getPatientInitials(firstName, middleName, lastName) {
    const firstInitial = firstName?.charAt(0).toUpperCase() || '';
    const middleInitial = middleName && middleName.trim() !== ''
      ? middleName.charAt(0).toUpperCase()
      : '';
    const lastInitial = lastName?.charAt(0).toUpperCase() || '';

    let initials = `${firstInitial}${lastInitial}`;
    if (middleInitial) {
      initials = `${firstInitial}${middleInitial}${lastInitial}`;
    }

    return initials || 'XX';
  }


  async makeUniqueCode(baseCode) {
    const Patient = this.getPatientModel();

    if (!Patient) {
      console.warn('Patient model not available, using base code without uniqueness check');
      return baseCode;
    }

    try {
      const existing = await Patient.findOne({
        where: { patient_facility_code: baseCode }
      });

      if (!existing) return baseCode;

      const existingCodes = await Patient.findAll({
        where: {
          patient_facility_code: {
            [Op.like]: `${baseCode}%`
          }
        },
        attributes: ['patient_facility_code']
      });

      const existingSet = new Set(existingCodes.map(p => p.patient_facility_code));

      let counter = 2;
      while (existingSet.has(`${baseCode}${counter}`)) {
        counter++;
      }

      return `${baseCode}${counter}`;
    } catch (error) {
      console.error('Error checking uniqueness of facility code:', error);
      const timestamp = Date.now().toString().slice(-4);
      return `${baseCode}${timestamp}`;
    }
  }

  validateFacilityCode(code) {
    const pattern = /^P{1,2}\d{2}-[A-Z]{2,3}\d*$/;
    return pattern.test(code);
  }

  parseFacilityCode(code) {
    if (!this.validateFacilityCode(code)) {
      throw new Error('Invalid facility code format');
    }

    const parts = code.split('-');
    const prefix = parts[0];
    const initials = parts[1];

    let purposePrefix, year, nameInitials, counter, purpose;
    const numericMatch = initials.match(/\d+$/);
    counter = numericMatch ? parseInt(numericMatch[0]) : null;
    nameInitials = numericMatch ? initials.slice(0, -numericMatch[0].length) : initials;

    if (prefix.startsWith('PR')) {
      purposePrefix = 'PR';
      year = prefix.slice(2);
      purpose = 'treatment';
    } else if (prefix.startsWith('P')) {
      purposePrefix = 'P';
      year = prefix.slice(1);
      purpose = 'testing';
    } else {
      throw new Error('Invalid purpose prefix');
    }

    return {
      purposePrefix,
      year,
      nameInitials,
      counter,
      fullCode: code,
      purpose,
      purposePrefix,
      purpose
    };
  }

  async bulkGenerateCodes(patients) {
    const results = [];

    for (const patient of patients) {
      const code = await this.generateFacilityCode(patient);
      results.push({
        ...patient,
        patient_facility_code: code
      });
    }

    return results;
  }


  async regenerateCode(patient) {
    const Patient = this.getPatientModel();
    const newCode = await this.generateFacilityCode({
      first_name: patient.first_name,
      middle_name: patient.middle_name || '',
      last_name: patient.last_name,
      purpose: patient.purpose,
      enrollment_date: patient.enrollment_date,
      treatment_transition_date: patient.treatment_transition_date
    });

    if (newCode === patient.patient_facility_code) {
      const baseCode = newCode;
      let counter = 2;
      let finalCode;

      try {
        while (true) {
          const testCode = `${baseCode}${counter}`;
          const existing = await Patient.findOne({
            where: {
              patient_facility_code: testCode,
              id: { [Op.ne]: patient.id }
            }
          });

          if (!existing) {
            finalCode = testCode;
            break;
          }
          counter++;
        }
      } catch (error) {
        console.error('Error regenerating code:', error);
        const timestamp = Date.now().toString().slice(-4);
        finalCode = `${baseCode}${timestamp}`;
      }

      return finalCode;
    }

    return newCode;
  }


  async getNextAvailableCode(baseCode, startCounter = 2) {
    const Patient = this.getPatientModel();

    if (!Patient) {
      return `${baseCode}${startCounter}`;
    }

    let counter = startCounter;

    try {
      while (true) {
        const testCode = `${baseCode}${counter}`;
        const existing = await Patient.findOne({
          where: { patient_facility_code: testCode }
        });

        if (!existing) {
          return testCode;
        }
        counter++;
      }
    } catch (error) {
      console.error('Error finding next available code:', error);
      const timestamp = Date.now().toString().slice(-4);
      return `${baseCode}${timestamp}`;
    }
  }
}

module.exports = new PatientCodeService();