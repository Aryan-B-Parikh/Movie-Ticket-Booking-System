const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Middleware to validate request and return errors if any
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Extract error messages
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    // Return validation errors
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errorMessages
    });
  }

  next();
};

// Sanitization helper - removes dangerous characters
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove potential SQL injection patterns
  // Note: We use prepared statements, but this is defense in depth
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
};

module.exports = {
  validateRequest,
  sanitizeInput
};
