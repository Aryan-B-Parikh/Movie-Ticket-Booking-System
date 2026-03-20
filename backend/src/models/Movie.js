const { query } = require('../config/database');
const AppError = require('../utils/AppError');

// Movie model - handles database operations for Movies table
class Movie {

  // Find all movies with optional filters
  // Returns array of movies with pagination support
  static async findAll(filters = {}) {
    let sql = `
      SELECT movie_id, title, duration as duration, genre, language,
             release_date, created_at, updated_at
      FROM Movies
      WHERE is_deleted = FALSE
    `;

    const params = [];

    // Apply filters
    if (filters.genre) {
      sql += ' AND genre = ?';
      params.push(filters.genre);
    }

    if (filters.language) {
      sql += ' AND language = ?';
      params.push(filters.language);
    }

    if (filters.rating) {
      sql += ' AND rating = ?';
      params.push(filters.rating);
    }

    if (filters.search) {
      sql += ' AND (title LIKE ? OR genre LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Add ordering
    sql += ' ORDER BY created_at DESC';

    // Add pagination if provided
    if (filters.limit) {
      const limit = parseInt(filters.limit);
      const offset = filters.offset ? parseInt(filters.offset) : 0;
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    return await query(sql, params);
  }

  // Find movie by ID (active movies only)
  static async findById(movieId) {
    const sql = `
      SELECT movie_id, title, duration as duration, genre, language,
             release_date, created_at, updated_at
      FROM Movies
      WHERE movie_id = ? AND is_deleted = FALSE
    `;

    const movies = await query(sql, [movieId]);
    return movies.length > 0 ? movies[0] : null;
  }

  // Create new movie
  // Input validation should be done before calling this method
  static async create(movieData) {
    const {
      title,
      duration,
      genre,
      language,
      release_date
    } = movieData;

    // Check if movie with same title already exists (case insensitive)
    const existingMovie = await query(
      'SELECT movie_id FROM Movies WHERE LOWER(title) = LOWER(?) AND is_deleted = FALSE',
      [title]
    );

    if (existingMovie.length > 0) {
      throw new AppError('Movie with this title already exists', 400);
    }

    // Insert new movie - using prepared statement to prevent SQL injection
    const sql = `
      INSERT INTO Movies (title, duration, genre, language, release_date)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      title, duration, genre, language, release_date
    ]);

    // Return newly created movie
    return await this.findById(result.insertId);
  }

  // Update movie
  static async update(movieId, movieData) {
    // Check if movie exists and is not deleted
    const existingMovie = await this.findById(movieId);
    if (!existingMovie) {
      throw new AppError('Movie not found', 404);
    }

    // Check if title conflicts with another movie (if title is being updated)
    if (movieData.title && movieData.title !== existingMovie.title) {
      const titleConflict = await query(
        'SELECT movie_id FROM Movies WHERE LOWER(title) = LOWER(?) AND movie_id != ? AND is_deleted = FALSE',
        [movieData.title, movieId]
      );

      if (titleConflict.length > 0) {
        throw new AppError('Another movie with this title already exists', 400);
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const params = [];

    const allowedFields = ['title', 'duration', 'genre', 'language', 'release_date'];

    allowedFields.forEach(field => {
      if (movieData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(movieData[field]);
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(movieId);

    const sql = `
      UPDATE Movies
      SET ${updateFields.join(', ')}
      WHERE movie_id = ? AND is_deleted = FALSE
    `;

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      throw new AppError('Movie not found or already deleted', 404);
    }

    // Return updated movie
    return await this.findById(movieId);
  }

  // Soft delete movie
  static async softDelete(movieId) {
    // Check if movie exists and is not already deleted
    const existingMovie = await this.findById(movieId);
    if (!existingMovie) {
      throw new AppError('Movie not found', 404);
    }

    // Check if movie has active shows
    const activeShows = await query(
      'SELECT COUNT(*) as count FROM Shows WHERE movie_id = ? AND show_time > NOW()',
      [movieId]
    );

    if (activeShows[0].count > 0) {
      throw new AppError('Cannot delete movie with active shows. Cancel shows first.', 400);
    }

    const sql = `
      UPDATE Movies
      SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE movie_id = ? AND is_deleted = FALSE
    `;

    const result = await query(sql, [movieId]);

    if (result.affectedRows === 0) {
      throw new AppError('Movie not found or already deleted', 404);
    }

    return { message: 'Movie deleted successfully' };
  }

  // Search movies by title or genre
  static async search(searchQuery) {
    const sql = `
      SELECT movie_id, title, duration, genre, language,
             release_date, created_at, updated_at
      FROM Movies
      WHERE (title LIKE ? OR genre LIKE ?)
      AND is_deleted = FALSE
      ORDER BY
        CASE
          WHEN title LIKE ? THEN 1
          WHEN genre LIKE ? THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 50
    `;

    const searchTerm = `%${searchQuery}%`;
    const exactTitleTerm = `${searchQuery}%`;

    return await query(sql, [
      searchTerm, searchTerm, searchTerm,
      exactTitleTerm, searchTerm
    ]);
  }

  // Get only active (non-deleted) movies
  static async findActive() {
    const sql = `
      SELECT movie_id, title, duration, genre, language,
             release_date, created_at, updated_at
      FROM Movies
      WHERE is_deleted = FALSE
      ORDER BY created_at DESC
    `;

    return await query(sql);
  }

  // Get movies by genre
  static async findByGenre(genre) {
    const sql = `
      SELECT movie_id, title, duration, genre, language,
             release_date, created_at, updated_at
      FROM Movies
      WHERE genre = ? AND is_deleted = FALSE
      ORDER BY created_at DESC
    `;

    return await query(sql, [genre]);
  }

  // Get movies by language
  static async findByLanguage(language) {
    const sql = `
      SELECT movie_id, title, duration, genre, language,
             release_date, created_at, updated_at
      FROM Movies
      WHERE language = ? AND is_deleted = FALSE
      ORDER BY created_at DESC
    `;

    return await query(sql, [language]);
  }

  // Get all distinct genres
  static async getGenres() {
    const sql = `
      SELECT DISTINCT genre
      FROM Movies
      WHERE is_deleted = FALSE AND genre IS NOT NULL
      ORDER BY genre
    `;

    const results = await query(sql);
    return results.map(row => row.genre);
  }

  // Get all distinct languages
  static async getLanguages() {
    const sql = `
      SELECT DISTINCT language
      FROM Movies
      WHERE is_deleted = FALSE AND language IS NOT NULL
      ORDER BY language
    `;

    const results = await query(sql);
    return results.map(row => row.language);
  }

  // Get movie with its shows (for detailed view)
  static async findWithShows(movieId) {
    const movie = await this.findById(movieId);
    if (!movie) {
      return null;
    }

    const showsSql = `
      SELECT
        s.show_id,
        s.show_time,
        s.price,
        sc.screen_number,
        sc.capacity,
        t.name as theatre_name,
        t.location as theatre_location
      FROM Shows s
      JOIN Screens sc ON s.screen_id = sc.screen_id
      JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE s.movie_id = ? AND s.show_time > NOW()
      ORDER BY s.show_time ASC
    `;

    const shows = await query(showsSql, [movieId]);

    return {
      ...movie,
      shows
    };
  }
}

module.exports = Movie;
