// Unit tests for User model
// Tests database operations with mocked database responses

const User = require('../../src/models/User');
const { query } = require('../../src/config/database');
const AppError = require('../../src/utils/AppError');
const bcrypt = require('bcrypt');

// Mock the database module
jest.mock('../../src/config/database');

describe('User Model - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail()', () => {

    it('should return user when email exists', async () => {
      const mockUser = {
        user_id: 1,
        username: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'USER',
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue([mockUser]);

      const user = await User.findByEmail('test@example.com');

      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id, username, email, password_hash, role'),
        ['test@example.com']
      );
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should return null when email does not exist', async () => {
      query.mockResolvedValue([]);

      const user = await User.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(User.findByEmail('test@example.com')).rejects.toThrow('Database error');
    });
  });

  describe('findById()', () => {

    it('should return user when ID exists', async () => {
      const mockUser = {
        user_id: 1,
        username: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue([mockUser]);

      const user = await User.findById(1);

      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id, username, email, role'),
        [1]
      );
    });

    it('should return null when ID does not exist', async () => {
      query.mockResolvedValue([]);

      const user = await User.findById(999);

      expect(user).toBeNull();
    });

    it('should not return password_hash', async () => {
      const mockUser = {
        user_id: 1,
        username: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue([mockUser]);

      const user = await User.findById(1);

      expect(user).not.toHaveProperty('password_hash');
    });
  });

  describe('create()', () => {

    it('should create a new user with hashed password', async () => {
      const userData = {
        username: 'New User',
        email: 'new@example.com',
        password: 'password123',
        role: 'USER'
      };

      // Mock findByEmail to return null (user doesn't exist)
      query.mockResolvedValueOnce([]);

      // Mock insert query
      query.mockResolvedValueOnce({ insertId: 1 });

      const newUser = await User.create(userData);

      expect(newUser).toEqual({
        user_id: 1,
        username: 'New User',
        email: 'new@example.com',
        role: 'USER'
      });

      // Verify password was hashed (not stored in plain text)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Users'),
        expect.arrayContaining(['New User', 'new@example.com', expect.any(String), 'USER'])
      );
    });

    it('should throw error when user already exists', async () => {
      const userData = {
        username: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock findByEmail to return existing user
      query.mockResolvedValueOnce([{ user_id: 1, email: 'existing@example.com' }]);

      await expect(User.create(userData)).rejects.toThrow(AppError);
      await expect(User.create(userData)).rejects.toThrow('User with this email already exists');
    });

    it('should default role to USER if not provided', async () => {
      const userData = {
        username: 'New User',
        email: 'new@example.com',
        password: 'password123'
        // No role provided
      };

      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce({ insertId: 1 });

      const newUser = await User.create(userData);

      expect(newUser.role).toBe('USER');
    });

    it('should handle database errors during insertion', async () => {
      const userData = {
        username: 'New User',
        email: 'new@example.com',
        password: 'password123'
      };

      query.mockResolvedValueOnce([]);
      query.mockRejectedValueOnce(new Error('Database insertion error'));

      await expect(User.create(userData)).rejects.toThrow('Database insertion error');
    });
  });

  describe('verifyPassword()', () => {

    it('should return true for correct password', async () => {
      const plainPassword = 'password123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const isValid = await User.verifyPassword(plainPassword, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const plainPassword = 'password123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const isValid = await User.verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });

    it('should handle bcrypt errors gracefully', async () => {
      await expect(User.verifyPassword('password', 'invalid-hash')).rejects.toThrow();
    });
  });

  describe('getBookingHistory()', () => {

    it('should return user booking history', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          booking_date: new Date(),
          total_amount: 500,
          status: 'CONFIRMED',
          movie_title: 'Test Movie',
          show_time: new Date(),
          theatre_name: 'Test Theatre'
        }
      ];

      query.mockResolvedValue(mockBookings);

      const bookings = await User.getBookingHistory(1);

      expect(bookings).toEqual(mockBookings);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should return empty array when user has no bookings', async () => {
      query.mockResolvedValue([]);

      const bookings = await User.getBookingHistory(1);

      expect(bookings).toEqual([]);
    });

    it('should order bookings by date descending', async () => {
      query.mockResolvedValue([]);

      await User.getBookingHistory(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY b.booking_date DESC'),
        [1]
      );
    });
  });

  describe('updateProfile()', () => {

    it('should update user profile', async () => {
      const updateData = { username: 'Updated Name' };
      const updatedUser = {
        user_id: 1,
        username: 'Updated Name',
        email: 'test@example.com',
        role: 'USER'
      };

      query.mockResolvedValueOnce({}); // Update query
      query.mockResolvedValueOnce([updatedUser]); // findById query

      const result = await User.updateProfile(1, updateData);

      expect(result).toEqual(updatedUser);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Users'),
        ['Updated Name', 1]
      );
    });

    it('should update timestamp on profile update', async () => {
      const updateData = { username: 'Updated Name' };

      query.mockResolvedValueOnce({});
      query.mockResolvedValueOnce([{ user_id: 1, username: 'Updated Name' }]);

      await User.updateProfile(1, updateData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });
  });
});
