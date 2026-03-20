const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Booking Validation Middleware
 * Uses express-validator for comprehensive input validation
 */

/**
 * Middleware to handle validation errors
 * Extracts validation errors and throws AppError
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new AppError(errorMessages, 400);
  }

  next();
};

/**
 * Validation rules for creating a booking
 * POST /api/bookings
 * Note: Amount is calculated server-side for security
 */
exports.validateCreateBooking = [
  // Validate showId
  body('showId')
    .notEmpty()
    .withMessage('Show ID is required')
    .isInt({ min: 1 })
    .withMessage('Show ID must be a positive integer'),

  // Validate seatIds array
  body('seatIds')
    .notEmpty()
    .withMessage('Seat IDs are required')
    .isArray({ min: 1, max: 10 })
    .withMessage('Seat IDs must be an array with 1-10 items'),

  // Validate each seat ID in the array
  body('seatIds.*')
    .isInt({ min: 1 })
    .withMessage('Each seat ID must be a positive integer'),

  // Validate paymentMethod
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isString()
    .withMessage('Payment method must be a string')
    .isIn(['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CASH', 'NET_BANKING'])
    .withMessage('Invalid payment method. Allowed: CREDIT_CARD, DEBIT_CARD, UPI, CASH, NET_BANKING'),

  // Handle validation errors
  handleValidationErrors
];

/**
 * Validation rules for cancelling a booking
 * DELETE /api/bookings/:id
 */
exports.validateCancelBooking = [
  // Validate booking ID from URL param
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isInt({ min: 1 })
    .withMessage('Booking ID must be a positive integer'),

  // Handle validation errors
  handleValidationErrors
];

/**
 * Validation rules for getting a single booking
 * GET /api/bookings/:id
 */
exports.validateGetBooking = [
  // Validate booking ID from URL param
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isInt({ min: 1 })
    .withMessage('Booking ID must be a positive integer'),

  // Handle validation errors
  handleValidationErrors
];

/**
 * Validation rules for getting booking history
 * GET /api/bookings
 */
exports.validateGetBookings = [
  // Optional: Validate userId param (for admin endpoints)
  param('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),

  // Optional: Validate status query param
  query('status')
    .optional()
    .isIn(['CONFIRMED', 'CANCELLED'])
    .withMessage('Status must be either CONFIRMED or CANCELLED'),

  // Optional: Validate startDate query param
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format (YYYY-MM-DD)'),

  // Optional: Validate endDate query param
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      // Ensure endDate is after startDate if both are provided
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  // Optional: Validate page query param
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  // Optional: Validate limit query param
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  // Handle validation errors
  handleValidationErrors
];
