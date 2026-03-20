const { query } = require('../config/database');
const AppError = require('../utils/AppError');

// Seat model - handles database operations for Seats table
class Seat {

  // Find all seats for a specific screen
  // Returns array of seat objects
  static async findByScreen(screenId) {
    const sql = `
      SELECT
        seat_id,
        screen_id,
        seat_number,
        seat_type,
        created_at
      FROM Seats
      WHERE screen_id = ?
      ORDER BY seat_number ASC
    `;

    return await query(sql, [screenId]);
  }

  // Create multiple seats in batch for a screen (admin only)
  // Validates unique seat_number per screen
  // seatData = [{ seat_number, seat_type }, ...]
  static async createBatch(screenId, seatDataArray) {
    // Verify screen exists
    const screenCheckSql = `SELECT screen_id FROM Screens WHERE screen_id = ?`;
    const screens = await query(screenCheckSql, [screenId]);

    if (screens.length === 0) {
      throw new AppError('Screen not found', 404);
    }

    if (!Array.isArray(seatDataArray) || seatDataArray.length === 0) {
      throw new AppError('Seat data must be a non-empty array', 400);
    }

    // Extract seat numbers for duplicate check
    const seatNumbers = seatDataArray.map(seat => seat.seat_number);

    // Check for duplicates within the input array itself
    const uniqueSeatNumbers = new Set(seatNumbers);
    if (uniqueSeatNumbers.size !== seatNumbers.length) {
      throw new AppError('Duplicate seat numbers in request', 400);
    }

    // Check if any seat numbers already exist for this screen
    const placeholders = seatNumbers.map(() => '?').join(',');
    const duplicateCheckSql = `
      SELECT seat_number
      FROM Seats
      WHERE screen_id = ? AND seat_number IN (${placeholders})
    `;

    const duplicates = await query(duplicateCheckSql, [screenId, ...seatNumbers]);

    if (duplicates.length > 0) {
      const duplicateSeatNumbers = duplicates.map(d => d.seat_number).join(', ');
      throw new AppError(`Seat numbers already exist: ${duplicateSeatNumbers}`, 400);
    }

    // Build batch insert query
    // INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES (?, ?, ?), (?, ?, ?), ...
    const valuePlaceholders = seatDataArray.map(() => '(?, ?, ?)').join(', ');
    const sql = `
      INSERT INTO Seats (screen_id, seat_number, seat_type)
      VALUES ${valuePlaceholders}
    `;

    // Flatten the parameters array
    const params = [];
    seatDataArray.forEach(seat => {
      params.push(screenId, seat.seat_number, seat.seat_type);
    });

    const result = await query(sql, params);

    return {
      message: 'Seats created successfully',
      seats_created: result.affectedRows,
      starting_seat_id: result.insertId
    };
  }

  // Find seat by ID
  static async findById(seatId) {
    const sql = `
      SELECT
        s.seat_id,
        s.screen_id,
        s.seat_number,
        s.seat_type,
        s.created_at,
        sc.screen_number,
        t.name as theatre_name
      FROM Seats s
      JOIN Screens sc ON s.screen_id = sc.screen_id
      JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE s.seat_id = ?
    `;

    const seats = await query(sql, [seatId]);
    return seats.length > 0 ? seats[0] : null;
  }
}

module.exports = Seat;
