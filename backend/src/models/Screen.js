const { query } = require('../config/database');
const AppError = require('../utils/AppError');

// Screen model - handles database operations for Screens table
class Screen {

  // Find all screens for a specific theatre
  // Returns array of screen objects
  static async findByTheatre(theatreId) {
    const sql = `
      SELECT
        screen_id,
        theatre_id,
        screen_number,
        total_seats,
        screen_type,
        created_at
      FROM Screens
      WHERE theatre_id = ?
      ORDER BY screen_number ASC
    `;

    return await query(sql, [theatreId]);
  }

  // Find screen by ID with its seats
  // Returns screen object with seats array or null if not found
  static async findById(screenId) {
    // Get screen details
    const screenSql = `
      SELECT
        s.screen_id,
        s.theatre_id,
        s.screen_number,
        s.total_seats,
        s.screen_type,
        s.created_at,
        t.name as theatre_name,
        t.location as theatre_location
      FROM Screens s
      JOIN Theatres t ON s.theatre_id = t.theatre_id
      WHERE s.screen_id = ?
    `;

    const screens = await query(screenSql, [screenId]);

    if (screens.length === 0) {
      return null;
    }

    const screen = screens[0];

    // Get associated seats
    const seatsSql = `
      SELECT
        seat_id,
        seat_number,
        seat_type,
        created_at
      FROM Seats
      WHERE screen_id = ?
      ORDER BY seat_number ASC
    `;

    const seats = await query(seatsSql, [screenId]);
    screen.seats = seats;

    return screen;
  }

  // Create new screen (admin only)
  // Must belong to an existing theatre
  static async create(screenData) {
    const { theatre_id, screen_number, total_seats, screen_type } = screenData;

    // Verify theatre exists
    const theatreCheckSql = `SELECT theatre_id FROM Theatres WHERE theatre_id = ?`;
    const theatres = await query(theatreCheckSql, [theatre_id]);

    if (theatres.length === 0) {
      throw new AppError('Theatre not found', 404);
    }

    // Check if screen number already exists for this theatre
    const duplicateCheckSql = `
      SELECT screen_id
      FROM Screens
      WHERE theatre_id = ? AND screen_number = ?
    `;
    const duplicates = await query(duplicateCheckSql, [theatre_id, screen_number]);

    if (duplicates.length > 0) {
      throw new AppError('Screen number already exists for this theatre', 400);
    }

    // Insert new screen - using prepared statement to prevent SQL injection
    const sql = `
      INSERT INTO Screens (theatre_id, screen_number, total_seats, screen_type)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [theatre_id, screen_number, total_seats, screen_type]);

    // Return newly created screen
    return await this.findById(result.insertId);
  }

  // Update screen details (admin only)
  static async update(screenId, screenData) {
    // Check if screen exists
    const existingScreen = await this.findById(screenId);
    if (!existingScreen) {
      throw new AppError('Screen not found', 404);
    }

    // Build dynamic update query
    const updateFields = [];
    const params = [];

    const allowedFields = ['screen_number', 'total_seats', 'screen_type'];

    allowedFields.forEach(field => {
      if (screenData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(screenData[field]);
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    // Check for duplicate screen number if being updated
    if (screenData.screen_number && screenData.screen_number !== existingScreen.screen_number) {
      const duplicateCheckSql = `
        SELECT screen_id
        FROM Screens
        WHERE theatre_id = ? AND screen_number = ? AND screen_id != ?
      `;
      const duplicates = await query(duplicateCheckSql, [
        existingScreen.theatre_id,
        screenData.screen_number,
        screenId
      ]);

      if (duplicates.length > 0) {
        throw new AppError('Screen number already exists for this theatre', 400);
      }
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(screenId);

    const sql = `
      UPDATE Screens
      SET ${updateFields.join(', ')}
      WHERE screen_id = ?
    `;

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      throw new AppError('Screen not found', 404);
    }

    // Return updated screen
    return await this.findById(screenId);
  }

  // Get all seats for a specific screen
  // Returns array of seat objects
  static async getSeats(screenId) {
    // Check if screen exists
    const screen = await this.findById(screenId);
    if (!screen) {
      throw new AppError('Screen not found', 404);
    }

    const sql = `
      SELECT
        seat_id,
        seat_number,
        seat_type,
        created_at,
        updated_at
      FROM Seats
      WHERE screen_id = ?
      ORDER BY seat_number ASC
    `;

    return await query(sql, [screenId]);
  }

  // Delete screen (admin only)
  // CASCADE will remove associated seats
  static async delete(screenId) {
    // Check if screen exists
    const existingScreen = await this.findById(screenId);
    if (!existingScreen) {
      throw new AppError('Screen not found', 404);
    }

    // Check if screen has any shows
    const showCheckSql = `
      SELECT COUNT(*) as show_count
      FROM Shows
      WHERE screen_id = ?
    `;

    const showCheck = await query(showCheckSql, [screenId]);

    if (showCheck[0].show_count > 0) {
      throw new AppError('Cannot delete screen with existing shows', 400);
    }

    const sql = `DELETE FROM Screens WHERE screen_id = ?`;
    await query(sql, [screenId]);

    return { message: 'Screen deleted successfully' };
  }
}

module.exports = Screen;
