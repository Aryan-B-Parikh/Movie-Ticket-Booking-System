const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  validateCreateShow,
  validateUpdateShow,
  validateShowId,
  validateShowQuery
} = require('../middleware/showValidation');
const showController = require('../controllers/showController');

const router = express.Router();

// Public routes - no authentication required

// GET /api/shows/upcoming - Get upcoming shows (next 7 days by default)
// Query params: ?days=7 (1-90 days)
router.get('/upcoming', validateShowQuery, validateRequest, showController.getUpcomingShows);

// GET /api/shows - List all shows with optional filters
// Query params: ?movieId=1&theatreId=2&date=2026-03-20&startDate=2026-03-20&endDate=2026-03-27
router.get('/', validateShowQuery, validateRequest, showController.getAllShows);

// GET /api/shows/:id - Get single show by ID with full details
router.get('/:id', validateShowId, validateRequest, showController.getShow);

// GET /api/shows/:id/seats - Get available seats for a show (calls stored procedure)
router.get('/:id/seats', validateShowId, validateRequest, showController.getAvailableSeats);

// Admin-only routes - require authentication and ADMIN role

// POST /api/shows - Create new show (admin only)
// Body: { movie_id, screen_id, show_time, price }
router.post('/', protect, restrictTo('ADMIN'), validateCreateShow, validateRequest, showController.createShow);

// PUT /api/shows/:id - Update show (admin only)
// Body: { movie_id?, screen_id?, show_time?, price? }
router.put('/:id', protect, restrictTo('ADMIN'), validateUpdateShow, validateRequest, showController.updateShow);

// DELETE /api/shows/:id - Soft delete show (admin only)
router.delete('/:id', protect, restrictTo('ADMIN'), validateShowId, validateRequest, showController.deleteShow);

module.exports = router;