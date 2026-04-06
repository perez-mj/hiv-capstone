// backend/validations/authValidation.js
const Joi = require('joi');

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(5).required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateChangePassword = (req, res, next) => {
  const schema = Joi.object({
    current_password: Joi.string().min(6).required(),
    new_password: Joi.string().min(6).required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateForgotPassword = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateResetPassword = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    new_password: Joi.string().min(6).required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

module.exports = {
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword
};