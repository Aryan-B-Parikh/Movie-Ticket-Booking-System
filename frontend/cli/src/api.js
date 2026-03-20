const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

/**
 * API Client for Movie Booking System
 * Handles authentication, token storage, and API communication
 */
class APIClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || process.env.API_URL || 'http://localhost:3000/api';
    this.timeout = options.timeout || parseInt(process.env.API_TIMEOUT) || 10000;
    this.debug = options.debug || false;

    // Token storage path
    this.tokenPath = path.join(os.homedir(), '.movie-booking-cli', 'auth.json');

    // Initialize axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Load token if exists
    this.loadAuthToken();

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.debug) {
          console.log(chalk.cyan(`[API] ${config.method?.toUpperCase()} ${config.url}`));
          if (config.data) {
            console.log(chalk.cyan('[API] Request data:'), config.data);
          }
        }
        return config;
      },
      (error) => {
        if (this.debug) {
          console.error(chalk.red('[API] Request error:'), error.message);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (this.debug) {
          console.log(chalk.green(`[API] Response ${response.status}: ${response.config.method?.toUpperCase()} ${response.config.url}`));
        }
        return response;
      },
      (error) => {
        if (this.debug) {
          console.error(chalk.red('[API] Response error:'), error.message);
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          this.clearAuthToken();
          throw new Error('Authentication failed. Please login again with: movie-booking auth login');
        }

        // Handle server errors
        if (error.response?.status >= 500) {
          throw new Error(`Server error: ${error.response?.data?.message || 'Internal server error'}`);
        }

        // Handle client errors
        if (error.response?.status >= 400) {
          const message = error.response?.data?.message ||
                         error.response?.data?.error ||
                         `Request failed with status ${error.response.status}`;
          throw new Error(message);
        }

        // Handle network errors
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to API server at ${this.baseURL}. Please ensure the server is running.`);
        }

        if (error.code === 'ENOTFOUND') {
          throw new Error(`Cannot resolve API server hostname. Please check your connection and API URL.`);
        }

        throw new Error(error.message || 'An unknown error occurred');
      }
    );
  }

  /**
   * Load authentication token from storage
   */
  loadAuthToken() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const authData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        if (authData.token && authData.expiresAt && new Date() < new Date(authData.expiresAt)) {
          this.client.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
          this.authData = authData;
          return true;
        } else {
          // Token expired, remove it
          this.clearAuthToken();
        }
      }
    } catch (error) {
      if (this.debug) {
        console.error(chalk.yellow('[API] Failed to load auth token:'), error.message);
      }
      this.clearAuthToken();
    }
    return false;
  }

  /**
   * Save authentication token to storage
   */
  saveAuthToken(token, user, expiresIn = 86400) { // Default 24 hours
    try {
      // Ensure directory exists
      const tokenDir = path.dirname(this.tokenPath);
      if (!fs.existsSync(tokenDir)) {
        fs.mkdirSync(tokenDir, { recursive: true });
      }

      const authData = {
        token,
        user,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      fs.writeFileSync(this.tokenPath, JSON.stringify(authData, null, 2));

      // Set token in headers
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      this.authData = authData;

      return true;
    } catch (error) {
      console.error(chalk.red('Failed to save authentication token:'), error.message);
      return false;
    }
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
    } catch (error) {
      // Ignore errors when clearing token
    }

    delete this.client.defaults.headers.common['Authorization'];
    this.authData = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.authData;
  }

  /**
   * Get current user information
   */
  getCurrentUser() {
    return this.authData?.user || null;
  }

  // Authentication APIs
  async login(email, password) {
    const response = await this.client.post('/auth/login', { email, password });

    if (response.data.status === 'success' && response.data.data.token) {
      const { token, user } = response.data.data;
      this.saveAuthToken(token, user);
      return { user, token };
    }

    throw new Error('Login failed: Invalid response format');
  }

  async register(username, email, password) {
    const response = await this.client.post('/auth/register', { username, email, password });

    if (response.data.status === 'success' && response.data.data.token) {
      const { token, user } = response.data.data;
      this.saveAuthToken(token, user);
      return { user, token };
    }

    throw new Error('Registration failed: Invalid response format');
  }

  logout() {
    this.clearAuthToken();
    return Promise.resolve();
  }

  // Movie APIs
  async getMovies(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await this.client.get(`/movies?${params}`);
    return response.data.data;
  }

  async searchMovies(query, limit = 10) {
    const response = await this.client.get(`/movies/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
  }

  async getMovie(id, includeShows = false) {
    const endpoint = includeShows ? `/movies/${id}/shows` : `/movies/${id}`;
    const response = await this.client.get(endpoint);
    return response.data.data;
  }

  async getGenres() {
    const response = await this.client.get('/movies/genres');
    return response.data.data;
  }

  async getLanguages() {
    const response = await this.client.get('/movies/languages');
    return response.data.data;
  }

  // Show APIs
  async getShows(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await this.client.get(`/shows?${params}`);
    return response.data.data;
  }

  async getUpcomingShows(days = 7, limit = 20) {
    const response = await this.client.get(`/shows/upcoming?days=${days}&limit=${limit}`);
    return response.data.data;
  }

  async getShow(id) {
    const response = await this.client.get(`/shows/${id}`);
    return response.data.data;
  }

  async getAvailableSeats(showId) {
    const response = await this.client.get(`/shows/${showId}/seats`);
    return response.data.data;
  }

  // Theatre APIs
  async getTheatres(location = null) {
    const url = location ? `/theatres/location/${encodeURIComponent(location)}` : '/theatres';
    const response = await this.client.get(url);
    return response.data.data;
  }

  async getTheatre(id) {
    const response = await this.client.get(`/theatres/${id}`);
    return response.data.data;
  }

  async getTheatreShows(theatreId, date = null) {
    const url = `/theatres/${theatreId}/shows` + (date ? `?date=${date}` : '');
    const response = await this.client.get(url);
    return response.data.data;
  }

  // Booking APIs
  async getBookings(filters = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required. Please login first.');
    }

    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await this.client.get(`/bookings/my-bookings?${params}`);
    return response.data.data;
  }

  async getBooking(id) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await this.client.get(`/bookings/${id}`);
    return response.data.data;
  }

  async createBooking(showId, seatIds, paymentMethod) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await this.client.post('/bookings', {
      showId: parseInt(showId),
      seatIds: Array.isArray(seatIds) ? seatIds.map(id => parseInt(id)) : [parseInt(seatIds)],
      paymentMethod: paymentMethod.toUpperCase()
    });

    return response.data.data;
  }

  async cancelBooking(bookingId) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required. Please login first.');
    }

    const response = await this.client.put(`/bookings/${bookingId}/cancel`);
    return response.data.data;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

module.exports = APIClient;