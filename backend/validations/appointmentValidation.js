// backend/validations/appointmentValidation.js
const Joi = require('joi');

const validatePatientSelfAppointment = (data) => {
  const schema = Joi.object({
    appointment_type_id: Joi.number().integer().positive().required(),
    scheduled_at: Joi.date().iso().greater('now').required(),
    notes: Joi.string().max(500).optional().allow('', null)
  });
  
  return schema.validate(data);
};

const validateAppointmentCreate = (data) => {
  const schema = Joi.object({
    patient_id: Joi.number().integer().positive().optional(), // Changed from required to optional
    appointment_type_id: Joi.number().integer().positive().required(),
    scheduled_at: Joi.date().iso().greater('now').required(),
    notes: Joi.string().max(500).optional().allow('', null)
  });
  
  return schema.validate(data);
};

const validateAppointmentUpdate = (data) => {
  const schema = Joi.object({
    appointment_type_id: Joi.number().integer().positive().optional(),
    scheduled_at: Joi.date().iso().optional(),
    notes: Joi.string().max(500).optional().allow('', null),
    status: Joi.string().valid('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional()
  }).min(1);
  
  return schema.validate(data);
};

const validateAppointmentTypeCreate = (data) => {
  const schema = Joi.object({
    type_name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional().allow('', null),
    duration_minutes: Joi.number().integer().min(5).max(240).default(30)
  });
  
  return schema.validate(data);
};

const validateAppointmentTypeUpdate = (data) => {
  const schema = Joi.object({
    type_name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(500).optional().allow('', null),
    duration_minutes: Joi.number().integer().min(5).max(240).optional(),
    is_active: Joi.boolean().optional()
  }).min(1);
  
  return schema.validate(data);
};

module.exports = {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateAppointmentTypeCreate,
  validateAppointmentTypeUpdate,
  validatePatientSelfAppointment
};