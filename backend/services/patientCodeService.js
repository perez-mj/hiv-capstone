// backend/services/patientCodeService.js
const { Op } = require('sequelize');

class PatientCodeService {
  /**
   * Get the Patient model (lazy-loaded to avoid circular dependencies)
   */
  getPatientModel() {
    const db = require('../models');
    return db.Patient;
  }

  /**
   * Generate a unique facility code for a patient
   * Format: {statusPrefix}{year}-{initials}{counter?}
   * 
   * @param {Object} patientData - Patient data with first_name, middle_name, last_name, status, enrollment_date, treatment_transition_date
   * @returns {Promise<string>} - Generated facility code
   */
  async generateFacilityCode(patientData) {
    // Determine which date to use for the year
    let year;
    
    if (patientData.status?.toLowerCase() === 'treatment' && patientData.treatment_transition_date) {
      // For treatment patients, use treatment transition date
      year = new Date(patientData.treatment_transition_date).getFullYear();
    } else if (patientData.enrollment_date) {
      // For testing patients or if no transition date, use enrollment date
      year = new Date(patientData.enrollment_date).getFullYear();
    } else {
      // Fallback to current year
      year = new Date().getFullYear();
    }
    
    const yearSuffix = year.toString().slice(-2);
    
    // Determine status prefix
    const statusPrefix = this.getStatusPrefix(patientData.status);
    
    // Get initials
    const initials = this.getPatientInitials(
      patientData.first_name,
      patientData.middle_name,
      patientData.last_name
    );
    
    // Build base code
    const baseCode = `${statusPrefix}${yearSuffix}-${initials}`;
    
    // Check for uniqueness and add number if needed
    return await this.makeUniqueCode(baseCode);
  }

  /**
   * Get status prefix based on patient status
   * @param {string} status - Patient status (treatment, testing, etc.)
   * @returns {string} - Status prefix
   */
  getStatusPrefix(status) {
    if (status?.toLowerCase() === 'treatment') {
      return 'PR'; // Treatment patient
    }
    return 'P'; // Testing patient (default)
  }

  /**
   * Get patient initials from name parts
   * @param {string} firstName - First name
   * @param {string} middleName - Middle name (optional)
   * @param {string} lastName - Last name
   * @returns {string} - Initials (max 3 letters)
   */
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

  /**
   * Check if code exists and add counter if needed
   * @param {string} baseCode - Base code to check
   * @returns {Promise<string>} - Unique code
   */
  async makeUniqueCode(baseCode) {
  const Patient = this.getPatientModel();
  
  if (!Patient) {
    console.warn('Patient model not available, using base code without uniqueness check');
    return baseCode;
  }
  
  try {
    // Check if base code exists
    const existing = await Patient.findOne({
      where: { patient_facility_code: baseCode }
    });
    
    if (!existing) return baseCode;
    
    // Find all existing codes with this base
    const existingCodes = await Patient.findAll({
      where: {
        patient_facility_code: {
          [Op.like]: `${baseCode}%`
        }
      },
      attributes: ['patient_facility_code']
    });
    
    const existingSet = new Set(existingCodes.map(p => p.patient_facility_code));
    
    // Find the next available number
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

  /**
   * Validate a facility code format
   * @param {string} code - Facility code to validate
   * @returns {boolean} - Whether the code is valid
   */
  validateFacilityCode(code) {
    const pattern = /^P{1,2}\d{2}-[A-Z]{2,3}\d*$/;
    return pattern.test(code);
  }

  /**
   * Parse facility code into components
   * @param {string} code - Facility code to parse
   * @returns {Object} - Parsed components
   */
  parseFacilityCode(code) {
    if (!this.validateFacilityCode(code)) {
      throw new Error('Invalid facility code format');
    }
    
    const parts = code.split('-');
    const prefix = parts[0];
    const initials = parts[1];
    
    let statusPrefix, year, nameInitials, counter, patientType;
    const numericMatch = initials.match(/\d+$/);
    counter = numericMatch ? parseInt(numericMatch[0]) : null;
    nameInitials = numericMatch ? initials.slice(0, -numericMatch[0].length) : initials;
    
    if (prefix.startsWith('PR')) {
      statusPrefix = 'PR';
      year = prefix.slice(2);
      patientType = 'treatment';
    } else if (prefix.startsWith('P')) {
      statusPrefix = 'P';
      year = prefix.slice(1);
      patientType = 'testing';
    } else {
      throw new Error('Invalid status prefix');
    }
    
    return {
      statusPrefix,
      year,
      nameInitials,
      counter,
      fullCode: code,
      patientType
    };
  }

  /**
   * Bulk generate codes for multiple patients
   * @param {Array} patients - Array of patient data objects
   * @returns {Promise<Array>} - Array of patient data with generated codes
   */
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

  /**
   * Regenerate code for an existing patient
   * @param {Object} patient - Patient model instance
   * @returns {Promise<string>} - New generated code
   */
  async regenerateCode(patient) {
    const Patient = this.getPatientModel();
    const newCode = await this.generateFacilityCode({
      first_name: patient.first_name,
      middle_name: patient.middle_name || '',
      last_name: patient.last_name,
      status: patient.status,
      enrollment_date: patient.enrollment_date,
      treatment_transition_date: patient.treatment_transition_date
    });
    
    // If the new code is the same as the current code, add a counter starting from 2
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

  /**
   * Find the next available code with counter starting from 2
   * @param {string} baseCode - Base code to check
   * @param {number} startCounter - Starting counter number (default: 2)
   * @returns {Promise<string>} - Next available code
   */
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