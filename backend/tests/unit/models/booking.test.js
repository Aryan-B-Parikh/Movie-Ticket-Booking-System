// Unit tests for Booking model - CRITICAL COMPONENT
// Tests all booking operations with mocked database responses

const Booking = require('../../../src/models/Booking');
const { query, transaction } = require('../../../src/config/database');
const AppError = require('../../../src/utils/AppError');

// Mock the database module
jest.mock('../../../src/config/database');

describe('Booking Model - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {

    it('should return all bookings with default filters', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          user_id: 1,
          show_id: 1,
          total_amount: 500.00,
          status: 'CONFIRMED',
          booking_date: new Date(),
          username: 'Test User',
          movie_title: 'Test Movie',
          theatre_name: 'Test Theatre',
          seats_booked: 'A1 (Regular), A2 (Regular)',
          seat_count: 2
        }
      ];

      query.mockResolvedValue(mockBookings);

      const bookings = await Booking.findAll();

      expect(bookings).toEqual(mockBookings);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [50, 0] // Default limit and offset
      );
    });

    it('should apply userId filter', async () => {
      query.mockResolvedValue([]);

      await Booking.findAll({ userId: 1 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND b.user_id = ?'),
        expect.arrayContaining([1])
      );
    });

    it('should apply status filter', async () => {
      query.mockResolvedValue([]);

      await Booking.findAll({ status: 'CONFIRMED' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND b.status = ?'),
        expect.arrayContaining(['CONFIRMED'])
      );
    });

    it('should apply date range filters', async () => {
      query.mockResolvedValue([]);

      await Booking.findAll({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND DATE(b.booking_date) >= ?'),
        expect.arrayContaining(['2024-01-01', '2024-01-31'])
      );
    });

    it('should apply pagination', async () => {
      query.mockResolvedValue([]);

      await Booking.findAll({ limit: 10, offset: 20 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([10, 20])
      );
    });

    it('should exclude deleted bookings', async () => {
      query.mockResolvedValue([]);

      await Booking.findAll();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE b.is_deleted = FALSE'),
        expect.any(Array)
      );
    });
  });

  describe('findById()', () => {

    it('should return booking with complete details', async () => {
      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        show_id: 1,
        total_amount: 500.00,
        status: 'CONFIRMED',
        booking_date: new Date(),
        username: 'Test User',
        movie_title: 'Test Movie',
        theatre_name: 'Test Theatre',
        payment_id: 1,
        payment_status: 'SUCCESS'
      };

      query.mockResolvedValue([mockBooking]);

      const booking = await Booking.findById(1);

      expect(booking).toEqual(mockBooking);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM Bookings b'),
        [1]
      );
    });

    it('should return null when booking not found', async () => {
      query.mockResolvedValue([]);

      const booking = await Booking.findById(999);

      expect(booking).toBeNull();
    });

    it('should include payment details with LEFT JOIN', async () => {
      query.mockResolvedValue([]);

      await Booking.findById(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN Payments p ON b.booking_id = p.booking_id'),
        [1]
      );
    });
  });

  describe('findWithSeats()', () => {

    it('should return booking with seat details', async () => {
      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        show_id: 1,
        total_amount: 500.00,
        status: 'CONFIRMED'
      };

      const mockSeats = [
        { seat_id: 1, seat_number: 'A1', seat_type: 'Regular', row_number: 1, column_number: 1 },
        { seat_id: 2, seat_number: 'A2', seat_type: 'Regular', row_number: 1, column_number: 2 }
      ];

      // Mock findById call
      Booking.findById = jest.fn().mockResolvedValue(mockBooking);

      // Mock seats query
      query.mockResolvedValue(mockSeats);

      const bookingWithSeats = await Booking.findWithSeats(1);

      expect(bookingWithSeats).toEqual({
        ...mockBooking,
        seats: mockSeats
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM Booking_Seats bs'),
        [1]
      );
    });

    it('should return null when booking not found', async () => {
      Booking.findById = jest.fn().mockResolvedValue(null);

      const booking = await Booking.findWithSeats(999);

      expect(booking).toBeNull();
    });

    it('should order seats by row and column', async () => {
      const mockBooking = { booking_id: 1 };
      Booking.findById = jest.fn().mockResolvedValue(mockBooking);
      query.mockResolvedValue([]);

      await Booking.findWithSeats(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY st.row_number, st.column_number'),
        [1]
      );
    });
  });

  describe('findByUser()', () => {

    it('should return user bookings with default options', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          show_id: 1,
          total_amount: 500.00,
          status: 'CONFIRMED',
          movie_title: 'Test Movie',
          seat_count: 2,
          seat_numbers: 'A1,A2'
        }
      ];

      query.mockResolvedValue(mockBookings);

      const bookings = await Booking.findByUser(1);

      expect(bookings).toEqual(mockBookings);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE b.user_id = ?'),
        [1, 20, 0] // userId, default limit, default offset
      );
    });

    it('should apply status filter for user bookings', async () => {
      query.mockResolvedValue([]);

      await Booking.findByUser(1, { status: 'CONFIRMED' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND b.status = ?'),
        expect.arrayContaining([1, 'CONFIRMED'])
      );
    });

    it('should apply pagination for user bookings', async () => {
      query.mockResolvedValue([]);

      await Booking.findByUser(1, { limit: 5, offset: 10 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [1, 5, 10]
      );
    });

    it('should group seats by booking', async () => {
      query.mockResolvedValue([]);

      await Booking.findByUser(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP_CONCAT(st.seat_number ORDER BY st.seat_number)'),
        expect.any(Array)
      );
    });
  });

  describe('calculateTotal()', () => {

    it('should calculate total amount for regular seats', async () => {
      const mockShow = {
        show_id: 1,
        price: 250.00,
        screen_id: 1,
        is_deleted: false
      };

      const mockSeats = [
        { seat_id: 1, seat_type: 'Regular', screen_id: 1 },
        { seat_id: 2, seat_type: 'Regular', screen_id: 1 }
      ];

      query.mockResolvedValueOnce([mockShow]); // Show query
      query.mockResolvedValueOnce(mockSeats);   // Seats query

      const result = await Booking.calculateTotal([1, 2], 1);

      expect(result).toEqual({
        total_amount: 500.00,
        seat_count: 2,
        show_price: 250.00,
        breakdown: [
          { seat_id: 1, seat_type: 'Regular', base_price: 250.00, vip_premium: 0, seat_price: 250.00 },
          { seat_id: 2, seat_type: 'Regular', base_price: 250.00, vip_premium: 0, seat_price: 250.00 }
        ]
      });
    });

    it('should calculate total amount with VIP premium', async () => {
      const mockShow = {
        show_id: 1,
        price: 250.00,
        screen_id: 1,
        is_deleted: false
      };

      const mockSeats = [
        { seat_id: 1, seat_type: 'VIP', screen_id: 1 },
        { seat_id: 2, seat_type: 'Regular', screen_id: 1 }
      ];

      query.mockResolvedValueOnce([mockShow]);
      query.mockResolvedValueOnce(mockSeats);

      const result = await Booking.calculateTotal([1, 2], 1);

      expect(result.total_amount).toBe(550.00); // 300 (VIP) + 250 (Regular)
      expect(result.breakdown[0]).toEqual({
        seat_id: 1,
        seat_type: 'VIP',
        base_price: 250.00,
        vip_premium: 50.00,
        seat_price: 300.00
      });
    });

    it('should throw error for empty seat IDs array', async () => {
      await expect(Booking.calculateTotal([], 1)).rejects.toThrow(AppError);
      await expect(Booking.calculateTotal([], 1)).rejects.toThrow('Seat IDs array is required');
    });

    it('should throw error for non-array seat IDs', async () => {
      await expect(Booking.calculateTotal(null, 1)).rejects.toThrow(AppError);
      await expect(Booking.calculateTotal('invalid', 1)).rejects.toThrow(AppError);
    });

    it('should throw error when show not found', async () => {
      query.mockResolvedValue([]); // No show found

      await expect(Booking.calculateTotal([1, 2], 999)).rejects.toThrow(AppError);
      await expect(Booking.calculateTotal([1, 2], 999)).rejects.toThrow('Show not found');
    });

    it('should throw error when show is deleted', async () => {
      const mockShow = { show_id: 1, is_deleted: true };
      query.mockResolvedValue([mockShow]);

      await expect(Booking.calculateTotal([1, 2], 1)).rejects.toThrow(AppError);
      await expect(Booking.calculateTotal([1, 2], 1)).rejects.toThrow('Show is no longer available');
    });

    it('should throw error when seats are invalid', async () => {
      const mockShow = {
        show_id: 1,
        price: 250.00,
        screen_id: 1,
        is_deleted: false
      };

      query.mockResolvedValueOnce([mockShow]);
      query.mockResolvedValueOnce([]); // No seats found

      await expect(Booking.calculateTotal([1, 2], 1)).rejects.toThrow(AppError);
      await expect(Booking.calculateTotal([1, 2], 1)).rejects.toThrow('One or more seats are invalid');
    });

    it('should validate seats belong to correct screen', async () => {
      const mockShow = {
        show_id: 1,
        price: 250.00,
        screen_id: 1,
        is_deleted: false
      };

      const mockSeats = [
        { seat_id: 1, seat_type: 'Regular', screen_id: 2 } // Wrong screen
      ];

      query.mockResolvedValueOnce([mockShow]);
      query.mockResolvedValueOnce(mockSeats);

      await expect(Booking.calculateTotal([1], 1)).rejects.toThrow(AppError);
    });
  });

  describe('create()', () => {

    it('should create booking using stored procedure', async () => {
      const bookingData = {
        userId: 1,
        showId: 1,
        seatIds: [1, 2],
        paymentMethod: 'CREDIT_CARD',
        amount: 500.00
      };

      const mockConnection = {
        execute: jest.fn()
          .mockResolvedValueOnce([{}]) // sp_book_tickets call
          .mockResolvedValueOnce([[ // Output parameters
            { booking_id: 1, error_code: 'SUCCESS', error_message: null }
          ]])
      };

      transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      // Mock findWithSeats
      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        show_id: 1,
        total_amount: 500.00,
        status: 'CONFIRMED',
        seats: [
          { seat_id: 1, seat_number: 'A1' },
          { seat_id: 2, seat_number: 'A2' }
        ]
      };

      Booking.findWithSeats = jest.fn().mockResolvedValue(mockBooking);

      const result = await Booking.create(bookingData);

      expect(result).toEqual(mockBooking);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'CALL sp_book_tickets(?, ?, ?, ?, ?, @booking_id, @error_code, @error_message)',
        [1, 1, '1,2', 'CREDIT_CARD', 500.00]
      );
    });

    it('should throw error for missing required data', async () => {
      await expect(Booking.create({})).rejects.toThrow(AppError);
      await expect(Booking.create({})).rejects.toThrow('Missing required booking data');

      await expect(Booking.create({ userId: 1 })).rejects.toThrow(AppError);
      await expect(Booking.create({ userId: 1, showId: 1 })).rejects.toThrow(AppError);
      await expect(Booking.create({ userId: 1, showId: 1, seatIds: [] })).rejects.toThrow(AppError);
    });

    it('should handle stored procedure errors', async () => {
      const bookingData = {
        userId: 1,
        showId: 1,
        seatIds: [1, 2],
        paymentMethod: 'CREDIT_CARD',
        amount: 500.00
      };

      const mockConnection = {
        execute: jest.fn()
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([[
            { booking_id: null, error_code: 'SEAT_UNAVAILABLE', error_message: 'Selected seats are not available' }
          ]])
      };

      transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      await expect(Booking.create(bookingData)).rejects.toThrow(AppError);
      await expect(Booking.create(bookingData)).rejects.toThrow('Selected seats are not available');
    });

    it('should map stored procedure error codes to HTTP status codes', async () => {
      const bookingData = {
        userId: 1,
        showId: 1,
        seatIds: [1, 2],
        paymentMethod: 'CREDIT_CARD',
        amount: 500.00
      };

      const errorMappings = [
        { code: 'INVALID_USER', expectedStatus: 400 },
        { code: 'SHOW_NOT_FOUND', expectedStatus: 404 },
        { code: 'SEAT_UNAVAILABLE', expectedStatus: 409 },
        { code: 'DB_ERROR', expectedStatus: 500 }
      ];

      for (const mapping of errorMappings) {
        const mockConnection = {
          execute: jest.fn()
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[
              { booking_id: null, error_code: mapping.code, error_message: `Test ${mapping.code}` }
            ]])
        };

        transaction.mockImplementation(async (callback) => {
          return await callback(mockConnection);
        });

        try {
          await Booking.create(bookingData);
          fail(`Expected ${mapping.code} to throw an error`);
        } catch (error) {
          expect(error.statusCode).toBe(mapping.expectedStatus);
        }
      }
    });
  });

  describe('cancel()', () => {

    it('should cancel booking using stored procedure', async () => {
      const mockConnection = {
        execute: jest.fn()
          .mockResolvedValueOnce([{}]) // sp_cancel_booking call
          .mockResolvedValueOnce([[ // Output parameters
            { result: 'SUCCESS', message: 'Booking cancelled successfully' }
          ]])
      };

      transaction.mockImplementation(async (callback) => {
        return await callback(mockConnection);
      });

      const mockBooking = {
        booking_id: 1,
        status: 'CANCELLED',
        seats: []
      };

      Booking.findWithSeats = jest.fn().mockResolvedValue(mockBooking);

      const result = await Booking.cancel(1, 1);

      expect(result).toEqual({
        booking: mockBooking,
        message: 'Booking cancelled successfully'
      });

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'CALL sp_cancel_booking(?, ?, @result, @message)',
        [1, 1]
      );
    });

    it('should throw error for missing parameters', async () => {
      await expect(Booking.cancel()).rejects.toThrow(AppError);
      await expect(Booking.cancel()).rejects.toThrow('Booking ID and User ID are required');

      await expect(Booking.cancel(1)).rejects.toThrow(AppError);
      await expect(Booking.cancel(null, 1)).rejects.toThrow(AppError);
    });

    it('should handle cancellation errors from stored procedure', async () => {
      const errorMappings = [
        { code: 'NOT_FOUND', expectedStatus: 404 },
        { code: 'UNAUTHORIZED', expectedStatus: 403 },
        { code: 'ALREADY_CANCELLED', expectedStatus: 400 },
        { code: 'ERROR', expectedStatus: 500 }
      ];

      for (const mapping of errorMappings) {
        const mockConnection = {
          execute: jest.fn()
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[
              { result: mapping.code, message: `Test ${mapping.code}` }
            ]])
        };

        transaction.mockImplementation(async (callback) => {
          return await callback(mockConnection);
        });

        try {
          await Booking.cancel(1, 1);
          fail(`Expected ${mapping.code} to throw an error`);
        } catch (error) {
          expect(error.statusCode).toBe(mapping.expectedStatus);
        }
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {

    it('should handle database connection errors', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      await expect(Booking.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should handle malformed data gracefully', async () => {
      query.mockResolvedValue([{ invalid: 'data' }]);

      const bookings = await Booking.findAll();
      expect(bookings).toEqual([{ invalid: 'data' }]); // Should return as-is
    });

    it('should handle null values in calculations', async () => {
      const mockShow = {
        show_id: 1,
        price: null, // Null price
        screen_id: 1,
        is_deleted: false
      };

      query.mockResolvedValue([mockShow]);

      // Should handle null price gracefully
      await expect(Booking.calculateTotal([1], 1)).rejects.toThrow();
    });

    it('should validate amount precision in calculations', async () => {
      const mockShow = {
        show_id: 1,
        price: 250.00,
        screen_id: 1,
        is_deleted: false
      };

      const mockSeats = [
        { seat_id: 1, seat_type: 'VIP', screen_id: 1 } // Will add 50 premium
      ];

      query.mockResolvedValueOnce([mockShow]);
      query.mockResolvedValueOnce(mockSeats);

      const result = await Booking.calculateTotal([1], 1);

      // Should be exactly 300.00, not 300.0000001
      expect(result.total_amount).toBe(300.00);
      expect(Number.isInteger(result.total_amount * 100)).toBe(true); // Proper decimal precision
    });
  });
});