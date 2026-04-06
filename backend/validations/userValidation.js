// backend/validations/userValidation.js
const Joi = require('joi');

const validateUserCreate = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().optional().allow('', null),
    role: Joi.string().valid('ADMIN', 'NURSE', 'PATIENT').default('PATIENT')
  });
  
  return schema.validate(data);
};

const validateUserUpdate = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().optional().allow('', null),
    role: Joi.string().valid('ADMIN', 'NURSE', 'PATIENT').optional(),
    is_active: Joi.boolean().optional()
  }).min(1);
  
  return schema.validate(data);
};

module.exports = {
  validateUserCreate,
  validateUserUpdate
};