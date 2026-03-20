const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');
const { protect, restrictTo } = require('../middleware/auth');
const screenController = require('../controllers/screenController');

const router = express.Router();

// Validation rules for theatre ID parameter
const theatreIdValidation = [
  param('theatreId')
    .isInt({ min: 1 })
    .withMessage('Invalid theatre ID')
];

// Validation rules for screen ID parameter
const screenIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid screen ID')
];

// Validation rules for creating a screen
const createScreenValidation = [
  param('theatreId')
    .isInt({ min: 1 })
    .withMessage('Invalid theatre ID'),

  body('screen_number')
    .isInt({ min: 1 })
    .withMessage('Screen number must be a positive integer'),

  body('total_seats')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total seats must be between 1 and 1000'),

  body('screen_type')
    .trim()
    .notEmpty()
    .withMessage('Screen type is required')
    .isIn(['2D', '3D', 'IMAX', '4DX'])
    .withMessage('Invalid screen type. Must be one of: 2D, 3D, IMAX, 4DX')
];

// Validation rules for creating seats in batch
const createSeatsValidation = [
  param('screenId')
    .isInt({ min: 1 })
    .withMessage('Invalid screen ID'),

  body('seats')
    .isArray({ min: 1 })
    .withMessage('Seats must be a non-empty array'),

  body('seats.*.seat_number')
    .trim()
    .notEmpty()
    .withMessage('Seat number is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Seat number must be between 1 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Seat number must contain only uppercase letters and numbers (e.g., A1, B12)'),

  body('seats.*.seat_type')
    .trim()
    .notEmpty()
    .withMessage('Seat type is required')
    .isIn(['REGULAR', 'PREMIUM', 'VIP', 'RECLINER'])
    .withMessage('Invalid seat type. Must be one of: REGULAR, PREMIUM, VIP, RECLINER')
];

// Validation rules for updating a screen
const updateScreenValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid screen ID'),

  body('screen_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Screen number must be a positive integer'),

  body('total_seats')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total seats must be between 1 and 1000'),

  body('screen_type')
    .optional()
    .trim()
    .isIn(['2D', '3D', 'IMAX', '4DX'])
    .withMessage('Invalid screen type. Must be one of: 2D, 3D, IMAX, 4DX')
];

// Routes
// GET /api/theatres/:theatreId/screens - List screens for a theatre
router.get('/theatres/:theatreId/screens', theatreIdValidation, validateRequest, screenController.getScreensByTheatre);

// GET /api/screens/:id - Get screen with seats
router.get('/:id', screenIdValidation, validateRequest, screenController.getScreen);

// POST /api/theatres/:theatreId/screens - Create screen (admin only)
router.post('/theatres/:theatreId/screens', protect, restrictTo('ADMIN'), createScreenValidation, validateRequest, screenController.createScreen);

// PUT /api/screens/:id - Update screen (admin only)
router.put('/:id', protect, restrictTo('ADMIN'), updateScreenValidation, validateRequest, screenController.updateScreen);

// DELETE /api/screens/:id - Delete screen (admin only)
router.delete('/:id', protect, restrictTo('ADMIN'), screenIdValidation, validateRequest, screenController.deleteScreen);

// POST /api/screens/:screenId/seats - Create seats in batch (admin only)
router.post('/:screenId/seats', protect, restrictTo('ADMIN'), createSeatsValidation, validateRequest, screenController.createSeatsForScreen);

module.exports = router;
