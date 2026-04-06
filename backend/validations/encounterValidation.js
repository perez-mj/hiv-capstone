// backend/validations/encounterValidation.js
const Joi = require('joi');

const validateEncounterCreate = (data) => {
  const schema = Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    staff_id: Joi.number().integer().positive().required(),
    encounter_date: Joi.date().iso().max('now').required(),
    type: Joi.string().valid('CONSULTATION', 'TESTING', 'REFILL', 'OTHERS').required(),
    notes: Joi.string().max(2000).optional().allow('', null)
  });

  return schema.validate(data);
};

const validateEncounterUpdate = (data) => {
  const schema = Joi.object({
    encounter_date: Joi.date().iso().max('now').optional(),
    type: Joi.string().valid('CONSULTATION', 'TESTING', 'REFILL', 'OTHERS').optional(),
    notes: Joi.string().max(2000).optional().allow('', null)
  }).min(1);

  return schema.validate(data);
};

module.exports = {
  validateEncounterCreate,
  validateEncounterUpdate
};