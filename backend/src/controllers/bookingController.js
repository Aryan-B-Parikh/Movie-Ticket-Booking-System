const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');

/**
 * Booking Controller - CRITICAL COMPONENT
 * Handles HTTP requests for booking operations
 * Implements transaction-safe booking with comprehensive error handling
 *
 * Key Features:
 * - Transaction-safe booking creation using stored procedures
 * - Server-side amount validation for security
 * - Comprehensive authorization checks
 * - Detailed error handling with proper status codes
 */

/**
 * Get all bookings (admin only)
 * GET /api/bookings (with admin authentication)
 *
 * @query {number} userId - Filter by user ID
 * @query {string} status - Filter by status (CONFIRMED, CANCELLED)
 * @query {string} dateFrom - Start date filter (YYYY-MM-DD)
 * @query {string} dateTo - End date filter (YYYY-MM-DD)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 *
 * @returns {object} HTTP 200 OK with bookings array and pagination info
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    const {
      userId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    // Build filters object
    const filters = {
      limit: Math.min(50, Math.max(1, parseInt(limit))),
      offset: (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)))
    };

    if (userId) filters.userId = parseInt(userId);
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const bookings = await Booking.findAll(filters);

    res.status(200).json({
      status: 'success',
      message: `Retrieved ${bookings.length} booking(s)`,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_results: bookings.length
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get single booking details
 * GET /api/bookings/:id
 *
 * @param {number} id - Booking ID
 *
 * @returns {object} HTTP 200 OK with detailed booking information
 * @throws {AppError} 404 if booking not found, 403 if unauthorized
 */
exports.getBooking = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role || 'USER';

    // Get booking with seats
    const booking = await Booking.findWithSeats(bookingId);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Authorization check: users can only view their own bookings (unless admin)
    if (userRole !== 'ADMIN' && booking.user_id !== userId) {
      throw new AppError('You are not authorized to view this booking', 403);
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking details retrieved successfully',
      data: {
        booking
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user's booking history
 * GET /api/bookings/my-bookings
 *
 * @query {string} status - Filter by status (CONFIRMED, CANCELLED)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 *
 * @returns {object} HTTP 200 OK with bookings array
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Build options object
    const options = {
      limit: Math.min(50, Math.max(1, parseInt(limit))),
      offset: (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)))
    };

    if (status) options.status = status;

    const bookings = await Booking.findByUser(userId, options);

    res.status(200).json({
      status: 'success',
      message: `Retrieved ${bookings.length} booking(s) for user`,
      data: {
        bookings
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create a new booking
 * POST /api/bookings
 *
 * @body {number} showId - Show ID to book
 * @body {array} seatIds - Array of seat IDs (1-10 seats)
 * @body {string} paymentMethod - Payment method (CREDIT_CARD, DEBIT_CARD, UPI, CASH)
 *
 * @returns {object} HTTP 201 Created with booking details
 * @throws {AppError} Various error codes mapped to appropriate HTTP status codes
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { showId, seatIds, paymentMethod } = req.body;
    const userId = req.user.id;

    // Server-side amount calculation for security
    const calculation = await Booking.calculateTotal(seatIds, showId);

    // Prepare booking data
    const bookingData = {
      userId,
      showId,
      seatIds,
      paymentMethod,
      amount: calculation.total_amount
    };

    // Create booking using stored procedure (CRITICAL: transaction-safe)
    const booking = await Booking.create(bookingData);

    // Format response according to requirements
    const response = {
      booking_id: booking.booking_id,
      show: {
        title: booking.movie_title,
        show_time: booking.show_time
      },
      theatre: {
        name: booking.theatre_name
      },
      seats: booking.seats.map(seat => ({
        seat_number: seat.seat_number,
        seat_type: seat.seat_type
      })),
      total_amount: booking.total_amount,
      status: booking.status
    };

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: response
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a booking
 * PUT /api/bookings/:id/cancel
 *
 * @param {number} id - Booking ID to cancel
 *
 * @returns {object} HTTP 200 OK with cancellation confirmation
 * @throws {AppError} Various error codes:
 *   - 403 Unauthorized (user doesn't own booking)
 *   - 404 Not Found (booking doesn't exist)
 *   - 400 Bad Request (already cancelled, invalid status)
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.id;

    // Cancel booking using stored procedure (CRITICAL: transaction-safe)
    const result = await Booking.cancel(bookingId, userId);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        booking: result.booking
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user's complete booking history (alternative endpoint)
 * GET /api/users/:userId/bookings
 *
 * @param {number} userId - User ID
 * @query {string} status - Filter by status
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 *
 * @returns {object} HTTP 200 OK with booking history
 */
exports.getBookingHistory = async (req, res, next) => {
  try {
    const paramUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id;
    const userRole = req.user.role || 'USER';

    // Authorization check: users can only view their own history (unless admin)
    if (userRole !== 'ADMIN' && paramUserId !== currentUserId) {
      throw new AppError('You are not authorized to view this user\'s booking history', 403);
    }

    const { status, page = 1, limit = 20 } = req.query;

    const options = {
      limit: Math.min(50, Math.max(1, parseInt(limit))),
      offset: (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)))
    };

    if (status) options.status = status;

    const bookings = await Booking.findByUser(paramUserId, options);

    res.status(200).json({
      status: 'success',
      message: `Retrieved booking history for user ${paramUserId}`,
      data: {
        bookings
      }
    });

  } catch (error) {
    next(error);
  }
};
