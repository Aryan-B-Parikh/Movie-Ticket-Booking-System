// Unit tests for Show model
// Tests show operations, overlap validation, and available seats functionality

const Show = require('../../../src/models/Show');
const { query } = require('../../../src/config/database');
const AppError = require('../../../src/utils/AppError');

// Mock the database module
jest.mock('../../../src/config/database');

describe('Show Model - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {

    it('should return all shows with full details', async () => {
      const mockShows = [
        {
          show_id: 1,
          show_time: '2026-03-25 10:00:00',
          price: 250.00,
          movie_id: 1,
          movie_title: 'Test Movie',
          movie_duration: 120,
          theatre_id: 1,
          theatre_name: 'Test Theatre',
          screen_id: 1,
          screen_number: 1,
          total_seats: 100
        }
      ];

      query.mockResolvedValue(mockShows);

      const shows = await Show.findAll();

      expect(shows).toEqual(mockShows);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM Shows s'),
        []
      );
    });

    it('should filter shows by movie ID', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({ movieId: 1 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.movie_id = ?'),
        [1]
      );
    });

    it('should filter shows by theatre ID', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({ theatreId: 1 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.theatre_id = ?'),
        [1]
      );
    });

    it('should filter shows by specific date', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({ date: '2026-03-25' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND DATE(s.show_time) = ?'),
        ['2026-03-25']
      );
    });

    it('should filter shows by date range', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({ startDate: '2026-03-25', endDate: '2026-03-27' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND DATE(s.show_time) BETWEEN ? AND ?'),
        ['2026-03-25', '2026-03-27']
      );
    });

    it('should filter shows by start date only', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({ startDate: '2026-03-25' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND DATE(s.show_time) >= ?'),
        ['2026-03-25']
      );
    });

    it('should filter shows by end date only', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({ endDate: '2026-03-27' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND DATE(s.show_time) <= ?'),
        ['2026-03-27']
      );
    });

    it('should exclude deleted shows', async () => {
      query.mockResolvedValue([]);

      await Show.findAll();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.is_deleted = FALSE'),
        []
      );
    });

    it('should order shows by show time ascending', async () => {
      query.mockResolvedValue([]);

      await Show.findAll();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY s.show_time ASC'),
        []
      );
    });

    it('should apply multiple filters together', async () => {
      query.mockResolvedValue([]);

      await Show.findAll({
        movieId: 1,
        theatreId: 2,
        date: '2026-03-25'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/AND s\.movie_id = \?.*AND t\.theatre_id = \?.*AND DATE\(s\.show_time\) = \?/s),
        [1, 2, '2026-03-25']
      );
    });
  });

  describe('findById()', () => {

    it('should return show with complete details', async () => {
      const mockShow = {
        show_id: 1,
        show_time: '2026-03-25 10:00:00',
        price: 250.00,
        movie_id: 1,
        movie_title: 'Test Movie',
        movie_description: 'A test movie',
        movie_duration: 120,
        movie_genre: 'Action',
        movie_rating: 'PG-13',
        theatre_id: 1,
        theatre_name: 'Test Theatre',
        theatre_location: '123 Main St',
        screen_id: 1,
        screen_number: 1,
        total_seats: 100,
        screen_type: 'Standard'
      };

      query.mockResolvedValue([mockShow]);

      const show = await Show.findById(1);

      expect(show).toEqual(mockShow);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.show_id = ? AND s.is_deleted = FALSE'),
        [1]
      );
    });

    it('should return null when show not found', async () => {
      query.mockResolvedValue([]);

      const show = await Show.findById(999);

      expect(show).toBeNull();
    });

    it('should include all related table details via JOINs', async () => {
      query.mockResolvedValue([]);

      await Show.findById(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/INNER JOIN Movies m.*INNER JOIN Screens sc.*INNER JOIN Theatres t/s),
        [1]
      );
    });
  });

  describe('findByMovie()', () => {

    it('should return shows for specific movie', async () => {
      const mockShows = [
        {
          show_id: 1,
          show_time: '2026-03-25 10:00:00',
          price: 250.00,
          theatre_id: 1,
          theatre_name: 'Theatre 1',
          screen_id: 1,
          screen_number: 1
        }
      ];

      query.mockResolvedValue(mockShows);

      const shows = await Show.findByMovie(1);

      expect(shows).toEqual(mockShows);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.movie_id = ? AND s.is_deleted = FALSE'),
        [1]
      );
    });

    it('should order shows by show time', async () => {
      query.mockResolvedValue([]);

      await Show.findByMovie(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY s.show_time ASC'),
        [1]
      );
    });
  });

  describe('findByTheatre()', () => {

    it('should return shows for specific theatre', async () => {
      const mockShows = [
        {
          show_id: 1,
          show_time: '2026-03-25 10:00:00',
          price: 250.00,
          movie_id: 1,
          movie_title: 'Test Movie',
          screen_id: 1,
          screen_number: 1
        }
      ];

      query.mockResolvedValue(mockShows);

      const shows = await Show.findByTheatre(1);

      expect(shows).toEqual(mockShows);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE sc.theatre_id = ? AND s.is_deleted = FALSE'),
        [1]
      );
    });
  });

  describe('findUpcoming()', () => {

    it('should return upcoming shows for default 7 days', async () => {
      const mockShows = [
        {
          show_id: 1,
          show_time: '2026-03-25 10:00:00',
          price: 250.00,
          movie_title: 'Test Movie'
        }
      ];

      query.mockResolvedValue(mockShows);

      const shows = await Show.findUpcoming();

      expect(shows).toEqual(mockShows);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.show_time >= NOW()'),
        [7]
      );
    });

    it('should filter upcoming shows for custom days', async () => {
      query.mockResolvedValue([]);

      await Show.findUpcoming(14);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.show_time <= DATE_ADD(NOW(), INTERVAL ? DAY)'),
        [14]
      );
    });

    it('should exclude deleted shows from upcoming', async () => {
      query.mockResolvedValue([]);

      await Show.findUpcoming();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.is_deleted = FALSE'),
        [7]
      );
    });
  });

  describe('create()', () => {

    const mockShowData = {
      movie_id: 1,
      screen_id: 1,
      show_time: '2026-03-25 10:00:00',
      price: 250.00
    };

    it('should create new show successfully', async () => {
      const mockMovie = [{ duration: 120 }];
      const mockScreen = [{ screen_id: 1 }];
      const mockCreatedShow = { show_id: 1, ...mockShowData };

      query.mockResolvedValueOnce(mockMovie);  // Movie query
      query.mockResolvedValueOnce(mockScreen); // Screen query
      query.mockResolvedValueOnce({ insertId: 1 }); // Insert query

      // Mock checkOverlap
      Show.checkOverlap = jest.fn().mockResolvedValue(false);
      Show.findById = jest.fn().mockResolvedValue(mockCreatedShow);

      const show = await Show.create(mockShowData);

      expect(show).toEqual(mockCreatedShow);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Shows'),
        [1, 1, '2026-03-25 10:00:00', 250.00]
      );
    });

    it('should throw error when movie not found', async () => {
      query.mockResolvedValueOnce([]); // No movie found

      await expect(Show.create(mockShowData)).rejects.toThrow(AppError);
      await expect(Show.create(mockShowData)).rejects.toThrow('Movie not found');
    });

    it('should throw error when screen not found', async () => {
      const mockMovie = [{ duration: 120 }];
      query.mockResolvedValueOnce(mockMovie);
      query.mockResolvedValueOnce([]); // No screen found

      await expect(Show.create(mockShowData)).rejects.toThrow(AppError);
      await expect(Show.create(mockShowData)).rejects.toThrow('Screen not found');
    });

    it('should check for show overlap before creation', async () => {
      const mockMovie = [{ duration: 120 }];
      const mockScreen = [{ screen_id: 1 }];

      query.mockResolvedValueOnce(mockMovie);
      query.mockResolvedValueOnce(mockScreen);

      Show.checkOverlap = jest.fn().mockResolvedValue(true); // Overlap detected

      await expect(Show.create(mockShowData)).rejects.toThrow(AppError);
      await expect(Show.create(mockShowData)).rejects.toThrow('Show time overlaps with existing show');

      expect(Show.checkOverlap).toHaveBeenCalledWith(1, '2026-03-25 10:00:00', 120);
    });

    it('should proceed when no overlap detected', async () => {
      const mockMovie = [{ duration: 120 }];
      const mockScreen = [{ screen_id: 1 }];
      const mockCreatedShow = { show_id: 1, ...mockShowData };

      query.mockResolvedValueOnce(mockMovie);
      query.mockResolvedValueOnce(mockScreen);
      query.mockResolvedValueOnce({ insertId: 1 });

      Show.checkOverlap = jest.fn().mockResolvedValue(false);
      Show.findById = jest.fn().mockResolvedValue(mockCreatedShow);

      const show = await Show.create(mockShowData);

      expect(show).toEqual(mockCreatedShow);
    });
  });

  describe('update()', () => {

    const mockExistingShow = {
      show_id: 1,
      movie_id: 1,
      screen_id: 1,
      show_time: '2026-03-25 10:00:00',
      price: 250.00
    };

    it('should update show details successfully', async () => {
      const updateData = { price: 300.00 };
      const mockUpdatedShow = { ...mockExistingShow, price: 300.00 };

      Show.findById = jest.fn()
        .mockResolvedValueOnce(mockExistingShow)  // Check existing
        .mockResolvedValueOnce(mockUpdatedShow);  // Return updated

      query.mockResolvedValueOnce({}); // Update query

      const show = await Show.update(1, updateData);

      expect(show).toEqual(mockUpdatedShow);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Shows'),
        [300.00, 1]
      );
    });

    it('should throw error when show not found', async () => {
      Show.findById = jest.fn().mockResolvedValue(null);

      await expect(Show.update(999, { price: 300.00 })).rejects.toThrow(AppError);
      await expect(Show.update(999, { price: 300.00 })).rejects.toThrow('Show not found');
    });

    it('should check overlap when updating show time', async () => {
      const updateData = { show_time: '2026-03-25 14:00:00' };
      const mockMovie = [{ duration: 120 }];

      Show.findById = jest.fn().mockResolvedValue(mockExistingShow);
      query.mockResolvedValueOnce(mockMovie); // Movie duration query

      Show.checkOverlap = jest.fn().mockResolvedValue(true); // Overlap detected

      await expect(Show.update(1, updateData)).rejects.toThrow(AppError);
      await expect(Show.update(1, updateData)).rejects.toThrow('Updated show time overlaps');

      expect(Show.checkOverlap).toHaveBeenCalledWith(1, '2026-03-25 14:00:00', 120, 1);
    });

    it('should check overlap when updating screen', async () => {
      const updateData = { screen_id: 2 };
      const mockMovie = [{ duration: 120 }];

      Show.findById = jest.fn().mockResolvedValue(mockExistingShow);
      query.mockResolvedValueOnce(mockMovie);

      Show.checkOverlap = jest.fn().mockResolvedValue(false);
      query.mockResolvedValueOnce({}); // Update query
      Show.findById = jest.fn().mockResolvedValueOnce(mockExistingShow);

      await Show.update(1, updateData);

      expect(Show.checkOverlap).toHaveBeenCalledWith(2, '2026-03-25 10:00:00', 120, 1);
    });

    it('should build dynamic update query', async () => {
      const updateData = {
        movie_id: 2,
        price: 300.00
      };

      Show.findById = jest.fn()
        .mockResolvedValueOnce(mockExistingShow)
        .mockResolvedValueOnce({ ...mockExistingShow, ...updateData });

      query.mockResolvedValueOnce({});

      await Show.update(1, updateData);

      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE Shows\s+SET movie_id = \?, price = \?, updated_at = CURRENT_TIMESTAMP\s+WHERE show_id = \?/),
        [2, 300.00, 1]
      );
    });

    it('should return existing show when no updates provided', async () => {
      Show.findById = jest.fn().mockResolvedValue(mockExistingShow);

      const show = await Show.update(1, {});

      expect(show).toEqual(mockExistingShow);
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array));
    });

    it('should always update timestamp when making changes', async () => {
      const updateData = { price: 300.00 };

      Show.findById = jest.fn()
        .mockResolvedValueOnce(mockExistingShow)
        .mockResolvedValueOnce({ ...mockExistingShow, ...updateData });

      query.mockResolvedValueOnce({});

      await Show.update(1, updateData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });
  });

  describe('softDelete()', () => {

    it('should soft delete show successfully', async () => {
      const mockShow = { show_id: 1, movie_title: 'Test Movie' };

      Show.findById = jest.fn().mockResolvedValue(mockShow);
      query.mockResolvedValueOnce([{ count: 0 }]); // No confirmed bookings
      query.mockResolvedValueOnce({}); // Delete query

      const result = await Show.softDelete(1);

      expect(result).toEqual({ message: 'Show deleted successfully' });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Shows SET is_deleted = TRUE'),
        [1]
      );
    });

    it('should throw error when show not found', async () => {
      Show.findById = jest.fn().mockResolvedValue(null);

      await expect(Show.softDelete(999)).rejects.toThrow(AppError);
      await expect(Show.softDelete(999)).rejects.toThrow('Show not found');
    });

    it('should check for confirmed bookings before deletion', async () => {
      const mockShow = { show_id: 1 };

      Show.findById = jest.fn().mockResolvedValue(mockShow);

      await Show.softDelete(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as count FROM Bookings WHERE show_id = ? AND status = \'CONFIRMED\''),
        [1]
      );
    });

    it('should prevent deletion when confirmed bookings exist', async () => {
      const mockShow = { show_id: 1 };

      Show.findById = jest.fn().mockResolvedValue(mockShow);
      query.mockResolvedValueOnce([{ count: 5 }]); // 5 confirmed bookings

      await expect(Show.softDelete(1)).rejects.toThrow(AppError);
      await expect(Show.softDelete(1)).rejects.toThrow('Cannot delete show with confirmed bookings');
    });
  });

  describe('checkOverlap()', () => {

    it('should return false when no overlap exists', async () => {
      query.mockResolvedValue([{ count: 0 }]);

      const hasOverlap = await Show.checkOverlap(1, '2026-03-25 10:00:00', 120);

      expect(hasOverlap).toBe(false);
    });

    it('should return true when overlap exists', async () => {
      query.mockResolvedValue([{ count: 1 }]);

      const hasOverlap = await Show.checkOverlap(1, '2026-03-25 10:00:00', 120);

      expect(hasOverlap).toBe(true);
    });

    it('should include buffer time in overlap calculation', async () => {
      query.mockResolvedValue([{ count: 0 }]);

      await Show.checkOverlap(1, '2026-03-25 10:00:00', 120);

      // Should check with 30-minute buffer
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/INTERVAL \(m\.duration \+ \?\) MINUTE/g),
        expect.arrayContaining([30])
      );
    });

    it('should exclude current show when updating', async () => {
      query.mockResolvedValue([{ count: 0 }]);

      await Show.checkOverlap(1, '2026-03-25 10:00:00', 120, 5); // Exclude show ID 5

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.show_id != ?'),
        expect.arrayContaining([5])
      );
    });

    it('should check complex overlap scenarios', async () => {
      query.mockResolvedValue([{ count: 0 }]);

      await Show.checkOverlap(1, '2026-03-25 10:00:00', 120);

      const sql = query.mock.calls[0][0];

      // Should check for all overlap scenarios
      expect(sql).toMatch(/New show starts during existing show/);
      expect(sql).toMatch(/New show ends during existing show/);
      expect(sql).toMatch(/New show completely contains existing show/);
    });
  });

  describe('getAvailableSeats()', () => {

    it('should call stored procedure to get available seats', async () => {
      const mockSeats = [
        { seat_id: 1, seat_number: 'A1', seat_type: 'Regular' },
        { seat_id: 2, seat_number: 'A2', seat_type: 'Regular' }
      ];

      query.mockResolvedValue([mockSeats]); // Stored procedure returns result in array

      const seats = await Show.getAvailableSeats(1);

      expect(seats).toEqual(mockSeats);
      expect(query).toHaveBeenCalledWith('CALL sp_get_available_seats(?)', [1]);
    });

    it('should handle stored procedure errors', async () => {
      const errorResult = [
        [{ seat_number: 'ERROR', error_message: 'Show not found' }]
      ];

      query.mockResolvedValue(errorResult);

      await expect(Show.getAvailableSeats(999)).rejects.toThrow(AppError);
      await expect(Show.getAvailableSeats(999)).rejects.toThrow('Show not found');
    });

    it('should return empty array when no seats available', async () => {
      query.mockResolvedValue([[]]);

      const seats = await Show.getAvailableSeats(1);

      expect(seats).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {

    it('should handle database connection errors', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      await expect(Show.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid date formats in filters', async () => {
      query.mockResolvedValue([]);

      // Should pass through invalid dates to database (let DB handle validation)
      await Show.findAll({ date: 'invalid-date' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND DATE(s.show_time) = ?'),
        ['invalid-date']
      );
    });

    it('should handle null values in update data', async () => {
      const mockShow = { show_id: 1, price: 250 };

      Show.findById = jest.fn()
        .mockResolvedValueOnce(mockShow)
        .mockResolvedValueOnce(mockShow);

      query.mockResolvedValue({});

      await Show.update(1, { price: null });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('price = ?'),
        [null, 1]
      );
    });

    it('should handle very long movie durations in overlap check', async () => {
      query.mockResolvedValue([{ count: 0 }]);

      // Test with 10-hour movie (600 minutes)
      await Show.checkOverlap(1, '2026-03-25 10:00:00', 600);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([1, '2026-03-25 10:00:00', '2026-03-25 10:00:00', 30, '2026-03-25 10:00:00', 600, 30, '2026-03-25 10:00:00', 600, 30, 30, '2026-03-25 10:00:00', '2026-03-25 10:00:00', 600, 30, 30])
      );
    });

    it('should handle midnight show times in overlap check', async () => {
      query.mockResolvedValue([{ count: 0 }]);

      await Show.checkOverlap(1, '2026-03-25 00:00:00', 120);

      expect(query).toHaveBeenCalledTimes(1);
    });
  });
});