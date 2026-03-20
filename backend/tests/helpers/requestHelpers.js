// Request helpers for integration tests
// Provides utilities for making authenticated API requests and response validation

const request = require('supertest');
const jwt = require('jsonwebtoken');

/**
 * API request helper with authentication and response validation
 */
class ApiHelper {
  constructor(app) {
    this.app = app;
    this.authTokens = new Map();
  }

  /**
   * Create JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  createToken(user) {
    const payload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  /**
   * Login user and store token
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Login response with token
   */
  async loginUser(credentials) {
    const response = await request(this.app)
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);

    const { user, token } = response.body.data;
    this.authTokens.set(user.user_id, token);

    return { user, token };
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  async registerUser(userData) {
    return await request(this.app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);
  }

  /**
   * Get token for user ID
   * @param {number} userId - User ID
   * @returns {string|null} Token or null
   */
  getToken(userId) {
    return this.authTokens.get(userId);
  }

  /**
   * Make authenticated GET request
   * @param {string} endpoint - API endpoint
   * @param {number} userId - User ID for authentication
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Response
   */
  async get(endpoint, userId = null, expectedStatus = 200) {
    const req = request(this.app).get(endpoint);

    if (userId && this.authTokens.has(userId)) {
      req.set('Authorization', `Bearer ${this.authTokens.get(userId)}`);
    }

    return await req.expect(expectedStatus);
  }

  /**
   * Make authenticated POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {number} userId - User ID for authentication
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Response
   */
  async post(endpoint, data = {}, userId = null, expectedStatus = 200) {
    const req = request(this.app).post(endpoint).send(data);

    if (userId && this.authTokens.has(userId)) {
      req.set('Authorization', `Bearer ${this.authTokens.get(userId)}`);
    }

    return await req.expect(expectedStatus);
  }

  /**
   * Make authenticated PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {number} userId - User ID for authentication
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Response
   */
  async put(endpoint, data = {}, userId = null, expectedStatus = 200) {
    const req = request(this.app).put(endpoint).send(data);

    if (userId && this.authTokens.has(userId)) {
      req.set('Authorization', `Bearer ${this.authTokens.get(userId)}`);
    }

    return await req.expect(expectedStatus);
  }

  /**
   * Make authenticated DELETE request
   * @param {string} endpoint - API endpoint
   * @param {number} userId - User ID for authentication
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Response
   */
  async delete(endpoint, userId = null, expectedStatus = 200) {
    const req = request(this.app).delete(endpoint);

    if (userId && this.authTokens.has(userId)) {
      req.set('Authorization', `Bearer ${this.authTokens.get(userId)}`);
    }

    return await req.expect(expectedStatus);
  }

  /**
   * Book tickets for a show
   * @param {Object} bookingData - Booking data
   * @param {number} userId - User ID
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Booking response
   */
  async bookTickets(bookingData, userId, expectedStatus = 201) {
    return await this.post('/api/bookings', bookingData, userId, expectedStatus);
  }

  /**
   * Cancel booking
   * @param {number} bookingId - Booking ID
   * @param {number} userId - User ID
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelBooking(bookingId, userId, expectedStatus = 200) {
    return await this.post(`/api/bookings/${bookingId}/cancel`, {}, userId, expectedStatus);
  }

  /**
   * Get user bookings
   * @param {number} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Bookings response
   */
  async getUserBookings(userId, filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const endpoint = `/api/bookings/user${query ? '?' + query : ''}`;
    return await this.get(endpoint, userId);
  }

  /**
   * Get available seats for show
   * @param {number} showId - Show ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Available seats response
   */
  async getAvailableSeats(showId, userId = null) {
    return await this.get(`/api/shows/${showId}/seats`, userId);
  }

  /**
   * Get movies list
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Movies response
   */
  async getMovies(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const endpoint = `/api/movies${query ? '?' + query : ''}`;
    return await this.get(endpoint);
  }

  /**
   * Get shows for a movie
   * @param {number} movieId - Movie ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Shows response
   */
  async getShowsForMovie(movieId, filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const endpoint = `/api/movies/${movieId}/shows${query ? '?' + query : ''}`;
    return await this.get(endpoint);
  }

  /**
   * Create movie (admin only)
   * @param {Object} movieData - Movie data
   * @param {number} adminUserId - Admin user ID
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Movie creation response
   */
  async createMovie(movieData, adminUserId, expectedStatus = 201) {
    return await this.post('/api/movies', movieData, adminUserId, expectedStatus);
  }

  /**
   * Create show (admin only)
   * @param {Object} showData - Show data
   * @param {number} adminUserId - Admin user ID
   * @param {number} expectedStatus - Expected HTTP status
   * @returns {Promise<Object>} Show creation response
   */
  async createShow(showData, adminUserId, expectedStatus = 201) {
    return await this.post('/api/shows', showData, adminUserId, expectedStatus);
  }

  /**
   * Clear stored tokens
   */
  clearTokens() {
    this.authTokens.clear();
  }
}

/**
 * Response validation helpers
 */
class ResponseValidator {

  /**
   * Validate API success response structure
   * @param {Object} response - API response
   * @param {Array} requiredFields - Required fields in data
   */
  static validateSuccessResponse(response, requiredFields = []) {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');

    if (requiredFields.length > 0) {
      requiredFields.forEach(field => {
        expect(response.body.data).toHaveProperty(field);
      });
    }
  }

