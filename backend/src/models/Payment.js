const { query } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Payment Model
 *
 * Handles all payment-related database operations for the Movie Ticket Booking System.
 * This model manages payment records that are automatically created during booking process.
 *
 * Key Features:
 * - Retrieve payment details by booking ID
 * - Create payment records (used internally by stored procedures)
 * - Update payment status for refund processing
 * - Audit trail for all payment operations
 */
class Payment {

  /**
   * Find payment by booking ID
   * Retrieves payment record associated with a specific booking
   *
   * @param {number} bookingId - Booking ID to find payment for
   * @returns {Promise<Object|null>} Payment object or null if not found
   */
  static async findByBooking(bookingId) {
    if (!bookingId) {
      throw new AppError('Booking ID is required', 400);
    }

    const sql = `
      SELECT
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.payment_date,
        p.transaction_id,
        p.gateway_response,
        p.created_at,
        p.updated_at,
        b.user_id,
        b.status as booking_status,
        b.total_amount as booking_amount
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      WHERE p.booking_id = ?
      ORDER BY p.created_at DESC
      LIMIT 1
    `;

    const payments = await query(sql, [bookingId]);
    return payments.length > 0 ? payments[0] : null;
  }

  /**
   * Find payment by payment ID
   * Direct lookup by payment ID with booking details
   *
   * @param {number} paymentId - Payment ID to retrieve
   * @returns {Promise<Object|null>} Payment object or null if not found
   */
  static async findById(paymentId) {
    if (!paymentId) {
      throw new AppError('Payment ID is required', 400);
    }

    const sql = `
      SELECT
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.payment_date,
        p.transaction_id,
        p.gateway_response,
        p.created_at,
        p.updated_at,
        b.user_id,
        b.status as booking_status,
        b.total_amount as booking_amount,
        u.username,
        u.email
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      INNER JOIN Users u ON b.user_id = u.user_id
      WHERE p.payment_id = ?
    `;

    const payments = await query(sql, [paymentId]);
    return payments.length > 0 ? payments[0] : null;
  }

  /**
   * Create payment record
   * Used internally by stored procedures during booking process
   *
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.bookingId - Booking ID this payment is for
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.paymentMethod - Payment method (CREDIT_CARD, DEBIT_CARD, UPI, CASH)
   * @param {string} paymentData.paymentStatus - Payment status (SUCCESS, FAILED, PENDING, REFUNDED)
   * @param {string} paymentData.transactionId - Optional transaction ID from payment gateway
   * @param {string} paymentData.gatewayResponse - Optional gateway response data
   * @returns {Promise<Object>} Created payment record
   */
  static async create(paymentData) {
    const {
      bookingId,
      amount,
      paymentMethod,
      paymentStatus = 'SUCCESS',
      transactionId = null,
      gatewayResponse = null
    } = paymentData;

    // Input validation
    if (!bookingId || !amount || !paymentMethod) {
      throw new AppError('Booking ID, amount, and payment method are required', 400);
    }

    // Validate payment method
    const validMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CASH', 'NET_BANKING'];
    if (!validMethods.includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400);
    }

    // Validate payment status
    const validStatuses = ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'];
    if (!validStatuses.includes(paymentStatus)) {
      throw new AppError('Invalid payment status', 400);
    }

