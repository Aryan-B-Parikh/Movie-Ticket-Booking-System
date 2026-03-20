// Integration tests for Shows endpoints
// Tests show CRUD operations, filtering, and available seats functionality

const request = require('supertest');
const app = require('../../../src/app');
const { TestDataFactory, DatabaseCleaner } = require('../../helpers/testData');
const { ApiHelper, ResponseValidator } = require('../../helpers/requestHelpers');

describe('Shows Integration Tests', () => {

  let apiHelper;
  let regularUser, adminUser;
  let testMovie, testTheatre, testScreen;

  beforeAll(async () => {
    apiHelper = new ApiHelper(app);
  });

  beforeEach(async () => {
    await DatabaseCleaner.cleanAll();

    // Create test users
    regularUser = await TestDataFactory.createUser({
      email: 'user@example.com',
      role: 'USER'
    });

    adminUser = await TestDataFactory.createUser({
      email: 'admin@example.com',
      role: 'ADMIN'
    });

    // Login users
    await apiHelper.loginUser({
      email: regularUser.email,
      password: regularUser.password
    });

    await apiHelper.loginUser({
      email: adminUser.email,
      password: adminUser.password
    });

    // Create test infrastructure
    testMovie = await TestDataFactory.createMovie({
      title: 'Test Movie for Shows',
      duration_minutes: 120
    });

    const theatres = await TestDataFactory.createTheatres(1);
    testTheatre = theatres[0];
    testScreen = testTheatre.screens[0];
  });

  afterAll(async () => {
    await DatabaseCleaner.cleanAll();
  });

  describe('GET /api/shows', () => {

    beforeEach(async () => {
      // Create test shows
      await TestDataFactory.createShows([testMovie], [testScreen], 3);
    });

    it('should return all shows without authentication', async () => {
      const response = await apiHelper.get('/api/shows');

      ResponseValidator.validateArrayResponse(response, (show) => {
        expect(show).toHaveProperty('show_id');
        expect(show).toHaveProperty('show_time');
        expect(show).toHaveProperty('price');
        expect(show).toHaveProperty('movie_title');
        expect(show).toHaveProperty('theatre_name');
        expect(show.price).toBeValidPrice();
      });
    });

    it('should filter shows by movie ID', async () => {
      const response = await apiHelper.get(`/api/shows?movieId=${testMovie.movie_id}`);

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(show => {
        expect(show.movie_id).toBe(testMovie.movie_id);
      });
    });

    it('should filter shows by date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const response = await apiHelper.get(`/api/shows?date=${dateStr}`);

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(show => {
        expect(show.show_time.slice(0, 10)).toBe(dateStr);
      });
    });
  });

  describe('GET /api/shows/:id', () => {

    let testShow;

    beforeEach(async () => {
      testShow = await TestDataFactory.createShow({
        movie_id: testMovie.movie_id,
        screen_id: testScreen.screen_id,
        show_time: TestDataFactory.getFutureDateTime(1, '20:00:00'),
        price: 300.00
      });
    });

    it('should return specific show with details', async () => {
      const response = await apiHelper.get(`/api/shows/${testShow.show_id}`);

      ResponseValidator.validateSuccessResponse(response, [
        'show_id', 'show_time', 'price', 'movie_title', 'theatre_name'
      ]);

      const show = response.body.data;
      expect(show.show_id).toBe(testShow.show_id);
      expect(show.price).toBe(testShow.price);
    });

    it('should return 404 for non-existent show', async () => {
      const response = await apiHelper.get('/api/shows/999', null, 404);
      ResponseValidator.validateErrorResponse(response, 'Show not found');
    });
  });

  describe('GET /api/shows/:id/seats', () => {

    let testShow;

    beforeEach(async () => {
      testShow = await TestDataFactory.createShow({
        movie_id: testMovie.movie_id,
        screen_id: testScreen.screen_id,
        show_time: TestDataFactory.getFutureDateTime(1, '20:00:00'),
        price: 300.00
      });
    });

    it('should return available seats for show', async () => {
      const response = await apiHelper.get(`/api/shows/${testShow.show_id}/seats`);

      ResponseValidator.validateArrayResponse(response, (seat) => {
        expect(seat).toHaveProperty('seat_id');
        expect(seat).toHaveProperty('seat_number');
        expect(seat).toHaveProperty('seat_type');
      });

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should show fewer available seats after booking', async () => {
      // Get initial seat count
      const initialResponse = await apiHelper.getAvailableSeats(testShow.show_id);
      const initialCount = initialResponse.body.data.length;

      // Book some seats
      const seatsToBook = initialResponse.body.data.slice(0, 2).map(s => s.seat_id);
      await TestDataFactory.createTestBooking({
        user_id: regularUser.user_id,
        show_id: testShow.show_id,
        seat_ids: seatsToBook,
        total_amount: 600.00
      });

      // Check remaining seats
      const finalResponse = await apiHelper.getAvailableSeats(testShow.show_id);
      const finalCount = finalResponse.body.data.length;

      expect(finalCount).toBe(initialCount - 2);
    });
  });

  describe('POST /api/shows - Admin Only', () => {

    const validShowData = {
      movie_id: null, // Will be set in test
      screen_id: null, // Will be set in test
      show_time: TestDataFactory.getFutureDateTime(2, '18:00:00'),
      price: 350.00
    };

    beforeEach(() => {
      validShowData.movie_id = testMovie.movie_id;
      validShowData.screen_id = testScreen.screen_id;
    });

    it('should create new show as admin', async () => {
      const response = await apiHelper.createShow(validShowData, adminUser.user_id, 201);

      ResponseValidator.validateSuccessResponse(response, [
        'show_id', 'movie_id', 'screen_id', 'show_time', 'price'
      ]);

      const show = response.body.data;
      expect(show.movie_id).toBe(validShowData.movie_id);
      expect(show.screen_id).toBe(validShowData.screen_id);
      expect(show.price).toBe(validShowData.price);
    });

    it('should reject show creation as regular user', async () => {
      const response = await apiHelper.createShow(validShowData, regularUser.user_id, 403);
      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should validate required fields', async () => {
      const requiredFields = ['movie_id', 'screen_id', 'show_time', 'price'];

      for (const field of requiredFields) {
        const incompleteData = { ...validShowData };
        delete incompleteData[field];

        const response = await apiHelper.createShow(incompleteData, adminUser.user_id, 400);
        ResponseValidator.validateErrorResponse(response);
      }
    });

    it('should prevent overlapping shows', async () => {
      // Create first show
      await apiHelper.createShow(validShowData, adminUser.user_id, 201);

      // Try to create overlapping show (1 hour later, movie duration is 2 hours)
      const overlappingData = {
        ...validShowData,
        show_time: TestDataFactory.getFutureDateTime(2, '19:00:00') // 1 hour overlap
      };

      const response = await apiHelper.createShow(overlappingData, adminUser.user_id, 409);
      ResponseValidator.validateErrorResponse(response, 'overlaps');
    });
  });

  describe('PUT /api/shows/:id - Admin Only', () => {

    let testShow;

    beforeEach(async () => {
      testShow = await TestDataFactory.createShow({
        movie_id: testMovie.movie_id,
        screen_id: testScreen.screen_id,
        show_time: TestDataFactory.getFutureDateTime(3, '15:00:00'),
        price: 250.00
      });
    });

    it('should update show as admin', async () => {
      const updateData = {
        price: 400.00,
        show_time: TestDataFactory.getFutureDateTime(3, '16:00:00')
      };

      const response = await apiHelper.put(
        `/api/shows/${testShow.show_id}`,
        updateData,
        adminUser.user_id
      );

      ResponseValidator.validateSuccessResponse(response);
      const show = response.body.data;
      expect(show.price).toBe(updateData.price);
    });

    it('should reject update as regular user', async () => {
      const response = await apiHelper.put(
        `/api/shows/${testShow.show_id}`,
        { price: 400.00 },
        regularUser.user_id,
        403
      );

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });
  });

  describe('DELETE /api/shows/:id - Admin Only', () => {

    let testShow;

    beforeEach(async () => {
      testShow = await TestDataFactory.createShow({
        movie_id: testMovie.movie_id,
        screen_id: testScreen.screen_id,
        show_time: TestDataFactory.getFutureDateTime(4, '21:00:00'),
        price: 300.00
      });
    });

    it('should delete show without bookings as admin', async () => {
      const response = await apiHelper.delete(`/api/shows/${testShow.show_id}`, adminUser.user_id);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.message).toContain('deleted successfully');
    });

    it('should prevent deletion of show with bookings', async () => {
      // Create booking for the show
      const availableSeats = await TestDataFactory.getAvailableSeats(testShow.show_id);
      await TestDataFactory.createTestBooking({
        user_id: regularUser.user_id,
        show_id: testShow.show_id,
        seat_ids: [availableSeats[0].seat_id],
        total_amount: 300.00
      });

      const response = await apiHelper.delete(`/api/shows/${testShow.show_id}`, adminUser.user_id, 400);
      ResponseValidator.validateErrorResponse(response, 'Cannot delete show with confirmed bookings');
    });
  });

  describe('Performance Tests', () => {

    it('should handle show listing efficiently', async () => {
      // Create larger dataset
      const allScreens = testTheatre.screens;
      await TestDataFactory.createShows([testMovie], allScreens, 7); // 7 days of shows

      const startTime = Date.now();
      await apiHelper.get('/api/shows');
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});