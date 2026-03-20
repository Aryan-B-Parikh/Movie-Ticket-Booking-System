const { query, transaction } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Booking Model - CRITICAL COMPONENT for Movie Ticket Booking System
 *
 * This model handles all booking operations with transaction safety and concurrency control.
 * All booking creation and cancellation operations use stored procedures to ensure ACID properties.
 *
 * Key Features:
 * - Transaction-safe booking creation using sp_book_tickets
 * - Secure cancellation using sp_cancel_booking
 * - Server-side amount calculation for security
 * - Comprehensive booking retrieval with JOIN operations
 * - User authorization checks
 */
class Booking {

  /**
   * Find all bookings with optional filters
   * Used for admin dashboard and reporting
   *
   * @param {Object} filters - Optional filters
   * @param {number} filters.userId - Filter by user ID
   * @param {string} filters.status - Filter by status (CONFIRMED, CANCELLED)
   * @param {string} filters.dateFrom - Start date filter (YYYY-MM-DD)
   * @param {string} filters.dateTo - End date filter (YYYY-MM-DD)
   * @param {number} filters.limit - Limit results (default: 50)
   * @param {number} filters.offset - Offset for pagination (default: 0)
   * @returns {Promise<Array>} Array of booking objects
   */
  static async findAll(filters = {}) {
    let sql = `
      SELECT
        b.booking_id,
        b.user_id,
        b.show_id,
        b.total_amount,
        b.status,
        b.booking_date,
        b.updated_at,
        u.username,
        u.email,
        m.title as movie_title,
        m.duration as movie_duration,
        m.rating as movie_rating,
        s.show_time,
        s.price as show_price,
        t.name as theatre_name,
        t.location as theatre_location,
        sc.screen_name,
        GROUP_CONCAT(
          CONCAT(st.seat_number, ' (', st.seat_type, ')')
          ORDER BY st.seat_number SEPARATOR ', '
        ) as seats_booked,
        COUNT(bs.seat_id) as seat_count
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Shows s ON b.show_id = s.show_id
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      LEFT JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
      LEFT JOIN Seats st ON bs.seat_id = st.seat_id
      WHERE b.is_deleted = FALSE
    `;

    const params = [];

    // Apply filters
    if (filters.userId) {
      sql += ' AND b.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.status) {
      sql += ' AND b.status = ?';
      params.push(filters.status);
    }

    if (filters.dateFrom) {
      sql += ' AND DATE(b.booking_date) >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ' AND DATE(b.booking_date) <= ?';
      params.push(filters.dateTo);
    }

    sql += `
      GROUP BY b.booking_id
      ORDER BY b.booking_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(filters.limit || 50, filters.offset || 0);

    return await query(sql, params);
  }

  /**
   * Find booking by ID with complete details
   * Includes all related data via JOIN operations
   *
   * @param {number} bookingId - Booking ID to retrieve
   * @returns {Promise<Object|null>} Booking object or null if not found
   */
  static async findById(bookingId) {
    const sql = `
      SELECT
        b.booking_id,
        b.user_id,
        b.show_id,
        b.total_amount,
        b.status,
        b.booking_date,
        b.updated_at,
        u.username,
        u.email,
        m.movie_id,
        m.title as movie_title,
        m.description as movie_description,
        m.duration as movie_duration,
        m.rating as movie_rating,
        m.poster_url,
        s.show_time,
        s.price as show_price,
        t.theatre_id,
        t.name as theatre_name,
        t.location as theatre_location,
        sc.screen_id,
        sc.screen_name,
        sc.total_seats,
        p.payment_id,
        p.payment_method,
        p.payment_status,
        p.payment_date
      FROM Bookings b
      INNER JOIN Users u ON b.user_id = u.user_id
      INNER JOIN Shows s ON b.show_id = s.show_id
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      LEFT JOIN Payments p ON b.booking_id = p.booking_id
      WHERE b.booking_id = ? AND b.is_deleted = FALSE
    `;

    const bookings = await query(sql, [bookingId]);
    return bookings.length > 0 ? bookings[0] : null;
  }

  /**
   * Find booking with seat details
   * Returns booking with array of booked seats
   *
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object|null>} Booking with seats array
   */
  static async findWithSeats(bookingId) {
    const booking = await this.findById(bookingId);
    if (!booking) return null;

    // Get seat details
    const seatsSql = `
      SELECT
        st.seat_id,
        st.seat_number,
        st.seat_type,
        st.row_number,
        st.column_number
      FROM Booking_Seats bs
      INNER JOIN Seats st ON bs.seat_id = st.seat_id
      WHERE bs.booking_id = ?
      ORDER BY st.row_number, st.column_number
    `;

    const seats = await query(seatsSql, [bookingId]);

    return {
      ...booking,
      seats: seats
    };
  }

  /**
   * Find bookings by user ID
   * Returns user's booking history with pagination
   *
   * @param {number} userId - User ID
   * @param {Object} options - Options for pagination and filtering
   * @param {number} options.limit - Limit results (default: 20)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {string} options.status - Filter by status
   * @returns {Promise<Array>} Array of user's bookings
   */
  static async findByUser(userId, options = {}) {
    const { limit = 20, offset = 0, status } = options;

    let sql = `
      SELECT
        b.booking_id,
        b.show_id,
        b.total_amount,
        b.status,
        b.booking_date,
        m.title as movie_title,
        m.poster_url,
        m.rating as movie_rating,
        s.show_time,
        t.name as theatre_name,
        t.location as theatre_location,
        sc.screen_name,
        COUNT(bs.seat_id) as seat_count,
        GROUP_CONCAT(st.seat_number ORDER BY st.seat_number) as seat_numbers
      FROM Bookings b
      INNER JOIN Shows s ON b.show_id = s.show_id
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      LEFT JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
      LEFT JOIN Seats st ON bs.seat_id = st.seat_id
      WHERE b.user_id = ? AND b.is_deleted = FALSE
    `;

    const params = [userId];

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += `
      GROUP BY b.booking_id
      ORDER BY b.booking_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    return await query(sql, params);
  }

