// backend/utils/validators.js
const Joi = require('joi');

/**
 * Helper function to get date 1 month from now
 */
const getOneMonthFromNow = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

/**
 * Validation schemas for different data types
 */
const validationSchemas = {
  // User validation schemas (keep existing)
  userLogin: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(5).required()
  }),

  userCreate: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).max(100).required(),
    email: Joi.string().email().max(255).optional().allow(null, ''),
    role: Joi.string().valid('ADMIN', 'NURSE', 'PATIENT').default('PATIENT'),
    is_active: Joi.boolean().default(true),
    patient_id: Joi.number().integer().positive().optional().allow(null)
      .messages({
        'number.base': 'Patient ID must be a number',
        'number.integer': 'Patient ID must be an integer',
        'number.positive': 'Patient ID must be positive'
      })
  }),

  userUpdate: Joi.object({
    email: Joi.string().email().max(255).optional().allow(null, ''),
    role: Joi.string().valid('ADMIN', 'NURSE', 'PATIENT').optional(),
    is_active: Joi.boolean().optional()
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(6).max(100).required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
  }),

  // Patient validation schemas (keep existing)
  patientCreate: Joi.object({
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    middle_name: Joi.string().max(100).optional().allow(null, ''),
    date_of_birth: Joi.date().max('now').required(),
    sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
    address: Joi.string().optional().allow(null, ''),
    contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional().allow(null, ''),
    consent: Joi.boolean().default(false),
    hiv_status: Joi.string().valid('REACTIVE', 'NON_REACTIVE', 'INDETERMINATE').required(),
    diagnosis_date: Joi.date().max('now').optional().allow(null),
    art_start_date: Joi.date().min(Joi.ref('diagnosis_date')).max('now').optional().allow(null),
    latest_cd4_count: Joi.number().integer().min(0).optional().allow(null),
    latest_viral_load: Joi.number().integer().min(0).optional().allow(null),
    create_user_account: Joi.boolean().default(false),
    email: Joi.when('create_user_account', {
      is: true,
      then: Joi.string().email().max(255).required(),
      otherwise: Joi.optional().allow(null, '')
    }),
    username: Joi.when('create_user_account', {
      is: true,
      then: Joi.string().min(3).max(100).required(),
      otherwise: Joi.optional().allow(null, '')
    }),
    password_hash: Joi.when('create_user_account', {
      is: true,
      then: Joi.string().min(6).required(),
      otherwise: Joi.optional().allow(null, '')
    })
  }),

  patientUpdate: Joi.object({
    first_name: Joi.string().max(100).optional(),
    last_name: Joi.string().max(100).optional(),
    middle_name: Joi.string().max(100).optional().allow(null, ''),
    date_of_birth: Joi.date().max('now').optional(),
    sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
    address: Joi.string().optional().allow(null, ''),
    contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional().allow(null, ''),
    consent: Joi.boolean().optional(),
    hiv_status: Joi.string().valid('REACTIVE', 'NON_REACTIVE', 'INDETERMINATE').optional(),
    diagnosis_date: Joi.date().max('now').optional().allow(null),
    art_start_date: Joi.date().min(Joi.ref('diagnosis_date')).max('now').optional().allow(null),
    latest_cd4_count: Joi.number().integer().min(0).optional().allow(null),
    latest_viral_load: Joi.number().integer().min(0).optional().allow(null)
  }),

  // ==================== UPDATED APPOINTMENT VALIDATION SCHEMAS ====================
  // Appointment validation schemas with 1-month limit
  appointmentCreate: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    appointment_type_id: Joi.number().integer().positive().required(),
    scheduled_at: Joi.date()
      .min('now')
      .max(getOneMonthFromNow())
      .required()
      .messages({
        'date.min': 'Scheduled date cannot be in the past',
        'date.max': 'Scheduled date cannot exceed 1 month from today'
      }),
    notes: Joi.string().max(1000).optional().allow(null, '')
  }),

  appointmentUpdate: Joi.object({
    appointment_type_id: Joi.number().integer().positive().optional(),
    scheduled_at: Joi.date()
      .min('now')
      .max(getOneMonthFromNow())
      .optional()
      .messages({
        'date.min': 'Scheduled date cannot be in the past',
        'date.max': 'Scheduled date cannot exceed 1 month from today'
      }),
    notes: Joi.string().max(1000).optional().allow(null, ''),
    status: Joi.string().valid(
      'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    ).optional()
  }),

  // ==================== NEW WALK-IN VALIDATION SCHEMA ====================
  walkInAdd: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    appointment_type_id: Joi.number().integer().positive().required(),
    notes: Joi.string().max(1000).optional().allow(null, '')
  }),

  // Appointment types (keep existing)
  appointmentTypeCreate: Joi.object({
    type_name: Joi.string().max(100).required(),
    description: Joi.string().optional().allow(null, ''),
    duration_minutes: Joi.number().integer().min(5).max(480).required()
  }),

  appointmentTypeUpdate: Joi.object({
    type_name: Joi.string().max(100).optional(),
    description: Joi.string().optional().allow(null, ''),
    duration_minutes: Joi.number().integer().min(5).max(480).optional(),
    is_active: Joi.boolean().optional()
  }),

  // ==================== UPDATED QUEUE VALIDATION SCHEMAS ====================
  queueAdd: Joi.object({
    appointment_id: Joi.number().integer().positive().required(),
    priority: Joi.number().integer().min(0).max(10).default(0)
  }),

  // New schema for confirming appointment and adding to queue
  confirmAppointment: Joi.object({
    appointment_id: Joi.number().integer().positive().required()
  }),

  skipPatient: Joi.object({
    reason: Joi.string().max(500).optional().allow(null, '')
  }),

  // Lab results validation schemas (keep existing)
  labResultCreate: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    appointment_id: Joi.number().integer().positive().optional().allow(null),
    test_type: Joi.string().valid(
      'CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 
      'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER'
    ).required(),
    test_date: Joi.date().max('now').required(),
    result_value: Joi.string().max(100).optional().allow(null, ''),
    result_unit: Joi.string().max(50).optional().allow(null, ''),
    reference_range: Joi.string().max(100).optional().allow(null, ''),
    interpretation: Joi.string().optional().allow(null, '')
  }),

  labResultUpdate: Joi.object({
    test_type: Joi.string().valid(
      'CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 
      'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER'
    ).optional(),
    test_date: Joi.date().max('now').optional(),
    result_value: Joi.string().max(100).optional().allow(null, ''),
    result_unit: Joi.string().max(50).optional().allow(null, ''),
    reference_range: Joi.string().max(100).optional().allow(null, ''),
    interpretation: Joi.string().optional().allow(null, '')
  }),

  // Clinical encounter validation schemas (keep existing)
  encounterCreate: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    staff_id: Joi.number().integer().positive().required(),
    encounter_date: Joi.date().max('now').required(),
    type: Joi.string().valid('CONSULTATION', 'TESTING', 'REFILL', 'OTHERS').required(),
    notes: Joi.string().max(5000).optional().allow(null, '')
  }),

  encounterUpdate: Joi.object({
    encounter_date: Joi.date().max('now').optional(),
    type: Joi.string().valid('CONSULTATION', 'TESTING', 'REFILL', 'OTHERS').optional(),
    notes: Joi.string().max(5000).optional().allow(null, '')
  }),

  // Staff validation schemas (keep existing)
  staffCreate: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    middle_name: Joi.string().max(100).optional().allow(null, ''),
    position: Joi.string().max(100).optional().allow(null, ''),
    contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional().allow(null, '')
  }),

  staffUpdate: Joi.object({
    first_name: Joi.string().max(100).optional(),
    last_name: Joi.string().max(100).optional(),
    middle_name: Joi.string().max(100).optional().allow(null, ''),
    position: Joi.string().max(100).optional().allow(null, ''),
    contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional().allow(null, '')
  }),

  // Search and filter validation (keep existing)
  searchQuery: Joi.object({
    q: Joi.string().max(255).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort_by: Joi.string().optional(),
    sort_order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    start_date: Joi.date().optional(),
    end_date: Joi.date().min(Joi.ref('start_date')).optional(),
    status: Joi.string().optional(),
    type: Joi.string().optional()
  })
};

