const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getAllBookings,
  getBooking,
  getUserBookings,
  createBooking,
  cancelBooking,
  getBookingHistory
} = require('../controllers/bookingController');

// Import validation middleware
const {
  validateCreateBooking,
  validateGetBookings,
  validateGetBooking,
  validateCancelBooking
} = require('../middleware/bookingValidation');

// Import authentication middleware
const { protect, restrictTo } = require('../middleware/auth');

/**
 * Booking Routes - CRITICAL COMPONENT
 * All routes require authentication
 *
 * Base path: /api/bookings
 *
 * Route Structure:
 * - GET /api/bookings - List all (admin only)
 * - GET /api/bookings/my-bookings - User's bookings
 * - GET /api/bookings/:id - Get booking details
 * - POST /api/bookings - Create booking
 * - PUT /api/bookings/:id/cancel - Cancel booking
 */

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get current user's booking history
 * @access  Protected (requires authentication)
 * @query   status, page, limit
 * @note    This route must be BEFORE /:id to avoid conflicts
 */
router.get('/my-bookings',
  protect,
  validateGetBookings,
  getUserBookings
);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (admin only)
 * @access  Protected (Admin only)
 * @query   userId, status, dateFrom, dateTo, page, limit
 */
router.get('/',
  protect,
  restrictTo('ADMIN'),
  validateGetBookings,
  getAllBookings
);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking details
 * @access  Protected (owner or admin)
 * @param   id - Booking ID
 */
router.get('/:id',
  protect,
  validateGetBooking,
  getBooking
);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking (CRITICAL - uses stored procedure)
 * @access  Protected (requires authentication)
 * @body    { showId, seatIds[], paymentMethod }
 * @note    Amount is calculated server-side for security
 */
router.post('/',
  protect,
  validateCreateBooking,
  createBooking
);

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel a booking (uses stored procedure)
 * @access  Protected (owner or admin)
 * @param   id - Booking ID
 */
router.put('/:id/cancel',
  protect,
  validateCancelBooking,
  cancelBooking
);

module.exports = router;
