// Enhanced test data factory and database utilities
// Provides comprehensive test data creation and management for all test types

const bcrypt = require('bcrypt');
const { query, transaction } = require('../../src/config/database');

/**
 * Factory for creating test data with realistic variations
 */
class TestDataFactory {

  /**
   * Create multiple test users with different roles and attributes
   * @param {number} count - Number of users to create
   * @param {Object} overrides - Override default values
   * @returns {Promise<Array>} Array of created users
   */
  static async createUsers(count = 5, overrides = {}) {
    const users = [];
    const roles = ['USER', 'ADMIN'];
    const baseEmail = overrides.baseEmail || 'testuser';

    for (let i = 0; i < count; i++) {
      const userData = {
        username: `Test User ${i + 1}`,
        email: `${baseEmail}${i + 1}${Date.now()}@example.com`,
        password: 'password123',
        role: roles[i % 2] || 'USER',
        ...overrides
      };

      const user = await this.createUser(userData);
      users.push(user);
    }

    return users;
  }

  /**
   * Create a single test user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  static async createUser(userData = {}) {
    const {
      username = `Test User ${Date.now()}`,
      email = `test${Date.now()}${Math.random().toString(36).substr(2, 9)}@example.com`,
      password = 'password123',
      role = 'USER'
    } = userData;

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );

    return {
      user_id: result.insertId,
      username,
      email,
      password, // Return plain password for login tests
      role,
      created_at: new Date()
    };
  }

  /**
   * Create multiple test movies with various genres and ratings
   * @param {number} count - Number of movies to create
   * @returns {Promise<Array>} Array of created movies
   */
  static async createMovies(count = 5) {
    const movies = [];
    const genres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi'];
    const ratings = ['G', 'PG', 'PG-13', 'R'];
    const languages = ['English', 'Hindi', 'Tamil', 'Telugu'];

    for (let i = 0; i < count; i++) {
      const movieData = {
        title: `Test Movie ${i + 1}`,
        description: `Description for test movie ${i + 1}`,
        duration_minutes: 90 + (i * 15), // Varying durations
        genre: genres[i % genres.length],
        language: languages[i % languages.length],
        release_date: this.getRandomDate(),
        rating: ratings[i % ratings.length],
        poster_url: `http://example.com/poster${i + 1}.jpg`
      };

      const movie = await this.createMovie(movieData);
      movies.push(movie);
    }

    return movies;
  }

