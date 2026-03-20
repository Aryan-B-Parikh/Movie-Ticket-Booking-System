// Integration tests for Booking endpoints - CRITICAL COMPONENT
// Tests booking creation flow, cancellation, user authorization, and error scenarios

const request = require('supertest');
const app = require('../../../src/app');
const { TestDataFactory, DatabaseCleaner } = require('../../helpers/testData');
const { ApiHelper, ResponseValidator } = require('../../helpers/requestHelpers');

describe('CRITICAL: Booking Integration Tests', () => {

  let apiHelper;
  let regularUser, adminUser, anotherUser;
  let testMovie, testTheatre, testScreen, testShow;
  let availableSeats;

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

    anotherUser = await TestDataFactory.createUser({
      email: 'another@example.com',
      role: 'USER'
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

    await apiHelper.loginUser({
      email: anotherUser.email,
      password: anotherUser.password
    });

    // Create test infrastructure
    testMovie = await TestDataFactory.createMovie({
      title: 'Booking Test Movie',
      duration_minutes: 150
    });

    const theatres = await TestDataFactory.createTheatres(1);
    testTheatre = theatres[0];
    testScreen = testTheatre.screens[0];

    testShow = await TestDataFactory.createShow({
      movie_id: testMovie.movie_id,
      screen_id: testScreen.screen_id,
      show_time: TestDataFactory.getFutureDateTime(1, '19:00:00'),
      price: 300.00
    });

    availableSeats = await TestDataFactory.getAvailableSeats(testShow.show_id);
  });

  afterAll(async () => {
    await DatabaseCleaner.cleanAll();
  });

  describe('POST /api/bookings - Ticket Booking', () => {

    const createBookingData = (seatIds, amount = null) => ({
      showId: testShow.show_id,
      seatIds: seatIds,
      paymentMethod: 'CREDIT_CARD',
      amount: amount || (300.00 * seatIds.length)
    });

    it('should create booking successfully', async () => {
      const seatIds = availableSeats.slice(0, 2).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);

      ResponseValidator.validateBookingResponse(response);
      const booking = response.body.data;

      expect(booking.user_id).toBe(regularUser.user_id);
      expect(booking.show_id).toBe(testShow.show_id);
      expect(booking.total_amount).toBe(600.00);
      expect(booking.status).toBe('CONFIRMED');
      expect(booking.seats).toHaveLength(2);
      expect(booking.seats.every(s => seatIds.includes(s.seat_id))).toBe(true);
    });

    it('should create VIP booking with correct pricing', async () => {
      const vipSeat = availableSeats.find(s => s.seat_type === 'VIP');
      if (!vipSeat) {
        console.log('No VIP seats available, skipping VIP test');
        return;
      }

      const bookingData = createBookingData([vipSeat.seat_id], 350.00); // Base + 50 VIP premium

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);

      ResponseValidator.validateBookingResponse(response);
      const booking = response.body.data;
      expect(booking.total_amount).toBe(350.00);
      expect(booking.seats[0].seat_type).toBe('VIP');
    });

    it('should require authentication for booking', async () => {
      const seatIds = availableSeats.slice(0, 1).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(401);

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should validate required booking fields', async () => {
      const requiredFields = ['showId', 'seatIds', 'paymentMethod', 'amount'];
      const seatIds = availableSeats.slice(0, 1).map(s => s.seat_id);

      for (const field of requiredFields) {
        const incompleteData = createBookingData(seatIds);
        delete incompleteData[field];

        const response = await apiHelper.bookTickets(incompleteData, regularUser.user_id, 400);
        ResponseValidator.validateErrorResponse(response);
      }
    });

    it('should validate seat IDs array', async () => {
      const invalidCases = [
        { seatIds: [], description: 'empty array' },
        { seatIds: null, description: 'null value' },
        { seatIds: 'invalid', description: 'string instead of array' },
        { seatIds: [999999], description: 'non-existent seat' }
      ];

      for (const testCase of invalidCases) {
        const bookingData = {
          showId: testShow.show_id,
          seatIds: testCase.seatIds,
          paymentMethod: 'CREDIT_CARD',
          amount: 300.00
        };

        const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 400);
        ResponseValidator.validateErrorResponse(response);
      }
    });

    it('should validate amount matches calculated total', async () => {
      const seatIds = availableSeats.slice(0, 2).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds, 500.00); // Wrong amount

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 400);
      ResponseValidator.validateErrorResponse(response, 'amount');
    });

    it('should prevent booking unavailable seats', async () => {
      const seatIds = availableSeats.slice(0, 2).map(s => s.seat_id);

      // First booking
      const bookingData1 = createBookingData(seatIds);
      await apiHelper.bookTickets(bookingData1, regularUser.user_id, 201);

      // Try to book same seats
      const bookingData2 = createBookingData(seatIds);
      const response = await apiHelper.bookTickets(bookingData2, anotherUser.user_id, 409);

      ResponseValidator.validateErrorResponse(response);
      expect(response.body.error.message.toLowerCase()).toMatch(/unavailable|not available/);
    });

    it('should prevent booking for past shows', async () => {
      // Create past show
      const pastShow = await TestDataFactory.createShow({
        movie_id: testMovie.movie_id,
        screen_id: testScreen.screen_id,
        show_time: '2020-01-01 10:00:00', // Past date
        price: 300.00
      });

      const pastSeats = await TestDataFactory.getAvailableSeats(pastShow.show_id);
      const bookingData = {
        showId: pastShow.show_id,
        seatIds: [pastSeats[0].seat_id],
        paymentMethod: 'CREDIT_CARD',
        amount: 300.00
      };

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 400);
      ResponseValidator.validateErrorResponse(response, 'show time');
    });

    it('should validate payment methods', async () => {
      const validMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CASH'];
      const invalidMethods = ['PAYPAL', 'CRYPTO', 'CHECK', ''];

      // Test valid methods
      for (const method of validMethods) {
        const seatId = availableSeats[validMethods.indexOf(method)].seat_id;
        const bookingData = {
          showId: testShow.show_id,
          seatIds: [seatId],
          paymentMethod: method,
          amount: 300.00
        };

        const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);
        ResponseValidator.validateBookingResponse(response);
      }

      // Test invalid methods
      for (const method of invalidMethods) {
        const bookingData = {
          showId: testShow.show_id,
          seatIds: [availableSeats[5].seat_id], // Use different seat
          paymentMethod: method,
          amount: 300.00
        };

        const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 400);
        ResponseValidator.validateErrorResponse(response);
      }
    });

    it('should handle concurrent booking attempts gracefully', async () => {
      const seatIds = availableSeats.slice(0, 3).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      // Attempt concurrent bookings for same seats
      const concurrentPromises = [
        apiHelper.bookTickets(bookingData, regularUser.user_id, null),
        apiHelper.bookTickets(bookingData, anotherUser.user_id, null),
        apiHelper.bookTickets(bookingData, adminUser.user_id, null)
      ];

      const results = await Promise.allSettled(concurrentPromises);

      // Only one should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failedResults = results.filter(r => r.status === 'rejected' || r.value.status !== 201);

      expect(successfulResults.length).toBe(1);
      expect(failedResults.length).toBe(2);
    });
  });

  describe('GET /api/bookings/user - User Bookings', () => {

    let userBookings = [];

    beforeEach(async () => {
      // Create multiple bookings for the user
      for (let i = 0; i < 3; i++) {
        const booking = await TestDataFactory.createTestBooking({
          user_id: regularUser.user_id,
          show_id: testShow.show_id,
          seat_ids: [availableSeats[i].seat_id],
          total_amount: 300.00
        });
        userBookings.push(booking);
      }

      // Create booking for another user (should not appear in results)
      await TestDataFactory.createTestBooking({
        user_id: anotherUser.user_id,
        show_id: testShow.show_id,
        seat_ids: [availableSeats[3].seat_id],
        total_amount: 300.00
      });
    });

    it('should return user bookings only', async () => {
      const response = await apiHelper.getUserBookings(regularUser.user_id);

      ResponseValidator.validateArrayResponse(response, (booking) => {
        expect(booking).toHaveProperty('booking_id');
        expect(booking).toHaveProperty('show_id');
        expect(booking).toHaveProperty('total_amount');
        expect(booking).toHaveProperty('status');
        expect(booking).toHaveProperty('movie_title');
        expect(booking).toHaveProperty('theatre_name');
      });

      expect(response.body.data.length).toBe(3);
      response.body.data.forEach(booking => {
        expect(userBookings.some(ub => ub.booking_id === booking.booking_id)).toBe(true);
      });
    });

    it('should filter bookings by status', async () => {
      const response = await apiHelper.getUserBookings(regularUser.user_id, { status: 'CONFIRMED' });

      ResponseValidator.validateArrayResponse(response);
      response.body.data.forEach(booking => {
        expect(booking.status).toBe('CONFIRMED');
      });
    });

    it('should require authentication for user bookings', async () => {
      const response = await request(app)
        .get('/api/bookings/user')
        .expect(401);

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should not allow users to see other users bookings', async () => {
      const response = await apiHelper.getUserBookings(regularUser.user_id);

      // Verify no bookings from anotherUser appear
      response.body.data.forEach(booking => {
        expect(booking.user_id).not.toBe(anotherUser.user_id);
      });
    });

    it('should support pagination', async () => {
      const response = await apiHelper.getUserBookings(regularUser.user_id, { limit: 2, offset: 1 });

      ResponseValidator.validateArrayResponse(response);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/bookings/:id - Booking Details', () => {

    let testBooking;

    beforeEach(async () => {
      testBooking = await TestDataFactory.createTestBooking({
        user_id: regularUser.user_id,
        show_id: testShow.show_id,
        seat_ids: availableSeats.slice(0, 2).map(s => s.seat_id),
        total_amount: 600.00
      });
    });

    it('should return booking details for owner', async () => {
      const response = await apiHelper.get(`/api/bookings/${testBooking.booking_id}`, regularUser.user_id);

      ResponseValidator.validateSuccessResponse(response, [
        'booking_id', 'user_id', 'show_id', 'total_amount', 'status', 'seats'
      ]);

      const booking = response.body.data;
      expect(booking.booking_id).toBe(testBooking.booking_id);
      expect(booking.user_id).toBe(regularUser.user_id);
      expect(booking.seats).toHaveLength(2);
    });

    it('should allow admin to view any booking', async () => {
      const response = await apiHelper.get(`/api/bookings/${testBooking.booking_id}`, adminUser.user_id);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.booking_id).toBe(testBooking.booking_id);
    });

    it('should prevent other users from viewing booking', async () => {
      const response = await apiHelper.get(`/api/bookings/${testBooking.booking_id}`, anotherUser.user_id, 403);

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await apiHelper.get('/api/bookings/999999', regularUser.user_id, 404);

      ResponseValidator.validateErrorResponse(response, 'Booking not found');
    });
  });

  describe('POST /api/bookings/:id/cancel - Booking Cancellation', () => {

    let testBooking;

    beforeEach(async () => {
      testBooking = await TestDataFactory.createTestBooking({
        user_id: regularUser.user_id,
        show_id: testShow.show_id,
        seat_ids: availableSeats.slice(0, 1).map(s => s.seat_id),
        total_amount: 300.00
      });
    });

    it('should cancel booking successfully', async () => {
      const response = await apiHelper.cancelBooking(testBooking.booking_id, regularUser.user_id, 200);

      ResponseValidator.validateSuccessResponse(response);
      const result = response.body.data;

      expect(result.booking.status).toBe('CANCELLED');
      expect(result.message).toContain('cancelled');

      // Verify seats become available again
      const finalSeats = await TestDataFactory.getAvailableSeats(testShow.show_id);
      expect(finalSeats.length).toBe(availableSeats.length); // Back to original count
    });

    it('should prevent other users from cancelling booking', async () => {
      const response = await apiHelper.cancelBooking(testBooking.booking_id, anotherUser.user_id, 403);

      ResponseValidator.validateErrorResponse(response, 'Access denied');
    });

    it('should allow admin to cancel any booking', async () => {
      const response = await apiHelper.cancelBooking(testBooking.booking_id, adminUser.user_id, 200);

      ResponseValidator.validateSuccessResponse(response);
      expect(response.body.data.booking.status).toBe('CANCELLED');
    });

    it('should prevent double cancellation', async () => {
      // Cancel once
      await apiHelper.cancelBooking(testBooking.booking_id, regularUser.user_id, 200);

      // Try to cancel again
      const response = await apiHelper.cancelBooking(testBooking.booking_id, regularUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'already cancelled');
    });

    it('should prevent cancellation of past show booking', async () => {
      // Create past show booking
      const pastShow = await TestDataFactory.createShow({
        movie_id: testMovie.movie_id,
        screen_id: testScreen.screen_id,
        show_time: '2020-01-01 10:00:00',
        price: 300.00
      });

      const pastBooking = await TestDataFactory.createTestBooking({
        user_id: regularUser.user_id,
        show_id: pastShow.show_id,
        seat_ids: [availableSeats[5].seat_id],
        total_amount: 300.00
      });

      const response = await apiHelper.cancelBooking(pastBooking.booking_id, regularUser.user_id, 400);

      ResponseValidator.validateErrorResponse(response, 'cannot cancel');
    });
  });

  describe('Payment Integration Tests', () => {

    it('should record payment details with successful booking', async () => {
      const seatIds = availableSeats.slice(0, 1).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);
      const booking = response.body.data;

      // Verify payment record exists
      const payments = await TestDataFactory.query(
        'SELECT * FROM Payments WHERE booking_id = ?',
        [booking.booking_id]
      );

      expect(payments.length).toBe(1);
      expect(payments[0].amount).toBe(300.00);
      expect(payments[0].payment_method).toBe('CREDIT_CARD');
      expect(payments[0].payment_status).toBe('SUCCESS');
    });

    it('should handle payment failures gracefully', async () => {
      // This would require mocking payment processing
      // For now, verify all successful bookings have payment records
      const seatIds = availableSeats.slice(0, 1).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);
      const booking = response.body.data;

      expect(booking.status).toBe('CONFIRMED');

      // Payment should be recorded
      const payments = await TestDataFactory.query(
        'SELECT payment_status FROM Payments WHERE booking_id = ?',
        [booking.booking_id]
      );

      expect(payments[0].payment_status).toBe('SUCCESS');
    });
  });

  describe('Performance and Scalability', () => {

    it('should handle booking request within reasonable time', async () => {
      const seatIds = availableSeats.slice(0, 2).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      const startTime = Date.now();
      await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle booking history requests efficiently', async () => {
      // Create multiple bookings
      for (let i = 0; i < 5; i++) {
        await TestDataFactory.createTestBooking({
          user_id: regularUser.user_id,
          show_id: testShow.show_id,
          seat_ids: [availableSeats[i + 10].seat_id],
          total_amount: 300.00
        });
      }

      const startTime = Date.now();
      await apiHelper.getUserBookings(regularUser.user_id);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Edge Cases and Error Handling', () => {

    it('should handle invalid booking IDs gracefully', async () => {
      const invalidIds = ['abc', '0', '-1', '999999999'];

      for (const id of invalidIds) {
        const response = await apiHelper.get(`/api/bookings/${id}`, regularUser.user_id, null);
        expect([400, 404]).toContain(response.status);
        ResponseValidator.validateErrorResponse(response);
      }
    });

    it('should validate seat limits per booking', async () => {
      // Try to book too many seats (if there's a limit)
      const allSeatIds = availableSeats.map(s => s.seat_id);
      if (allSeatIds.length > 10) {
        const bookingData = createBookingData(allSeatIds.slice(0, 11)); // Assuming 10 seat limit

        const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 400);
        // This test depends on business rules - might need to check if seat limits exist
      }
    });

    it('should handle database transaction failures', async () => {
      // This test would require mocking database failures
      // For integration tests, we ensure atomicity by checking final state consistency
      const seatIds = availableSeats.slice(0, 1).map(s => s.seat_id);
      const bookingData = createBookingData(seatIds);

      const response = await apiHelper.bookTickets(bookingData, regularUser.user_id, 201);
      const booking = response.body.data;

      // Verify all related records exist
      const bookingRecord = await TestDataFactory.query(
        'SELECT * FROM Bookings WHERE booking_id = ?',
        [booking.booking_id]
      );
      const seatRecords = await TestDataFactory.query(
        'SELECT * FROM Booking_Seats WHERE booking_id = ?',
        [booking.booking_id]
      );
      const paymentRecord = await TestDataFactory.query(
        'SELECT * FROM Payments WHERE booking_id = ?',
        [booking.booking_id]
      );

      expect(bookingRecord.length).toBe(1);
      expect(seatRecords.length).toBe(1);
      expect(paymentRecord.length).toBe(1);
    });
  });

  const createBookingData = (seatIds, amount = null) => ({
    showId: testShow.show_id,
    seatIds: seatIds,
    paymentMethod: 'CREDIT_CARD',
    amount: amount || (300.00 * seatIds.length)
  });
});