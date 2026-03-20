const { query } = require('../config/database');
const AppError = require('../utils/AppError');

// Show model - handles database operations for shows table
class Show {

  // Find all shows with optional filters
  // Supports filtering by movieId, theatreId, date range
  static async findAll(filters = {}) {
    let sql = `
      SELECT
        s.show_id,
        s.show_time,
        s.price,
        s.created_at,
        s.updated_at,
        m.movie_id,
        m.title as movie_title,
        m.duration as movie_duration,
        m.genre as movie_genre,
        m.language as movie_language,
        t.theatre_id,
        t.name as theatre_name,
        t.location as theatre_location,
        sc.screen_id,
        sc.screen_number,
        sc.total_seats
      FROM Shows s
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE s.is_deleted = FALSE
    `;

    const params = [];

    // Filter by movie ID
    if (filters.movieId) {
      sql += ' AND s.movie_id = ?';
      params.push(filters.movieId);
    }

    // Filter by theatre ID
    if (filters.theatreId) {
      sql += ' AND t.theatre_id = ?';
      params.push(filters.theatreId);
    }

    // Filter by specific date
    if (filters.date) {
      sql += ' AND DATE(s.show_time) = ?';
      params.push(filters.date);
    }

    // Filter by date range (startDate to endDate)
    if (filters.startDate && filters.endDate) {
      sql += ' AND DATE(s.show_time) BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      sql += ' AND DATE(s.show_time) >= ?';
      params.push(filters.startDate);
    } else if (filters.endDate) {
      sql += ' AND DATE(s.show_time) <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY s.show_time ASC';

    return await query(sql, params);
  }

  // Find show by ID with full details (JOIN with Movie, Theatre, Screen)
  static async findById(id) {
    const sql = `
      SELECT
        s.show_id,
        s.show_time,
        s.price,
        s.created_at,
        s.updated_at,
        m.movie_id,
        m.title as movie_title,
        m.description as movie_description,
        m.duration as movie_duration,
        m.genre as movie_genre,
        m.language as movie_language,
        m.rating as movie_rating,
        m.release_date as movie_release_date,
        t.theatre_id,
        t.name as theatre_name,
        t.location as theatre_location,
        t.city as theatre_city,
        sc.screen_id,
        sc.screen_number,
        sc.total_seats,
        sc.screen_type
      FROM Shows s
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE s.show_id = ? AND s.is_deleted = FALSE
    `;

    const shows = await query(sql, [id]);
    return shows.length > 0 ? shows[0] : null;
  }

  // Find shows by movie ID
  static async findByMovie(movieId) {
    const sql = `
      SELECT
        s.show_id,
        s.show_time,
        s.price,
        t.theatre_id,
        t.name as theatre_name,
        t.location as theatre_location,
        t.city as theatre_city,
        sc.screen_id,
        sc.screen_number,
        sc.screen_type
      FROM Shows s
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE s.movie_id = ? AND s.is_deleted = FALSE
      ORDER BY s.show_time ASC
    `;

    return await query(sql, [movieId]);
  }

  // Find shows by theatre ID
  static async findByTheatre(theatreId) {
    const sql = `
      SELECT
        s.show_id,
        s.show_time,
        s.price,
        m.movie_id,
        m.title as movie_title,
        m.duration as movie_duration,
        m.genre as movie_genre,
        m.language as movie_language,
        m.rating as movie_rating,
        sc.screen_id,
        sc.screen_number,
        sc.screen_type
      FROM Shows s
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      WHERE sc.theatre_id = ? AND s.is_deleted = FALSE
      ORDER BY s.show_time ASC
    `;

    return await query(sql, [theatreId]);
  }

  // Find upcoming shows for next N days (default 7 days)
  static async findUpcoming(days = 7) {
    const sql = `
      SELECT
        s.show_id,
        s.show_time,
        s.price,
        m.movie_id,
        m.title as movie_title,
        m.duration as movie_duration,
        m.genre as movie_genre,
        m.language as movie_language,
        m.rating as movie_rating,
        t.theatre_id,
        t.name as theatre_name,
        t.location as theatre_location,
        t.city as theatre_city,
        sc.screen_id,
        sc.screen_number,
        sc.screen_type
      FROM Shows s
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      INNER JOIN Screens sc ON s.screen_id = sc.screen_id
      INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE s.show_time >= NOW()
        AND s.show_time <= DATE_ADD(NOW(), INTERVAL ? DAY)
        AND s.is_deleted = FALSE
      ORDER BY s.show_time ASC
    `;

    return await query(sql, [days]);
  }

  // Create new show
  // Validates no overlapping shows in same screen before insertion
  static async create(showData) {
    const { movie_id, screen_id, show_time, price } = showData;

    // Get movie duration to check for overlaps
    const movieSql = 'SELECT duration FROM Movies WHERE movie_id = ?';
    const movies = await query(movieSql, [movie_id]);

    if (movies.length === 0) {
      throw new AppError('Movie not found', 404);
    }

    const movieDuration = movies[0].duration;

    // Check screen exists
    const screenSql = 'SELECT screen_id FROM Screens WHERE screen_id = ?';
    const screens = await query(screenSql, [screen_id]);

    if (screens.length === 0) {
      throw new AppError('Screen not found', 404);
    }

    // Check for overlapping shows
    const hasOverlap = await this.checkOverlap(screen_id, show_time, movieDuration);
    if (hasOverlap) {
      throw new AppError('Show time overlaps with existing show in this screen', 409);
    }

    // Insert new show - using prepared statement
    const sql = `
      INSERT INTO Shows (movie_id, screen_id, show_time, price)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [movie_id, screen_id, show_time, price]);

    // Return newly created show with full details
    return await this.findById(result.insertId);
  }

  // Update show details
  static async update(id, showData) {
    const { movie_id, screen_id, show_time, price } = showData;

    // Check if show exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError('Show not found', 404);
    }

    // If show_time or screen_id is being updated, check for overlaps
    if (show_time || screen_id) {
      const finalScreenId = screen_id || existing.screen_id;
      const finalShowTime = show_time || existing.show_time;

      // Get movie duration
      const finalMovieId = movie_id || existing.movie_id;
      const movieSql = 'SELECT duration FROM Movies WHERE movie_id = ?';
      const movies = await query(movieSql, [finalMovieId]);

      if (movies.length === 0) {
        throw new AppError('Movie not found', 404);
      }

      const movieDuration = movies[0].duration;

      // Check overlaps (excluding current show)
      const hasOverlap = await this.checkOverlap(
        finalScreenId,
        finalShowTime,
        movieDuration,
        id
      );

      if (hasOverlap) {
        throw new AppError('Updated show time overlaps with existing show in this screen', 409);
      }
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (movie_id !== undefined) {
      updates.push('movie_id = ?');
      params.push(movie_id);
    }
    if (screen_id !== undefined) {
      updates.push('screen_id = ?');
      params.push(screen_id);
    }
    if (show_time !== undefined) {
      updates.push('show_time = ?');
      params.push(show_time);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }

    if (updates.length === 0) {
      return existing; // No updates to perform
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `
      UPDATE Shows
      SET ${updates.join(', ')}
      WHERE show_id = ? AND is_deleted = FALSE
    `;

    await query(sql, params);
    return await this.findById(id);
  }

  // Soft delete show
  static async softDelete(id) {
    // Check if show exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError('Show not found', 404);
    }

    // Check if there are any confirmed bookings
    const bookingSql = `
      SELECT COUNT(*) as count
      FROM Bookings
      WHERE show_id = ? AND status = 'CONFIRMED' AND is_deleted = FALSE
    `;
    const bookings = await query(bookingSql, [id]);

    if (bookings[0].count > 0) {
      throw new AppError('Cannot delete show with confirmed bookings', 400);
    }

    const sql = `
      UPDATE Shows
      SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE show_id = ?
    `;

    await query(sql, [id]);
    return { message: 'Show deleted successfully' };
  }

  // Check for overlapping shows in same screen
  // Returns true if overlap exists, false otherwise
  // Optional excludeShowId parameter to exclude current show when updating
  static async checkOverlap(screenId, showTime, movieDuration, excludeShowId = null) {
    // Calculate show end time (show_time + movie duration + 30 min cleanup buffer)
    const bufferMinutes = 30;

    let sql = `
      SELECT COUNT(*) as count
      FROM Shows s
      INNER JOIN Movies m ON s.movie_id = m.movie_id
      WHERE s.screen_id = ?
        AND s.is_deleted = FALSE
        AND (
          -- New show starts during existing show
          (? >= s.show_time AND ? < DATE_ADD(s.show_time, INTERVAL (m.duration + ?) MINUTE))
          OR
          -- New show ends during existing show
          (DATE_ADD(?, INTERVAL (? + ?) MINUTE) > s.show_time
           AND DATE_ADD(?, INTERVAL (? + ?) MINUTE) <= DATE_ADD(s.show_time, INTERVAL (m.duration + ?) MINUTE))
          OR
          -- New show completely contains existing show
          (? <= s.show_time AND DATE_ADD(?, INTERVAL (? + ?) MINUTE) >= DATE_ADD(s.show_time, INTERVAL (m.duration + ?) MINUTE))
        )
    `;

    const params = [
      screenId,
      showTime, showTime, bufferMinutes,
      showTime, movieDuration, bufferMinutes,
      showTime, movieDuration, bufferMinutes, bufferMinutes,
      showTime, showTime, movieDuration, bufferMinutes, bufferMinutes
    ];

    // Exclude current show when updating
    if (excludeShowId) {
      sql += ' AND s.show_id != ?';
      params.push(excludeShowId);
    }

    const result = await query(sql, params);
    return result[0].count > 0;
  }

  // Get available seats for a show using stored procedure
  static async getAvailableSeats(showId) {
    const sql = 'CALL sp_get_available_seats(?)';
    const result = await query(sql, [showId]);

    // Stored procedure returns result in first element
    const seats = result[0];

    // Check for error in result set
    if (seats.length > 0 && seats[0].seat_number === 'ERROR') {
      throw new AppError(seats[0].error_message, 404);
    }

    return seats;
  }
}

module.exports = Show;
