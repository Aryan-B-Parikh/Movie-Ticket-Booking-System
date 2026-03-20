const { body, param, query } = require('express-validator');

// Validation for creating a show
const validateCreateShow = [
  body('movie_id')
    .notEmpty()
    .withMessage('Movie ID is required')
    .isInt({ min: 1 })
    .withMessage('Movie ID must be a positive integer'),

  body('screen_id')
    .notEmpty()
    .withMessage('Screen ID is required')
    .isInt({ min: 1 })
    .withMessage('Screen ID must be a positive integer'),

  body('show_time')
    .notEmpty()
    .withMessage('Show time is required')
    .isISO8601()
    .withMessage('Show time must be a valid ISO 8601 date-time (e.g., 2026-03-20T14:30:00)')
    .custom((value) => {
      const showDate = new Date(value);
      const now = new Date();
      if (showDate <= now) {
        throw new Error('Show time must be in the future');
      }
      return true;
    }),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number greater than 0')
    .custom((value) => {
      // Ensure price has at most 2 decimal places
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error('Price can have at most 2 decimal places');
      }
      return true;
    })
];

// Validation for updating a show
const validateUpdateShow = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Show ID must be a positive integer'),

  body('movie_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Movie ID must be a positive integer'),

  body('screen_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Screen ID must be a positive integer'),

  body('show_time')
    .optional()
    .isISO8601()
    .withMessage('Show time must be a valid ISO 8601 date-time')
    .custom((value) => {
      if (value) {
        const showDate = new Date(value);
        const now = new Date();
        if (showDate <= now) {
          throw new Error('Show time must be in the future');
        }
      }
      return true;
    }),

  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number greater than 0')
    .custom((value) => {
      if (value) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          throw new Error('Price can have at most 2 decimal places');
        }
      }
      return true;
    })
];

// Validation for show ID parameter
const validateShowId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Show ID must be a positive integer')
];

// Validation for movie ID parameter
const validateMovieId = [
  param('movieId')
    .isInt({ min: 1 })
    .withMessage('Movie ID must be a positive integer')
];

// Validation for theatre ID parameter
const validateTheatreId = [
  param('theatreId')
    .isInt({ min: 1 })
    .withMessage('Theatre ID must be a positive integer')
];

// Validation for query parameters
const validateShowQuery = [
  query('movieId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Movie ID must be a positive integer'),

  query('theatreId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Theatre ID must be a positive integer'),

  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format')
    .isISO8601()
    .withMessage('Date must be a valid date'),

  query('startDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format')
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  query('endDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      // If both startDate and endDate are provided, validate range
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (end < start) {
          throw new Error('End date must be after or equal to start date');
        }
      }
      return true;
    }),

  query('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Days must be an integer between 1 and 90')
];

module.exports = {
  validateCreateShow,
  validateUpdateShow,
  validateShowId,
  validateMovieId,
  validateTheatreId,
  validateShowQuery
};
