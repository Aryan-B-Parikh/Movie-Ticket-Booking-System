// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// API Helper Class
class MovieAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = this.getAuthToken();
    }

    // Authentication token management
    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    setAuthToken(token) {
        localStorage.setItem('authToken', token);
        this.token = token;
    }

    removeAuthToken() {
        localStorage.removeItem('authToken');
        this.token = null;
    }

    // Get authentication headers
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic HTTP request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Authentication endpoints
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (response.token) {
            this.setAuthToken(response.token);
        }

        return response;
    }

    logout() {
        this.removeAuthToken();
        window.location.href = 'index.html';
    }

    // Movie endpoints
    async getMovies(filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });

        const queryString = params.toString();
        const endpoint = queryString ? `/movies?${queryString}` : '/movies';

        return this.request(endpoint);
    }

    async getMovie(movieId) {
        return this.request(`/movies/${movieId}`);
    }

    async getMovieWithShows(movieId) {
        return this.request(`/movies/${movieId}/shows`);
    }

    async searchMovies(query) {
        const params = new URLSearchParams({ q: query });
        return this.request(`/movies/search?${params.toString()}`);
    }

    async getGenres() {
        return this.request('/movies/genres');
    }

    async getLanguages() {
        return this.request('/movies/languages');
    }

    // Show endpoints
    async getShows(filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });

        const queryString = params.toString();
        const endpoint = queryString ? `/shows?${queryString}` : '/shows';

        return this.request(endpoint);
    }

    async getUpcomingShows(days = 7) {
        return this.request(`/shows/upcoming?days=${days}`);
    }

    async getShow(showId) {
        return this.request(`/shows/${showId}`);
    }

    async getAvailableSeats(showId) {
        return this.request(`/shows/${showId}/seats`);
    }

    // Booking endpoints
    async createBooking(bookingData) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    }

    async getUserBookings(filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });

        const queryString = params.toString();
        const endpoint = queryString ? `/bookings/my-bookings?${queryString}` : '/bookings/my-bookings';

        return this.request(endpoint);
    }

    async getBooking(bookingId) {
        return this.request(`/bookings/${bookingId}`);
    }

    async cancelBooking(bookingId) {
        return this.request(`/bookings/${bookingId}/cancel`, {
            method: 'PUT',
        });
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Decode JWT token (simple version - for production use a proper JWT library)
    decodeToken(token) {
        try {
            const payload = token.split('.')[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    // Get current user info from token
    getCurrentUser() {
        if (!this.token) return null;

        const decoded = this.decodeToken(this.token);
        return decoded ? {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
        } : null;
    }

    // Check if token is expired
    isTokenExpired() {
        if (!this.token) return true;

        const decoded = this.decodeToken(this.token);
        if (!decoded || !decoded.exp) return true;

        const now = Math.floor(Date.now() / 1000);
        return decoded.exp < now;
    }
}

// Error handling utilities
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Toast notification utility
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';

        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
    }).format(amount);
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

// Debounce utility for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize API instance
const api = new MovieAPI();

// Export for use in other scripts
window.MovieAPI = MovieAPI;
window.api = api;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDateTime = formatDateTime;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.debounce = debounce;