// Global Jest setup for unit tests
// This file runs before each unit test to provide common configuration

// Extend Jest matchers for better assertions
expect.extend({
  toBeValidBooking(received) {
    const pass =
      typeof received === 'object' &&
      received.booking_id &&
      received.user_id &&
      received.show_id &&
      received.total_amount &&
      received.status;

    return {
      message: () => pass
        ? `expected ${received} not to be a valid booking`
        : `expected ${received} to be a valid booking with required fields`,
      pass
    };
  },

  toBeValidUser(received) {
    const pass =
      typeof received === 'object' &&
      received.user_id &&
      received.username &&
      received.email &&
      received.role &&
      !received.password_hash; // Should not expose password hash

    return {
      message: () => pass
        ? `expected ${received} not to be a valid user`
        : `expected ${received} to be a valid user without password hash`,
      pass
    };
  },

  toBeValidShow(received) {
    const pass =
      typeof received === 'object' &&
      received.show_id &&
      received.movie_id &&
      received.screen_id &&
      received.show_time &&
      received.price;

    return {
      message: () => pass
        ? `expected ${received} not to be a valid show`
        : `expected ${received} to be a valid show with required fields`,
      pass
    };
  },

  toHaveValidTimestamp(received, field = 'created_at') {
    const timestamp = received[field];
    const pass = timestamp && !isNaN(Date.parse(timestamp));

    return {
      message: () => pass
        ? `expected ${field} not to be a valid timestamp`
        : `expected ${field} to be a valid timestamp, got ${timestamp}`,
      pass
    };
  },

  toBeWithinRange(received, min, max) {
    const pass = received >= min && received <= max;

    return {
      message: () => pass
        ? `expected ${received} not to be within range ${min}-${max}`
        : `expected ${received} to be within range ${min}-${max}`,
      pass
    };
  },

  toBeValidPrice(received) {
    const pass = typeof received === 'number' && received > 0 && received <= 10000;

    return {
      message: () => pass
        ? `expected ${received} not to be a valid price`
        : `expected ${received} to be a valid price (number > 0 and <= 10000)`,
      pass
    };
  },

  toBeValidSeatArray(received) {
    const pass = Array.isArray(received) && received.length > 0 &&
      received.every(seat =>
        typeof seat === 'object' &&
        seat.seat_id &&
        seat.seat_number &&
        seat.seat_type
      );

    return {
      message: () => pass
        ? `expected ${received} not to be a valid seat array`
        : `expected ${received} to be a valid array of seats with seat_id, seat_number, and seat_type`,
      pass
    };
  }
});

// Global test configuration
global.testConfig = {
  // Default test data
  validUser: {
    username: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'USER'
  },

  validAdmin: {
    username: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'ADMIN'
  },

  validMovie: {
    title: 'Test Movie',
    description: 'A test movie',
    duration_minutes: 120,
    genre: 'Action',
    language: 'English',
    release_date: '2024-01-01',
    rating: 'PG-13',
    poster_url: 'http://example.com/poster.jpg'
  },

  validTheatre: {
    name: 'Test Theatre',
    location: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    pincode: '12345',
    total_screens: 2
  },

  validScreen: {
    screen_number: 1,
    total_seats: 20,
    screen_type: 'Standard'
  },

  validShow: {
    show_time: '2026-03-25 10:00:00',
    price: 250.00
  },

  // Test timeouts
  timeouts: {
    unit: 5000,
    integration: 15000,
    stress: 60000
  },

  // Performance thresholds
  performance: {
    maxQueryTime: 200, // ms
    maxBookingTime: 1000, // ms
    maxConcurrentUsers: 100
  }
};

// Mock console for cleaner test output (optional)
if (process.env.NODE_ENV === 'test' && !process.env.TEST_VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Setup common test utilities
global.testUtils = {
  /**
   * Generate random test email
   */
  generateEmail: () => `test${Date.now()}${Math.random().toString(36).substr(2, 9)}@example.com`,

  /**
   * Generate random username
   */
  generateUsername: () => `testuser${Date.now()}${Math.random().toString(36).substr(2, 5)}`,

  /**
   * Sleep for specified milliseconds
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create date string for future show
   */
  futureDate: (daysFromNow = 1, hour = 10) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  },

  /**
   * Validate response structure
   */
  validateApiResponse: (response, expectedFields = []) => {
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response).toHaveProperty('data');
      expectedFields.forEach(field => {
        expect(response.data).toHaveProperty(field);
      });
    } else {
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('message');
    }
  }
};

// Error tracking for debugging
let testErrors = [];

beforeEach(() => {
  testErrors = [];
});

afterEach(() => {
  if (testErrors.length > 0) {
    console.error('Test completed with errors:', testErrors);
  }
});

// Global error handler for tests
process.on('unhandledRejection', (error) => {
  testErrors.push(error);
  console.error('Unhandled rejection in test:', error);
});

// Performance monitoring
global.performanceMonitor = {
  start: (label) => {
    global.performanceMonitor[label] = process.hrtime();
  },

  end: (label, maxTime = 1000) => {
    if (!global.performanceMonitor[label]) {
      throw new Error(`Performance monitor '${label}' was not started`);
    }

    const [seconds, nanoseconds] = process.hrtime(global.performanceMonitor[label]);
    const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);

    delete global.performanceMonitor[label];

    if (milliseconds > maxTime) {
      console.warn(`Performance warning: ${label} took ${milliseconds}ms (limit: ${maxTime}ms)`);
    }

    return milliseconds;
  }
};

console.log('✅ Jest unit test setup complete');