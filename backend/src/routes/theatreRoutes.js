const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');
const { protect, restrictTo } = require('../middleware/auth');
const theatreController = require('../controllers/theatreController');
const showController = require('../controllers/showController');
const { validateTheatreId } = require('../middleware/showValidation');

const router = express.Router();

// Validation rules for creating a theatre
const createTheatreValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Theatre name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Theatre name must be between 3 and 255 characters'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Location must be between 5 and 255 characters'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),

  body('pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Pincode must be exactly 6 characters')
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be 6 digits')
];

// Validation rules for updating a theatre
const updateTheatreValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid theatre ID'),

  ...createTheatreValidation
];

// Validation rules for theatre ID parameter
const theatreIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid theatre ID')
];

// Validation rules for location parameter
const locationValidation = [
  param('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters')
];

// Routes
// GET /api/theatres/location/:location - Must be before /:id to avoid route conflict
router.get('/location/:location', locationValidation, validateRequest, theatreController.getTheatresByLocation);

// GET /api/theatres - List all theatres
router.get('/', theatreController.getAllTheatres);

// GET /api/theatres/:id - Get single theatre with screens
router.get('/:id', theatreIdValidation, validateRequest, theatreController.getTheatre);

// GET /api/theatres/:theatreId/shows - Get shows at a specific theatre
router.get('/:theatreId/shows', validateTheatreId, validateRequest, showController.getShowsByTheatre);

// POST /api/theatres - Create new theatre (admin only)
router.post('/', protect, restrictTo('ADMIN'), createTheatreValidation, validateRequest, theatreController.createTheatre);

// PUT /api/theatres/:id - Update theatre (admin only)
router.put('/:id', protect, restrictTo('ADMIN'), updateTheatreValidation, validateRequest, theatreController.updateTheatre);

// DELETE /api/theatres/:id - Delete theatre (admin only)
router.delete('/:id', protect, restrictTo('ADMIN'), theatreIdValidation, validateRequest, theatreController.deleteTheatre);

module.exports = router;