  /**
   * Calculate total amount for given seats and show
   * SECURITY CRITICAL: Server-side calculation prevents price manipulation
   *
   * @param {Array<number>} seatIds - Array of seat IDs
   * @param {number} showId - Show ID
   * @returns {Promise<Object>} Calculation result with amount and breakdown
   */
  static async calculateTotal(seatIds, showId) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new AppError('Seat IDs array is required and cannot be empty', 400);
    }

    // Get show price and validate show exists
    const showSql = `
      SELECT show_id, price, movie_id, screen_id, show_time, is_deleted
      FROM Shows
      WHERE show_id = ?
    `;

    const shows = await query(showSql, [showId]);
    if (shows.length === 0) {
      throw new AppError('Show not found', 404);
    }

    const show = shows[0];
    if (show.is_deleted) {
      throw new AppError('Show is no longer available', 400);
    }

    // Validate seats exist and belong to the correct screen
    const placeholders = seatIds.map(() => '?').join(',');
    const seatsSql = `
      SELECT seat_id, seat_type, screen_id
      FROM Seats
      WHERE seat_id IN (${placeholders}) AND screen_id = ?
    `;

    const seats = await query(seatsSql, [...seatIds, show.screen_id]);

    if (seats.length !== seatIds.length) {
      throw new AppError('One or more seats are invalid for this show', 400);
    }

    // Calculate total amount with VIP premium
    const VIP_PREMIUM = 50.00;
    let totalAmount = 0;
    const breakdown = [];

    for (const seat of seats) {
      const seatPrice = show.price + (seat.seat_type === 'VIP' ? VIP_PREMIUM : 0);
      totalAmount += seatPrice;
      breakdown.push({
        seat_id: seat.seat_id,
        seat_type: seat.seat_type,
        base_price: show.price,
        vip_premium: seat.seat_type === 'VIP' ? VIP_PREMIUM : 0,
        seat_price: seatPrice
      });
    }

    return {
      total_amount: parseFloat(totalAmount.toFixed(2)),
      seat_count: seats.length,
      show_price: show.price,
      breakdown: breakdown
    };
  }

  /**
   * Create new booking using sp_book_tickets stored procedure
   * CRITICAL METHOD: Uses transaction-safe stored procedure with concurrency control
   *
   * @param {Object} bookingData - Booking data
   * @param {number} bookingData.userId - User ID
   * @param {number} bookingData.showId - Show ID
   * @param {Array<number>} bookingData.seatIds - Array of seat IDs
   * @param {string} bookingData.paymentMethod - Payment method (CREDIT_CARD, DEBIT_CARD, UPI, CASH)
   * @param {number} bookingData.amount - Total amount (for verification)
   * @returns {Promise<Object>} Created booking details
   */
  static async create(bookingData) {
    const { userId, showId, seatIds, paymentMethod, amount } = bookingData;

    // Input validation
    if (!userId || !showId || !Array.isArray(seatIds) || seatIds.length === 0 || !paymentMethod || !amount) {
      throw new AppError('Missing required booking data', 400);
    }

    // Convert seat IDs array to comma-separated string for stored procedure
    const seatIdsStr = seatIds.join(',');

    // Call stored procedure using transaction helper
    return await transaction(async (connection) => {
      const [result] = await connection.execute(
        'CALL sp_book_tickets(?, ?, ?, ?, ?, @booking_id, @error_code, @error_message)',
        [userId, showId, seatIdsStr, paymentMethod, amount]
      );

      // Get output parameters
      const [outputResult] = await connection.execute(
        'SELECT @booking_id as booking_id, @error_code as error_code, @error_message as error_message'
      );

      const output = outputResult[0];

      // Check for stored procedure errors
      if (output.error_code !== 'SUCCESS') {
        // Map stored procedure error codes to HTTP status codes
        const errorMap = {
          'INVALID_USER': 400,
          'INVALID_SHOW': 400,
          'INVALID_SEATS': 400,
          'INVALID_PAYMENT': 400,
          'SHOW_NOT_FOUND': 404,
          'SHOW_DELETED': 404,
          'INVALID_SEAT': 400,
          'SEAT_UNAVAILABLE': 409,
          'NO_VALID_SEATS': 400,
          'AMOUNT_MISMATCH': 400,
          'DB_ERROR': 500
        };

        const statusCode = errorMap[output.error_code] || 500;
        throw new AppError(output.error_message, statusCode);
      }

      // Return complete booking details
      const booking = await this.findWithSeats(output.booking_id);
      return booking;
    });
  }

  /**
   * Cancel booking using sp_cancel_booking stored procedure
   * CRITICAL METHOD: Uses transaction-safe stored procedure with authorization
   *
   * @param {number} bookingId - Booking ID to cancel
   * @param {number} userId - User ID requesting cancellation
   * @returns {Promise<Object>} Cancellation result
   */
  static async cancel(bookingId, userId) {
    if (!bookingId || !userId) {
      throw new AppError('Booking ID and User ID are required', 400);
    }

    // Call stored procedure using transaction helper
    return await transaction(async (connection) => {
      const [result] = await connection.execute(
        'CALL sp_cancel_booking(?, ?, @result, @message)',
        [bookingId, userId]
      );

      // Get output parameters
      const [outputResult] = await connection.execute(
        'SELECT @result as result, @message as message'
      );

      const output = outputResult[0];

      // Check for stored procedure errors
      if (output.result !== 'SUCCESS') {
        // Map stored procedure result codes to HTTP status codes
        const errorMap = {
          'INVALID_INPUT': 400,
          'NOT_FOUND': 404,
          'UNAUTHORIZED': 403,
          'ALREADY_CANCELLED': 400,
          'INVALID_STATUS': 400,
          'BOOKING_DELETED': 404,
          'ERROR': 500
        };

        const statusCode = errorMap[output.result] || 500;
        throw new AppError(output.message, statusCode);
      }

      // Return updated booking details
      const booking = await this.findWithSeats(bookingId);
      return {
        booking: booking,
        message: output.message
      };
    });
  }
}

module.exports = Booking;
