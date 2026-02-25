// backend/utils/validators.js
const Joi = require('joi');

/**
 * Validation schemas for different data types
 */
const validationSchemas = {
  // User validation schemas
  userLogin: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(5).required()
  }),

  userCreate: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).max(100).required(),
    email: Joi.string().email().max(255).optional().allow(null, ''),
    role: Joi.string().valid('ADMIN', 'NURSE', 'PATIENT').default('PATIENT'),
    is_active: Joi.boolean().default(true)
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

  // Patient validation schemas
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

  // Appointment validation schemas
  appointmentCreate: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    appointment_type_id: Joi.number().integer().positive().required(),
    scheduled_at: Joi.date().min('now').required(),
    notes: Joi.string().max(1000).optional().allow(null, '')
  }),

  appointmentUpdate: Joi.object({
    appointment_type_id: Joi.number().integer().positive().optional(),
    scheduled_at: Joi.date().min('now').optional(),
    notes: Joi.string().max(1000).optional().allow(null, ''),
    status: Joi.string().valid(
      'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    ).optional()
  }),

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

  // Queue validation schemas
  queueAdd: Joi.object({
    appointment_id: Joi.number().integer().positive().required(),
    priority: Joi.number().integer().min(0).max(10).default(0)
  }),

  // Lab results validation schemas
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

  // Clinical encounter validation schemas
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

  // Staff validation schemas
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

  // Search and filter validation
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
  }
};

module.exports = {
  validationSchemas,
  customValidators
};