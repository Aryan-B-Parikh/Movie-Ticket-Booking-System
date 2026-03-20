const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getBookingHistory
} = require('../controllers/bookingController');

// Import validation middleware
const {
  validateGetBookings
} = require('../middleware/bookingValidation');

// Import authentication middleware
const { protect } = require('../middleware/auth');

/**
 * User Routes
 * All routes require authentication
 *
 * Base path: /api/users
 */

/**
 * @route   GET /api/users/:userId/bookings
 * @desc    Get user's complete booking history
 * @access  Protected (owner or admin)
 * @param   userId - User ID
 * @query   status, page, limit
 */
router.get('/:userId/bookings',
  protect,
  validateGetBookings,
  getBookingHistory
);

module.exports = router;