// backend/validations/patientValidation.js
const Joi = require('joi');

const validatePatientCreate = (data) => {
  const schema = Joi.object({
    patient_facility_code: Joi.string().max(50).optional(),
    first_name: Joi.string().min(2).max(100).required(),
    last_name: Joi.string().min(2).max(100).required(),
    middle_name: Joi.string().max(100).optional().allow('', null),
    date_of_birth: Joi.date().iso().max('now').required(),
    sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
    address: Joi.string().max(500).optional().allow('', null),
    contact_number: Joi.string().max(20).optional().allow('', null),
    hiv_status: Joi.string().valid('REACTIVE', 'NON_REACTIVE', 'INDETERMINATE').required(),
    diagnosis_date: Joi.date().iso().max('now').optional().allow('', null),
    art_start_date: Joi.date().iso().optional().allow('', null),
    latest_cd4_count: Joi.number().integer().min(0).optional().allow('', null),
    latest_viral_load: Joi.number().integer().min(0).optional().allow('', null),
    create_user_account: Joi.boolean().default(false),
    email: Joi.string().email().when('create_user_account', { is: true, then: Joi.required() }),
    username: Joi.string().min(3).max(100).when('create_user_account', { is: true, then: Joi.required() }),
    password: Joi.string().min(6).when('create_user_account', { is: true, then: Joi.required() })
  });
  
  return schema.validate(data);
};

const validatePatientUpdate = (data) => {
  const schema = Joi.object({
    patient_facility_code: Joi.string().max(50).optional(),
    first_name: Joi.string().min(2).max(100).optional(),
    last_name: Joi.string().min(2).max(100).optional(),
    middle_name: Joi.string().max(100).optional().allow('', null),
    date_of_birth: Joi.date().iso().max('now').optional(),
    sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
    address: Joi.string().max(500).optional().allow('', null),
    contact_number: Joi.string().max(20).optional().allow('', null),
    hiv_status: Joi.string().valid('REACTIVE', 'NON_REACTIVE', 'INDETERMINATE').optional(),
    diagnosis_date: Joi.date().iso().max('now').optional().allow('', null),
    art_start_date: Joi.date().iso().optional().allow('', null),
    latest_cd4_count: Joi.number().integer().min(0).optional().allow('', null),
    latest_viral_load: Joi.number().integer().min(0).optional().allow('', null)
  }).min(1);
  
  return schema.validate(data);
};

module.exports = {
  validatePatientCreate,
  validatePatientUpdate
};