const { query } = require('../config/database');
const AppError = require('../utils/AppError');

// Theatre model - handles database operations for Theatres table
class Theatre {

  // Find all theatres
  // Returns array of theatre objects
  static async findAll() {
    const sql = `
      SELECT
        theatre_id,
        name,
        location,
        city,
        state,
        pincode,
        created_at,
        updated_at
      FROM Theatres
      ORDER BY name ASC
    `;

    return await query(sql);
  }

  // Find theatre by ID with its screens
  // Returns theatre object with screens array or null if not found
  static async findById(theatreId) {
    // Get theatre details
    const theatreSql = `
      SELECT
        theatre_id,
        name,
        location,
        city,
        state,
        pincode,
        created_at,
        updated_at
      FROM Theatres
      WHERE theatre_id = ?
    `;

    const theatres = await query(theatreSql, [theatreId]);

    if (theatres.length === 0) {
      return null;
    }

    const theatre = theatres[0];

    // Get associated screens
    const screensSql = `
      SELECT
        screen_id,
        screen_number,
        total_seats,
        screen_type,
        created_at
      FROM Screens
      WHERE theatre_id = ?
      ORDER BY screen_number ASC
    `;

    const screens = await query(screensSql, [theatreId]);
    theatre.screens = screens;

    return theatre;
  }

  // Find theatres by location (city or general location)
  // Returns array of theatre objects
  static async findByLocation(location) {
    const sql = `
      SELECT
        theatre_id,
        name,
        location,
        city,
        state,
        pincode,
        created_at,
        updated_at
      FROM Theatres
      WHERE city LIKE ? OR location LIKE ?
      ORDER BY name ASC
    `;

    const searchPattern = `%${location}%`;
    return await query(sql, [searchPattern, searchPattern]);
  }

  // Create new theatre (admin only)
  // Input validation should be done before calling this method
  static async create(theatreData) {
    const { name, location, city, state, pincode } = theatreData;

    // Insert new theatre - using prepared statement to prevent SQL injection
    const sql = `
      INSERT INTO Theatres (name, location, city, state, pincode)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [name, location, city, state, pincode]);

    // Return newly created theatre
    return await this.findById(result.insertId);
  }

  // Update theatre details (admin only)
  static async update(theatreId, theatreData) {
    // Check if theatre exists
    const existingTheatre = await this.findById(theatreId);
    if (!existingTheatre) {
      throw new AppError('Theatre not found', 404);
    }

    const { name, location, city, state, pincode } = theatreData;

    const sql = `
      UPDATE Theatres
      SET
        name = ?,
        location = ?,
        city = ?,
        state = ?,
        pincode = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE theatre_id = ?
    `;

    await query(sql, [name, location, city, state, pincode, theatreId]);

    return await this.findById(theatreId);
  }

  // Get all screens for a specific theatre
  // Returns array of screen objects
  static async getScreens(theatreId) {
    // Check if theatre exists
    const theatre = await this.findById(theatreId);
    if (!theatre) {
      throw new AppError('Theatre not found', 404);
    }

    const sql = `
      SELECT
        screen_id,
        screen_number,
        total_seats,
        screen_type,
        created_at,
        updated_at
      FROM Screens
      WHERE theatre_id = ?
      ORDER BY screen_number ASC
    `;

    return await query(sql, [theatreId]);
  }

  // Delete theatre (CASCADE will remove associated screens)
  // Hard delete - use with caution
  static async delete(theatreId) {
    // Check if theatre exists
    const existingTheatre = await this.findById(theatreId);
    if (!existingTheatre) {
      throw new AppError('Theatre not found', 404);
    }

    // Check if theatre has any active shows
    const showCheckSql = `
      SELECT COUNT(*) as show_count
      FROM Shows s
      JOIN Screens sc ON s.screen_id = sc.screen_id
      WHERE sc.theatre_id = ?
    `;

    const showCheck = await query(showCheckSql, [theatreId]);

    if (showCheck[0].show_count > 0) {
      throw new AppError('Cannot delete theatre with existing shows', 400);
    }

    const sql = `DELETE FROM Theatres WHERE theatre_id = ?`;
    await query(sql, [theatreId]);

    return { message: 'Theatre deleted successfully' };
  }
}

module.exports = Theatre;
