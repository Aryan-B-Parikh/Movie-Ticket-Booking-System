// Test helper functions for common operations across test suites

const bcrypt = require('bcrypt');
const { pool } = require('../../src/config/database');

/**
 * Create a test user in the database
 * @param {Object} userData - User data (username, email, password, role)
 * @returns {Object} Created user object with user_id
 */
async function createTestUser(userData = {}) {
  const {
    username = 'Test User ' + Date.now(),
    email = `test${Date.now()}@example.com`,
    password = 'password123',
    role = 'USER'
  } = userData;

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, role]
  );

  return {
    user_id: result.insertId,
    username,
    email,
    password, // Return plain password for login tests
    role
  };
}

/**
 * Create a test movie in the database
 * @param {Object} movieData - Movie data
 * @returns {Object} Created movie object with movie_id
 */
async function createTestMovie(movieData = {}) {
  const {
    title = 'Test Movie ' + Date.now(),
    description = 'A test movie description',
    duration_minutes = 120,
    genre = 'Action',
    language = 'English',
    release_date = '2024-01-01',
    rating = 'PG-13',
    poster_url = 'http://example.com/poster.jpg'
  } = movieData;

  const [result] = await pool.query(
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
 * Create a test theatre in the database
 * @param {Object} theatreData - Theatre data
 * @returns {Object} Created theatre object with theatre_id
 */
async function createTestTheatre(theatreData = {}) {
  const {
    name = 'Test Theatre ' + Date.now(),
    location = '123 Test St',
    city = 'Test City',
    state = 'Test State',
    pincode = '12345',
    total_screens = 1
  } = theatreData;

  const [result] = await pool.query(
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
 * Create a test screen in the database
 * @param {Number} theatreId - Theatre ID
 * @param {Object} screenData - Screen data
 * @returns {Object} Created screen object with screen_id
 */
async function createTestScreen(theatreId, screenData = {}) {
  const {
    screen_number = 1,
    total_seats = 10,
    screen_type = 'Standard'
  } = screenData;

  const [result] = await pool.query(
    'INSERT INTO Screens (theatre_id, screen_number, total_seats, screen_type) VALUES (?, ?, ?, ?)',
    [theatreId, screen_number, total_seats, screen_type]
  );

  const screenId = result.insertId;

  // Create seats for this screen
  const seats = [];
  for (let i = 1; i <= total_seats; i++) {
    const seatType = i <= 5 ? 'Regular' : i <= 8 ? 'Premium' : 'VIP';
    seats.push(`(${screenId}, 'A${i}', '${seatType}')`);
  }

  await pool.query(`INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES ${seats.join(', ')}`);

  return {
    screen_id: screenId,
    theatre_id: theatreId,
    screen_number,
    total_seats,
    screen_type
  };
}

/**
 * Create a test show in the database
 * @param {Object} showData - Show data (movie_id, screen_id, show_time, price)
 * @returns {Object} Created show object with show_id
 */
async function createTestShow(showData = {}) {
  const {
    movie_id,
    screen_id,
    show_time = '2026-03-25 10:00:00',
    price = 250.00
  } = showData;

  if (!movie_id || !screen_id) {
    throw new Error('movie_id and screen_id are required');
  }

  const [result] = await pool.query(
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
 * Get available seats for a show
 * @param {Number} showId - Show ID
 * @returns {Array} Array of available seat objects
 */
async function getAvailableSeats(showId) {
  const [seats] = await pool.query(
    `SELECT s.seat_id, s.seat_number, s.seat_type
     FROM Seats s
     WHERE s.screen_id = (SELECT screen_id FROM Shows WHERE show_id = ?)
     AND s.seat_id NOT IN (
       SELECT bs.seat_id
       FROM Booking_Seats bs
       JOIN Bookings b ON bs.booking_id = b.booking_id
       WHERE b.show_id = ? AND b.status = 'CONFIRMED'
     )`,
    [showId, showId]
  );

  return seats;
}

/**
 * Create a test booking
 * @param {Object} bookingData - Booking data (user_id, show_id, seat_ids, total_amount)
 * @returns {Object} Created booking object with booking_id
 */
async function createTestBooking(bookingData) {
  const { user_id, show_id, seat_ids, total_amount } = bookingData;

  if (!user_id || !show_id || !seat_ids || seat_ids.length === 0) {
    throw new Error('user_id, show_id, and seat_ids are required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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

    await connection.commit();

    return {
      booking_id: bookingId,
      user_id,
      show_id,
      seat_ids,
      total_amount,
      status: 'CONFIRMED'
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Clean up test data from database
 * Deletes in proper order to respect foreign key constraints
 */
async function cleanupDatabase() {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('DELETE FROM Payments');
  await pool.query('DELETE FROM Booking_Seats');
  await pool.query('DELETE FROM Bookings');
  await pool.query('DELETE FROM Shows');
  await pool.query('DELETE FROM Seats');
  await pool.query('DELETE FROM Screens');
  await pool.query('DELETE FROM Theatres');
  await pool.query('DELETE FROM Movies');
  await pool.query('DELETE FROM Users');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Clean up specific booking and related data
 * @param {Number} bookingId - Booking ID to clean up
 */
async function cleanupBooking(bookingId) {
  await pool.query('DELETE FROM Payments WHERE booking_id = ?', [bookingId]);
  await pool.query('DELETE FROM Booking_Seats WHERE booking_id = ?', [bookingId]);
  await pool.query('DELETE FROM Bookings WHERE booking_id = ?', [bookingId]);
}

/**
 * Wait for a specified amount of time (for concurrency tests)
 * @param {Number} ms - Milliseconds to wait
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createTestUser,
  createTestMovie,
  createTestTheatre,
  createTestScreen,
  createTestShow,
  getAvailableSeats,
  createTestBooking,
  cleanupDatabase,
  cleanupBooking,
  wait
};