  /**
   * Create a single test movie
   * @param {Object} movieData - Movie data
   * @returns {Promise<Object>} Created movie
   */
  static async createMovie(movieData = {}) {
    const {
      title = `Test Movie ${Date.now()}`,
      description = 'A test movie description',
      duration_minutes = 120,
      genre = 'Action',
      language = 'English',
      release_date = '2024-01-01',
      rating = 'PG-13',
      poster_url = 'http://example.com/poster.jpg'
    } = movieData;

    const result = await query(
      `INSERT INTO Movies (title, description, duration_minutes, genre, language, release_date, rating, poster_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, duration_minutes, genre, language, release_date, rating, poster_url]
    );

    return {
      movie_id: result.insertId,
      title,
      description,
      duration_minutes,
      genre,
      language,
      release_date,
      rating,
      poster_url
    };
  }

  /**
   * Create multiple theatres with screens
   * @param {number} count - Number of theatres to create
   * @returns {Promise<Array>} Array of created theatres with screens
   */
  static async createTheatres(count = 3) {
    const theatres = [];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'];
    const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Maharashtra'];

    for (let i = 0; i < count; i++) {
      const theatreData = {
        name: `Test Theatre ${i + 1}`,
        location: `${i + 1}23 Main St`,
        city: cities[i % cities.length],
        state: states[i % states.length],
        pincode: `1234${i}`,
        total_screens: 2 + (i % 3) // 2-4 screens per theatre
      };

      const theatre = await this.createTheatre(theatreData);

      // Create screens for this theatre
      theatre.screens = await this.createScreensForTheatre(theatre.theatre_id, theatre.total_screens);
      theatres.push(theatre);
    }

    return theatres;
  }

  /**
   * Create a single theatre
   * @param {Object} theatreData - Theatre data
   * @returns {Promise<Object>} Created theatre
   */
  static async createTheatre(theatreData = {}) {
    const {
      name = `Test Theatre ${Date.now()}`,
      location = '123 Test St',
      city = 'Test City',
      state = 'Test State',
      pincode = '12345',
      total_screens = 2
    } = theatreData;

    const result = await query(
      'INSERT INTO Theatres (name, location, city, state, pincode, total_screens) VALUES (?, ?, ?, ?, ?, ?)',
      [name, location, city, state, pincode, total_screens]
    );

    return {
      theatre_id: result.insertId,
      name,
      location,
      city,
      state,
      pincode,
      total_screens
    };
  }

  /**
   * Create screens for a theatre
   * @param {number} theatreId - Theatre ID
   * @param {number} screenCount - Number of screens to create
   * @returns {Promise<Array>} Array of created screens
   */
  static async createScreensForTheatre(theatreId, screenCount = 2) {
    const screens = [];
    const screenTypes = ['Standard', 'IMAX', 'Premium'];

    for (let i = 1; i <= screenCount; i++) {
      const screenData = {
        screen_number: i,
        total_seats: 20 + (i * 10), // Varying seat counts
        screen_type: screenTypes[(i - 1) % screenTypes.length]
      };

      const screen = await this.createScreen(theatreId, screenData);
      screens.push(screen);
    }

    return screens;
  }

  /**
   * Create a single screen with seats
   * @param {number} theatreId - Theatre ID
   * @param {Object} screenData - Screen data
   * @returns {Promise<Object>} Created screen
   */
  static async createScreen(theatreId, screenData = {}) {
    const {
      screen_number = 1,
      total_seats = 30,
      screen_type = 'Standard'
    } = screenData;

    const result = await query(
      'INSERT INTO Screens (theatre_id, screen_number, total_seats, screen_type) VALUES (?, ?, ?, ?)',
      [theatreId, screen_number, total_seats, screen_type]
    );

    const screenId = result.insertId;

    // Create seats for this screen
    await this.createSeatsForScreen(screenId, total_seats);

    return {
      screen_id: screenId,
      theatre_id: theatreId,
      screen_number,
      total_seats,
      screen_type
    };
  }

  /**
   * Create seats for a screen
   * @param {number} screenId - Screen ID
   * @param {number} seatCount - Number of seats to create
   */
  static async createSeatsForScreen(screenId, seatCount = 30) {
    const seatTypes = ['Regular', 'Premium', 'VIP'];
    const rows = ['A', 'B', 'C', 'D', 'E'];
    const seats = [];

    for (let i = 1; i <= seatCount; i++) {
      const row = rows[Math.floor((i - 1) / 6)];
      const seatNumber = `${row}${((i - 1) % 6) + 1}`;

      // Distribute seat types: 60% Regular, 30% Premium, 10% VIP
      let seatType;
      if (i <= seatCount * 0.6) seatType = 'Regular';
      else if (i <= seatCount * 0.9) seatType = 'Premium';
      else seatType = 'VIP';

      seats.push(`(${screenId}, '${seatNumber}', '${seatType}')`);
    }

    await query(`INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES ${seats.join(', ')}`);
  }

  /**
   * Create multiple shows with various timings
   * @param {Array} movies - Array of movie objects
   * @param {Array} screens - Array of screen objects
   * @param {number} daysAhead - Days in future to create shows
   * @returns {Promise<Array>} Array of created shows
   */
  static async createShows(movies, screens, daysAhead = 7) {
    const shows = [];
    const timeSlots = ['10:00:00', '14:00:00', '18:00:00', '21:30:00'];
    const basePrices = [200, 250, 300, 350, 400];

    for (let day = 1; day <= daysAhead; day++) {
      for (const movie of movies) {
        for (const screen of screens) {
          for (const timeSlot of timeSlots) {
            // Not all combinations to avoid overlap
            if ((day + movie.movie_id + screen.screen_id) % 3 === 0) {
              const showData = {
                movie_id: movie.movie_id,
                screen_id: screen.screen_id,
                show_time: this.getFutureDateTime(day, timeSlot),
                price: basePrices[Math.floor(Math.random() * basePrices.length)]
              };

              try {
                const show = await this.createShow(showData);
                shows.push(show);
              } catch (error) {
                // Skip overlapping shows
                if (!error.message.includes('overlap')) {
                  throw error;
                }
              }
            }
          }
        }
      }
    }

    return shows;
  }

  /**
   * Create a single show
   * @param {Object} showData - Show data
   * @returns {Promise<Object>} Created show
   */
  static async createShow(showData = {}) {
    const {
      movie_id,
      screen_id,
      show_time = this.getFutureDateTime(1, '10:00:00'),
      price = 250.00
    } = showData;

    if (!movie_id || !screen_id) {
      throw new Error('movie_id and screen_id are required');
    }

    const result = await query(
      'INSERT INTO Shows (movie_id, screen_id, show_time, price) VALUES (?, ?, ?, ?)',
      [movie_id, screen_id, show_time, price]
    );

    return {
      show_id: result.insertId,
      movie_id,
      screen_id,
      show_time,
      price
    };
  }

  /**
   * Create test booking with transaction safety
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking
   */
  static async createTestBooking(bookingData) {
    const { user_id, show_id, seat_ids, total_amount } = bookingData;

    if (!user_id || !show_id || !seat_ids || seat_ids.length === 0) {
      throw new Error('user_id, show_id, and seat_ids are required');
    }

    return await transaction(async (connection) => {
      // Insert booking
      const [bookingResult] = await connection.query(
        'INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (?, ?, ?, ?)',
        [user_id, show_id, total_amount, 'CONFIRMED']
      );

      const bookingId = bookingResult.insertId;

      // Insert booking seats
      for (const seatId of seat_ids) {
        await connection.query(
          'INSERT INTO Booking_Seats (booking_id, seat_id) VALUES (?, ?)',
          [bookingId, seatId]
        );
      }

      // Insert payment record
      await connection.query(
        'INSERT INTO Payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
        [bookingId, total_amount, 'CREDIT_CARD', 'SUCCESS']
      );

      return {
        booking_id: bookingId,
        user_id,
        show_id,
        seat_ids,
        total_amount,
        status: 'CONFIRMED'
      };
    });
  }

  /**
   * Get available seats for a show
   * @param {number} showId - Show ID
   * @returns {Promise<Array>} Array of available seats
   */
  static async getAvailableSeats(showId) {
    const result = await query(
      `SELECT s.seat_id, s.seat_number, s.seat_type
       FROM Seats s
       WHERE s.screen_id = (SELECT screen_id FROM Shows WHERE show_id = ?)
       AND s.seat_id NOT IN (
         SELECT bs.seat_id
         FROM Booking_Seats bs
         JOIN Bookings b ON bs.booking_id = b.booking_id
         WHERE b.show_id = ? AND b.status = 'CONFIRMED'
       )
       ORDER BY s.seat_number`,
      [showId, showId]
    );

    return result;
  }

  /**
   * Create complete test environment
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Complete test data set
   */
  static async createCompleteTestData(options = {}) {
    const {
      userCount = 5,
      movieCount = 3,
      theatreCount = 2,
      daysAhead = 3
    } = options;

    console.log('📊 Creating complete test data set...');

    // Create users
    const users = await this.createUsers(userCount);
    console.log(`✓ Created ${users.length} users`);

    // Create movies
    const movies = await this.createMovies(movieCount);
    console.log(`✓ Created ${movies.length} movies`);

    // Create theatres with screens
    const theatres = await this.createTheatres(theatreCount);
    const allScreens = theatres.flatMap(t => t.screens);
    console.log(`✓ Created ${theatres.length} theatres with ${allScreens.length} screens`);

    // Create shows
    const shows = await this.createShows(movies, allScreens, daysAhead);
    console.log(`✓ Created ${shows.length} shows`);

    console.log('✅ Complete test data set created');

    return {
      users,
      movies,
      theatres,
      screens: allScreens,
      shows,
      admin: users.find(u => u.role === 'ADMIN'),
      regularUser: users.find(u => u.role === 'USER')
    };
  }

  /**
   * Utility methods
   */

  static getRandomDate() {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().slice(0, 10);
  }

  static getFutureDateTime(daysFromNow, time = '10:00:00') {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return `${date.toISOString().slice(0, 10)} ${time}`;
  }
}

/**
 * Database cleanup utilities
 */
class DatabaseCleaner {

  /**
   * Clean all test data from database
   */
  static async cleanAll() {
    await query('SET FOREIGN_KEY_CHECKS = 0');
    await query('DELETE FROM Payments');
    await query('DELETE FROM Booking_Seats');
    await query('DELETE FROM Bookings');
    await query('DELETE FROM Shows');
    await query('DELETE FROM Seats');
    await query('DELETE FROM Screens');
    await query('DELETE FROM Theatres');
    await query('DELETE FROM Movies');
    await query('DELETE FROM Users');
    await query('SET FOREIGN_KEY_CHECKS = 1');
  }

  /**
   * Clean specific booking and related data
   */
  static async cleanBooking(bookingId) {
    await query('DELETE FROM Payments WHERE booking_id = ?', [bookingId]);
    await query('DELETE FROM Booking_Seats WHERE booking_id = ?', [bookingId]);
    await query('DELETE FROM Bookings WHERE booking_id = ?', [bookingId]);
  }

  /**
   * Reset auto increment counters
   */
  static async resetCounters() {
    const tables = ['Users', 'Movies', 'Theatres', 'Screens', 'Seats', 'Shows', 'Bookings', 'Payments'];
    for (const table of tables) {
      await query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }
  }
}

/**
 * Wait utility for concurrency tests
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  TestDataFactory,
  DatabaseCleaner,
  wait,

  // Legacy aliases for backward compatibility
  createTestUser: TestDataFactory.createUser.bind(TestDataFactory),
  createTestMovie: TestDataFactory.createMovie.bind(TestDataFactory),
  createTestTheatre: TestDataFactory.createTheatre.bind(TestDataFactory),
  createTestScreen: TestDataFactory.createScreen.bind(TestDataFactory),
  createTestShow: TestDataFactory.createShow.bind(TestDataFactory),
  getAvailableSeats: TestDataFactory.getAvailableSeats.bind(TestDataFactory),
  createTestBooking: TestDataFactory.createTestBooking.bind(TestDataFactory),
  cleanupDatabase: DatabaseCleaner.cleanAll.bind(DatabaseCleaner),
  cleanupBooking: DatabaseCleaner.cleanBooking.bind(DatabaseCleaner)
};