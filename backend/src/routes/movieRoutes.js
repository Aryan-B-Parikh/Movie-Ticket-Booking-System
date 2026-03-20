const express = require('express');
const { body, query, param } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');
const { protect, restrictTo } = require('../middleware/auth');
const movieController = require('../controllers/movieController');
const showController = require('../controllers/showController');
const { validateMovieId } = require('../middleware/showValidation');

const router = express.Router();

// Validation rules for creating a movie
const createMovieValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('genre')
    .trim()
    .notEmpty()
    .withMessage('Genre is required')
    .isIn(['ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'ROMANCE', 'SCI_FI', 'THRILLER', 'DOCUMENTARY', 'ANIMATION', 'OTHER'])
    .withMessage('Invalid genre'),

  body('language')
    .trim()
    .notEmpty()
    .withMessage('Language is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Language must be between 2 and 50 characters'),

  body('duration_minutes')
    .isInt({ min: 1, max: 500 })
    .withMessage('Duration must be between 1 and 500 minutes'),

  body('release_date')
    .isDate()
    .withMessage('Valid release date is required (YYYY-MM-DD)'),

  body('rating')
    .optional()
    .trim()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'])
    .withMessage('Invalid rating. Must be one of: G, PG, PG-13, R, NC-17, NR'),

  body('poster_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Poster URL must be a valid URL')
];

// Validation rules for updating a movie
const updateMovieValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid movie ID'),

  ...createMovieValidation
];

// Validation rules for movie ID parameter
const movieIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid movie ID')
];

// Validation rules for search query
const searchValidation = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query (q) is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
];

// Validation rules for filter query parameters
const filterValidation = [
  query('genre')
    .optional()
    .trim()
    .isIn(['ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'ROMANCE', 'SCI_FI', 'THRILLER', 'DOCUMENTARY', 'ANIMATION', 'OTHER'])
    .withMessage('Invalid genre'),

  query('language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Language must be between 2 and 50 characters'),

  query('rating')
    .optional()
    .trim()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'])
    .withMessage('Invalid rating'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

// Routes
// GET /api/movies/search - Must be before /:id to avoid route conflict
router.get('/search', searchValidation, validateRequest, movieController.searchMovies);

// GET /api/movies/genres - Get all available genres
router.get('/genres', movieController.getGenres);

// GET /api/movies/languages - Get all available languages
router.get('/languages', movieController.getLanguages);

// GET /api/movies - List all movies with optional filters
router.get('/', filterValidation, validateRequest, movieController.getAllMovies);

// GET /api/movies/:id - Get single movie
router.get('/:id', movieIdValidation, validateRequest, movieController.getMovie);

// GET /api/movies/:id/shows - Get movie with its upcoming shows
router.get('/:id/shows', movieIdValidation, validateRequest, movieController.getMovieWithShows);

// GET /api/movies/:movieId/shows - Get shows for a specific movie (alternative endpoint)
router.get('/:movieId/shows', validateMovieId, validateRequest, showController.getShowsByMovie);

// POST /api/movies - Create new movie (admin only)
router.post('/', protect, restrictTo('ADMIN'), createMovieValidation, validateRequest, movieController.createMovie);

// PUT /api/movies/:id - Update movie (admin only)
router.put('/:id', protect, restrictTo('ADMIN'), updateMovieValidation, validateRequest, movieController.updateMovie);

// DELETE /api/movies/:id - Soft delete movie (admin only)
router.delete('/:id', protect, restrictTo('ADMIN'), movieIdValidation, validateRequest, movieController.deleteMovie);

module.exports = router;