  /**
   * Validate API error response structure
   * @param {Object} response - API response
   * @param {string} expectedMessage - Expected error message (optional)
   */
  static validateErrorResponse(response, expectedMessage = null) {
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');

    if (expectedMessage) {
      expect(response.body.error.message).toContain(expectedMessage);
    }
  }

  /**
   * Validate booking response
   * @param {Object} response - Booking response
   */
  static validateBookingResponse(response) {
    this.validateSuccessResponse(response, [
      'booking_id', 'user_id', 'show_id', 'total_amount', 'status', 'seats'
    ]);

    const booking = response.body.data;
    expect(booking).toBeValidBooking();
    expect(booking.seats).toBeValidSeatArray();
    expect(booking.total_amount).toBeValidPrice();
    expect(booking.status).toBe('CONFIRMED');
  }

  /**
   * Validate user response (without sensitive data)
   * @param {Object} response - User response
   */
  static validateUserResponse(response) {
    this.validateSuccessResponse(response, ['user_id', 'username', 'email', 'role']);

    const user = response.body.data;
    expect(user).toBeValidUser();
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('password_hash');
  }

  /**
   * Validate show response
   * @param {Object} response - Show response
   */
  static validateShowResponse(response) {
    this.validateSuccessResponse(response, [
      'show_id', 'movie_id', 'screen_id', 'show_time', 'price'
    ]);

    const show = response.body.data;
    expect(show).toBeValidShow();
    expect(show.price).toBeValidPrice();
  }

  /**
   * Validate array response
   * @param {Object} response - Array response
   * @param {Function} itemValidator - Function to validate each item
   */
  static validateArrayResponse(response, itemValidator = null) {
    this.validateSuccessResponse(response);
    expect(Array.isArray(response.body.data)).toBe(true);

    if (itemValidator && response.body.data.length > 0) {
      response.body.data.forEach(item => itemValidator(item));
    }
  }

  /**
   * Validate pagination response
   * @param {Object} response - Paginated response
   * @param {Function} itemValidator - Function to validate each item
   */
  static validatePaginatedResponse(response, itemValidator = null) {
    this.validateSuccessResponse(response, ['items', 'pagination']);

    const { items, pagination } = response.body.data;
    expect(Array.isArray(items)).toBe(true);
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');

    if (itemValidator && items.length > 0) {
      items.forEach(item => itemValidator(item));
    }
  }
}

/**
 * Concurrency test helpers
 */
class ConcurrencyHelper {

  /**
   * Run multiple concurrent requests
   * @param {Array} requestPromises - Array of request promises
   * @param {number} expectedSuccessCount - Expected number of successful requests
   * @returns {Promise<Object>} Results summary
   */
  static async runConcurrentRequests(requestPromises, expectedSuccessCount = null) {
    const startTime = Date.now();
    const results = await Promise.allSettled(requestPromises);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const duration = endTime - startTime;

    const summary = {
      total: results.length,
      successful,
      failed,
      duration,
      results
    };

    if (expectedSuccessCount !== null) {
      expect(successful).toBe(expectedSuccessCount);
    }

    return summary;
  }

  /**
   * Create concurrent booking requests for same seats
   * @param {Object} apiHelper - API helper instance
   * @param {Object} bookingData - Base booking data
   * @param {Array} userIds - Array of user IDs
   * @returns {Array} Array of booking promises
   */
  static createConcurrentBookings(apiHelper, bookingData, userIds) {
    return userIds.map(userId =>
      apiHelper.bookTickets(bookingData, userId, null) // Don't expect specific status
        .then(response => ({ userId, success: true, response }))
        .catch(error => ({ userId, success: false, error }))
    );
  }

  /**
   * Verify no double booking occurred
   * @param {Array} bookingResults - Results from concurrent bookings
   * @param {Array} requestedSeatIds - Seat IDs that were requested
   * @returns {Object} Verification result
   */
  static verifyNoDoubleBooking(bookingResults, requestedSeatIds) {
    const successfulBookings = bookingResults.filter(r => r.success);
    const failedBookings = bookingResults.filter(r => !r.success);

    // Only one booking should succeed for the same seats
    expect(successfulBookings.length).toBe(1);
    expect(failedBookings.length).toBe(bookingResults.length - 1);

    // Failed bookings should have appropriate error messages
    failedBookings.forEach(result => {
      expect(result.error.message || result.error.response?.body?.error?.message)
        .toMatch(/seat.*unavailable|already.*booked/i);
    });

    return {
      successfulBooking: successfulBookings[0],
      failedCount: failedBookings.length,
      allSeatsProtected: true
    };
  }
}

/**
 * Performance measurement helpers
 */
class PerformanceHelper {

  /**
   * Measure API endpoint performance
   * @param {Function} requestFunction - Function that makes the API request
   * @param {number} iterations - Number of iterations to run
   * @param {number} maxAvgTime - Maximum average response time (ms)
   * @returns {Promise<Object>} Performance metrics
   */
  static async measurePerformance(requestFunction, iterations = 10, maxAvgTime = 200) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await requestFunction();
      const endTime = Date.now();
      times.push(endTime - startTime);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    const metrics = {
      iterations,
      avgTime: Math.round(avgTime),
      minTime,
      maxTime,
      p95Time,
      times
    };

    if (maxAvgTime) {
      expect(avgTime).toBeLessThanOrEqual(maxAvgTime);
    }

    return metrics;
  }
}

module.exports = {
  ApiHelper,
  ResponseValidator,
  ConcurrencyHelper,
  PerformanceHelper
};