/**
 * Custom validation functions
 */
const customValidators = {
  /**
   * Validate if a patient exists
   */
  patientExists: async (pool, patientId) => {
    const [rows] = await pool.execute(
      'SELECT id FROM patients WHERE id = ?',
      [patientId]
    );
    return rows.length > 0;
  },

  /**
   * Validate if an appointment exists
   */
  appointmentExists: async (pool, appointmentId) => {
    const [rows] = await pool.execute(
      'SELECT id FROM appointments WHERE id = ?',
      [appointmentId]
    );
    return rows.length > 0;
  },

  /**
   * Validate if a user exists
   */
  userExists: async (pool, userId) => {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    return rows.length > 0;
  },

  /**
   * Validate if a staff member exists
   */
  staffExists: async (pool, staffId) => {
    const [rows] = await pool.execute(
      'SELECT id FROM staff WHERE id = ?',
      [staffId]
    );
    return rows.length > 0;
  },

  /**
   * Validate appointment time (no conflicts)
   */
  validateAppointmentTime: async (pool, patientId, scheduledAt, appointmentTypeId, excludeAppointmentId = null) => {
    // Get appointment duration
    const [typeRows] = await pool.execute(
      'SELECT duration_minutes FROM appointment_types WHERE id = ?',
      [appointmentTypeId]
    );

    if (typeRows.length === 0) return false;

    const duration = typeRows[0].duration_minutes;
    const scheduledTime = new Date(scheduledAt);
    const bufferMinutes = 15;
    
    const startBuffer = new Date(scheduledTime.getTime() - bufferMinutes * 60000);
    const endBuffer = new Date(scheduledTime.getTime() + duration * 60000 + bufferMinutes * 60000);

    let query = `
      SELECT a.* FROM appointments a
      WHERE a.patient_id = ? 
        AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
        AND a.scheduled_at BETWEEN ? AND ?
    `;
    
    const params = [patientId, startBuffer, endBuffer];

    if (excludeAppointmentId) {
      query += ` AND a.id != ?`;
      params.push(excludeAppointmentId);
    }

    const [conflicts] = await pool.execute(query, params);
    return conflicts.length === 0; // true if no conflicts
  },

  /**
   * Validate date range
   */
  isValidDateRange: (startDate, endDate, maxDays = 365) => {
    if (!startDate || !endDate) return true;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    
    return diffDays >= 0 && diffDays <= maxDays;
  },

  /**
   * Check if appointment is within 1 month from now
   */
  isWithinOneMonth: (date) => {
    const checkDate = new Date(date);
    const maxDate = getOneMonthFromNow();
    return checkDate <= maxDate;
  },

  /**
   * Check if patient is already in queue today
   */
  isPatientInQueueToday: async (pool, patientId) => {
    const [rows] = await pool.execute(
      `SELECT q.id 
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE a.patient_id = ? 
         AND DATE(q.created_at) = CURDATE()
         AND q.status IN ('WAITING', 'CALLED', 'SERVING')`,
      [patientId]
    );
    return rows.length > 0;
  }
};

module.exports = {
  validationSchemas,
  customValidators
};