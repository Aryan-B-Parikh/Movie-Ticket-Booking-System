const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');

// User model - handles database operations for users table
class User {

  // Find user by email
  // Returns user object or null if not found
  static async findByEmail(email) {
    const sql = `
      SELECT user_id, name, email, password_hash, role, created_at, updated_at
      FROM Users
      WHERE email = ?
    `;

    const users = await query(sql, [email]);
    return users.length > 0 ? users[0] : null;
  }

  // Find user by ID
  static async findById(userId) {
    const sql = `
      SELECT user_id, name, email, role, created_at, updated_at
      FROM Users
      WHERE user_id = ?
    `;

    const users = await query(sql, [userId]);
    return users.length > 0 ? users[0] : null;
  }

  // Create new user with hashed password
  // Input validation should be done before calling this method
  static async create(userData) {
    const { name, email, password, role = 'USER' } = userData;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Hash password using bcrypt
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user - using prepared statement to prevent SQL injection
    const sql = `
      INSERT INTO Users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [name, email, passwordHash, role]);

    // Return newly created user (without password)
    return {
      user_id: result.insertId,
      name,
      email,
      role
    };
  }

  // Verify password against hash
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get user's booking history
  static async getBookingHistory(userId) {
    const sql = `
      SELECT
        b.booking_id,
        b.booking_date,
        b.total_amount,
        b.status,
        m.title as movie_title,
        s.show_time,
        t.name as theatre_name
      FROM Bookings b
      JOIN Shows s ON b.show_id = s.show_id
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Screens sc ON s.screen_id = sc.screen_id
      JOIN Theatres t ON sc.theatre_id = t.theatre_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC
    `;

    return await query(sql, [userId]);
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    const { name } = updateData;

    const sql = `
      UPDATE Users
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    await query(sql, [name, userId]);
    return await this.findById(userId);
  }
}

module.exports = User;