    // Insert payment record
    const sql = `
      INSERT INTO Payments (
        booking_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        gateway_response,
        payment_date
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await query(sql, [
      bookingId,
      amount,
      paymentMethod,
      paymentStatus,
      transactionId,
      gatewayResponse
    ]);

    // Return the created payment record
    return await this.findById(result.insertId);
  }

  /**
   * Update payment status
   * Used for refund processing and status updates
   *
   * @param {number} paymentId - Payment ID to update
   * @param {string} newStatus - New payment status (SUCCESS, FAILED, REFUNDED, etc.)
   * @param {string} gatewayResponse - Optional updated gateway response
   * @returns {Promise<Object>} Updated payment record
   */
  static async updateStatus(paymentId, newStatus, gatewayResponse = null) {
    if (!paymentId || !newStatus) {
      throw new AppError('Payment ID and new status are required', 400);
    }

    // Validate payment status
    const validStatuses = ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      throw new AppError('Invalid payment status', 400);
    }

    // Check if payment exists
    const existingPayment = await this.findById(paymentId);
    if (!existingPayment) {
      throw new AppError('Payment not found', 404);
    }

    // Update payment status
    const sql = `
      UPDATE Payments
      SET
        payment_status = ?,
        gateway_response = COALESCE(?, gateway_response),
        updated_at = CURRENT_TIMESTAMP
      WHERE payment_id = ?
    `;

    await query(sql, [newStatus, gatewayResponse, paymentId]);

    // Return updated payment record
    return await this.findById(paymentId);
  }

  /**
   * Find payments by user ID
   * Retrieve all payments for a specific user with pagination
   *
   * @param {number} userId - User ID to find payments for
   * @param {Object} options - Options for pagination and filtering
   * @param {number} options.limit - Limit results (default: 20)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {string} options.status - Filter by payment status
   * @param {string} options.method - Filter by payment method
   * @returns {Promise<Array>} Array of payment records
   */
  static async findByUser(userId, options = {}) {
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const { limit = 20, offset = 0, status, method } = options;

    let sql = `
      SELECT
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.payment_date,
        p.transaction_id,
        b.total_amount as booking_amount,
        m.title as movie_title,
        t.name as theatre_name,
        s.show_time
      FROM Payments p
      INNER JOIN Bookings b ON p.booking_id = b.booking_id
      INNER JOIN Shows s ON b.show_id = s.show_id
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE b.user_id = ?
    `;

    const params = [userId];

    // Apply filters
    if (status) {
      sql += ' AND p.payment_status = ?';
      params.push(status);
    }

    if (method) {
      sql += ' AND p.payment_method = ?';
      params.push(method);
    }

    sql += `
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    return await query(sql, params);
  }

  /**
   * Get payment statistics
   * Used for admin dashboard and reporting
   *
   * @param {Object} filters - Date and status filters
   * @param {string} filters.dateFrom - Start date (YYYY-MM-DD)
   * @param {string} filters.dateTo - End date (YYYY-MM-DD)
   * @param {string} filters.status - Payment status filter
   * @returns {Promise<Object>} Payment statistics
   */
  static async getStatistics(filters = {}) {
    const { dateFrom, dateTo, status } = filters;

    let sql = `
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_status = 'SUCCESS' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN payment_status = 'FAILED' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN payment_status = 'REFUNDED' THEN 1 END) as refunded_payments,
        SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE NULL END) as avg_payment_amount,
        COUNT(DISTINCT CASE WHEN payment_status = 'SUCCESS' THEN booking_id ELSE NULL END) as unique_bookings
      FROM Payments
      WHERE 1=1
    `;

    const params = [];

    if (dateFrom) {
      sql += ' AND DATE(payment_date) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ' AND DATE(payment_date) <= ?';
      params.push(dateTo);
    }

    if (status) {
      sql += ' AND payment_status = ?';
      params.push(status);
    }

    const [stats] = await query(sql, params);
    return stats;
  }

  /**
   * Get payment method breakdown
   * Returns payment distribution by method
   *
   * @param {Object} filters - Date filters
   * @returns {Promise<Array>} Array of payment method statistics
   */
  static async getPaymentMethodBreakdown(filters = {}) {
    const { dateFrom, dateTo } = filters;

    let sql = `
      SELECT
        payment_method,
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_status = 'SUCCESS' THEN 1 END) as successful_payments,
        SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE NULL END) as avg_amount
      FROM Payments
      WHERE 1=1
    `;

    const params = [];

    if (dateFrom) {
      sql += ' AND DATE(payment_date) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ' AND DATE(payment_date) <= ?';
      params.push(dateTo);
    }

    sql += `
      GROUP BY payment_method
      ORDER BY total_revenue DESC
    `;

    return await query(sql, params);
  }

  /**
   * Process refund for cancelled booking
   * Updates payment status and creates audit trail
   * Note: Actual payment gateway refund should be handled separately
   *
   * @param {number} bookingId - Booking ID to refund
   * @param {string} reason - Reason for refund
   * @returns {Promise<Object>} Refund processing result
   */
  static async processRefund(bookingId, reason = 'Booking cancelled by user') {
    if (!bookingId) {
      throw new AppError('Booking ID is required', 400);
    }

    // Find payment for this booking
    const payment = await this.findByBooking(bookingId);
    if (!payment) {
      throw new AppError('Payment not found for this booking', 404);
    }

    // Check if payment is eligible for refund
    if (payment.payment_status === 'REFUNDED') {
      throw new AppError('This payment has already been refunded', 400);
    }

    if (payment.payment_status !== 'SUCCESS') {
      throw new AppError('Only successful payments can be refunded', 400);
    }

    // Update payment status to REFUNDED
    const updatedPayment = await this.updateStatus(
      payment.payment_id,
      'REFUNDED',
      JSON.stringify({ reason, refund_date: new Date().toISOString() })
    );

    return {
      payment_id: payment.payment_id,
      booking_id: bookingId,
      refund_amount: payment.amount,
      message: `Refund of $${payment.amount} processed for booking ${bookingId}`,
      status: 'REFUNDED'
    };
  }
}

module.exports = Payment;