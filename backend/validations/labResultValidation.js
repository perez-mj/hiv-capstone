// backend/validations/encounterValidation.js
const Joi = require('joi');

const validateLabResultCreate = (data) => {
  const schema = Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    appointment_id: Joi.number().integer().positive().optional().allow('', null),
    test_type: Joi.string().valid('CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER').required(),
    test_date: Joi.date().iso().max('now').required(),
    result_value: Joi.string().max(100).optional().allow('', null),
    result_unit: Joi.string().max(50).optional().allow('', null),
    reference_range: Joi.string().max(100).optional().allow('', null),
    interpretation: Joi.string().max(500).optional().allow('', null)
  });

  return schema.validate(data);
};

const validateLabResultUpdate = (data) => {
  const schema = Joi.object({
    test_type: Joi.string().valid('CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER').optional(),
    test_date: Joi.date().iso().max('now').optional(),
    result_value: Joi.string().max(100).optional().allow('', null),
    result_unit: Joi.string().max(50).optional().allow('', null),
    reference_range: Joi.string().max(100).optional().allow('', null),
    interpretation: Joi.string().max(500).optional().allow('', null)
  }).min(1);

  return schema.validate(data);
};

module.exports = {
  validateLabResultCreate,
  validateLabResultUpdate
};