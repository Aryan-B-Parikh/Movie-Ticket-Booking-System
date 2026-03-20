// Booking load stress tests - High volume booking operations
// Tests system performance, transaction safety, and error handling under load

const request = require('supertest');
const app = require('../../../src/app');
const { TestDataFactory, DatabaseCleaner, wait } = require('../../helpers/testData');
const { ApiHelper, PerformanceHelper } = require('../../helpers/requestHelpers');

describe('Booking Load Stress Tests', () => {

  let apiHelper;
  let testUsers = [];
  let testMovies = [];
  let testTheatres = [];
  let testShows = [];

  beforeAll(async () => {
    apiHelper = new ApiHelper(app);
    jest.setTimeout(300000); // 5 minutes for load tests
  });

  beforeEach(async () => {
    await DatabaseCleaner.cleanAll();

    console.log('🏗️  Setting up high-load test environment...');

    // Create large test dataset
    testUsers = await TestDataFactory.createUsers(50, { baseEmail: 'loadtest' });
    testMovies = await TestDataFactory.createMovies(10);
    testTheatres = await TestDataFactory.createTheatres(5);

    // Login users
    for (const user of testUsers.slice(0, 30)) { // Login subset for performance
      await apiHelper.loginUser({
        email: user.email,
        password: user.password
      });
    }

    // Create shows across multiple theatres and times
    const allScreens = testTheatres.flatMap(t => t.screens);
    testShows = await TestDataFactory.createShows(testMovies, allScreens, 3);

    console.log(`✅ Load test environment ready:`);
    console.log(`   Users: ${testUsers.length} (${testUsers.slice(0, 30).length} active)`);
    console.log(`   Movies: ${testMovies.length}`);
    console.log(`   Theatres: ${testTheatres.length}`);
    console.log(`   Screens: ${allScreens.length}`);
    console.log(`   Shows: ${testShows.length}\n`);
  });

  afterEach(async () => {
    await DatabaseCleaner.cleanAll();
  });

  afterAll(async () => {
    await DatabaseCleaner.cleanAll();
  });

  describe('🚀 High Volume Booking Operations', () => {

    it('should handle 100 sequential bookings efficiently', async () => {
      const bookingCount = 100;
      const show = testShows[0];
      const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);

      console.log(`\n📊 SEQUENTIAL LOAD: ${bookingCount} bookings for show ${show.show_id}`);
      console.log(`💺 Available seats: ${availableSeats.length}`);

      const actualBookings = Math.min(bookingCount, availableSeats.length, testUsers.length);

      const bookingTimes = [];
      const successfulBookings = [];
      const failedBookings = [];

      for (let i = 0; i < actualBookings; i++) {
        const startTime = Date.now();

        try {
          const bookingData = {
            showId: show.show_id,
            seatIds: [availableSeats[i].seat_id],
            paymentMethod: 'CREDIT_CARD',
            amount: show.price
          };

          const response = await apiHelper.bookTickets(
            bookingData,
            testUsers[i % testUsers.length].user_id,
            201
          );

          const endTime = Date.now();
          const duration = endTime - startTime;

          bookingTimes.push(duration);
          successfulBookings.push(response.body.data);

          if (i % 20 === 0) {
            console.log(`   Progress: ${i + 1}/${actualBookings} (${Math.round(duration)}ms)`);
          }

        } catch (error) {
          const endTime = Date.now();
          bookingTimes.push(endTime - startTime);
          failedBookings.push(error);
        }
      }

      // Performance analysis
      const avgTime = bookingTimes.reduce((a, b) => a + b, 0) / bookingTimes.length;
      const maxTime = Math.max(...bookingTimes);
      const minTime = Math.min(...bookingTimes);
      const p95Time = bookingTimes.sort((a, b) => a - b)[Math.floor(bookingTimes.length * 0.95)];

      console.log(`\n📊 Performance metrics:`);
      console.log(`   Successful: ${successfulBookings.length}/${actualBookings}`);
      console.log(`   Failed: ${failedBookings.length}/${actualBookings}`);
      console.log(`   Avg time: ${Math.round(avgTime)}ms`);
      console.log(`   Min time: ${minTime}ms`);
      console.log(`   Max time: ${maxTime}ms`);
      console.log(`   95th percentile: ${p95Time}ms`);

      // Performance assertions
      expect(successfulBookings.length).toBeGreaterThan(actualBookings * 0.95); // 95% success rate
      expect(avgTime).toBeLessThan(1000); // Average < 1 second
      expect(p95Time).toBeLessThan(2000); // 95th percentile < 2 seconds

      console.log('✅ SEQUENTIAL LOAD TEST PASSED!\n');
    });

    it('should handle burst booking scenarios', async () => {
      const burstSize = 25;
      const burstCount = 4;
      const show = testShows[1];

      console.log(`\n⚡ BURST LOAD: ${burstCount} bursts of ${burstSize} bookings each`);

      const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);
      const totalBookings = Math.min(burstSize * burstCount, availableSeats.length);

      let seatIndex = 0;
      let userIndex = 0;
      const allResults = [];

      for (let burst = 0; burst < burstCount; burst++) {
        console.log(`   Executing burst ${burst + 1}/${burstCount}...`);

        const burstPromises = [];
        const actualBurstSize = Math.min(burstSize, availableSeats.length - seatIndex);

        for (let i = 0; i < actualBurstSize; i++) {
          const bookingData = {
            showId: show.show_id,
            seatIds: [availableSeats[seatIndex + i].seat_id],
            paymentMethod: 'CREDIT_CARD',
            amount: show.price
          };

          const promise = apiHelper.bookTickets(
            bookingData,
            testUsers[userIndex % testUsers.length].user_id,
            null
          )
            .then(response => ({ success: true, data: response.body.data }))
            .catch(error => ({ success: false, error }));

          burstPromises.push(promise);
          userIndex++;
        }

        const startTime = Date.now();
        const burstResults = await Promise.all(burstPromises);
        const endTime = Date.now();

        const burstDuration = endTime - startTime;
        const successCount = burstResults.filter(r => r.success).length;

        console.log(`   Burst ${burst + 1}: ${successCount}/${actualBurstSize} in ${burstDuration}ms`);

        allResults.push(...burstResults);
        seatIndex += actualBurstSize;

        // Cool down between bursts
        if (burst < burstCount - 1) {
          await wait(100);
        }
      }

      const totalSuccessful = allResults.filter(r => r.success).length;
      const totalFailed = allResults.filter(r => !r.success).length;

      console.log(`\n📊 Burst test summary:`);
      console.log(`   Total successful: ${totalSuccessful}`);
      console.log(`   Total failed: ${totalFailed}`);
      console.log(`   Success rate: ${Math.round(totalSuccessful / allResults.length * 100)}%`);

      expect(totalSuccessful).toBeGreaterThan(allResults.length * 0.9); // 90% success rate
      expect(totalFailed).toBeLessThan(allResults.length * 0.1); // < 10% failure rate

      console.log('✅ BURST LOAD TEST PASSED!\n');
    });

    it('should maintain performance across multiple shows simultaneously', async () => {
      const simultaneousShows = 5;
      const bookingsPerShow = 15;
      const selectedShows = testShows.slice(0, simultaneousShows);

      console.log(`\n🎬 MULTI-SHOW LOAD: ${bookingsPerShow} bookings across ${simultaneousShows} shows`);

      const allBookingPromises = [];

      for (let showIndex = 0; showIndex < selectedShows.length; showIndex++) {
        const show = selectedShows[showIndex];
        const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);
        const actualBookings = Math.min(bookingsPerShow, availableSeats.length);

        console.log(`   Show ${showIndex + 1}: ${actualBookings} bookings for "${testMovies[showIndex]?.title}"`);

        for (let i = 0; i < actualBookings; i++) {
          const bookingData = {
            showId: show.show_id,
            seatIds: [availableSeats[i].seat_id],
            paymentMethod: 'CREDIT_CARD',
            amount: show.price
          };

          const promise = apiHelper.bookTickets(
            bookingData,
            testUsers[(showIndex * bookingsPerShow + i) % testUsers.length].user_id,
            null
          )
            .then(response => ({
              success: true,
              showId: show.show_id,
              data: response.body.data
            }))
            .catch(error => ({
              success: false,
              showId: show.show_id,
              error
            }));

          allBookingPromises.push(promise);
        }
      }

      console.log(`⚡ Executing ${allBookingPromises.length} concurrent bookings across shows...`);
      const startTime = Date.now();
      const results = await Promise.all(allBookingPromises);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      // Group results by show
      const resultsByShow = {};
      selectedShows.forEach(show => {
        resultsByShow[show.show_id] = {
          successful: results.filter(r => r.showId === show.show_id && r.success).length,
          failed: results.filter(r => r.showId === show.show_id && !r.success).length
        };
      });

      console.log(`\n📊 Multi-show performance:`);
      console.log(`   Total duration: ${totalDuration}ms`);
      console.log(`   Average per booking: ${Math.round(totalDuration / allBookingPromises.length)}ms`);
      console.log(`   Overall success rate: ${Math.round(successfulResults.length / results.length * 100)}%`);

      console.log(`\n   Per-show breakdown:`);
      Object.entries(resultsByShow).forEach(([showId, stats]) => {
        console.log(`     Show ${showId}: ${stats.successful} successful, ${stats.failed} failed`);
      });

      // Performance assertions
      expect(totalDuration).toBeLessThan(30000); // Complete within 30 seconds
      expect(successfulResults.length).toBeGreaterThan(results.length * 0.85); // 85% success rate

      console.log('✅ MULTI-SHOW LOAD TEST PASSED!\n');
    });
  });

  describe('💰 Payment Processing Under Load', () => {

    it('should handle diverse payment methods under load', async () => {
      const paymentMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CASH'];
      const bookingsPerMethod = 10;
      const show = testShows[2];

      console.log(`\n💳 PAYMENT LOAD: ${bookingsPerMethod} bookings per payment method`);

      const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);
      const allPaymentPromises = [];

      let seatIndex = 0;
      for (const method of paymentMethods) {
        console.log(`   Testing ${method}...`);

        for (let i = 0; i < bookingsPerMethod && seatIndex < availableSeats.length; i++) {
          const bookingData = {
            showId: show.show_id,
            seatIds: [availableSeats[seatIndex].seat_id],
            paymentMethod: method,
            amount: show.price
          };

          const promise = apiHelper.bookTickets(
            bookingData,
            testUsers[seatIndex % testUsers.length].user_id,
            null
          )
            .then(response => ({
              success: true,
              paymentMethod: method,
              data: response.body.data
            }))
            .catch(error => ({
              success: false,
              paymentMethod: method,
              error
            }));

          allPaymentPromises.push(promise);
          seatIndex++;
        }
      }

      const startTime = Date.now();
      const results = await Promise.all(allPaymentPromises);
      const endTime = Date.now();

      // Analyze results by payment method
      const statsByMethod = {};
      paymentMethods.forEach(method => {
        const methodResults = results.filter(r => r.paymentMethod === method);
        statsByMethod[method] = {
          total: methodResults.length,
          successful: methodResults.filter(r => r.success).length,
          failed: methodResults.filter(r => !r.success).length,
          successRate: methodResults.filter(r => r.success).length / methodResults.length
        };
      });

      console.log(`\n📊 Payment processing results (${endTime - startTime}ms):`);
      Object.entries(statsByMethod).forEach(([method, stats]) => {
        console.log(`   ${method}: ${stats.successful}/${stats.total} (${Math.round(stats.successRate * 100)}%)`);
      });

      // All payment methods should work reliably
      Object.values(statsByMethod).forEach(stats => {
        expect(stats.successRate).toBeGreaterThan(0.9); // 90% success rate per method
      });

      console.log('✅ PAYMENT LOAD TEST PASSED!\n');
    });

    it('should handle high-value transactions correctly', async () => {
      const highValueBookings = 20;
      const show = testShows[3];

      console.log(`\n💎 HIGH-VALUE LOAD: ${highValueBookings} premium bookings`);

      const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);
      const vipSeats = availableSeats.filter(s => s.seat_type === 'VIP').slice(0, highValueBookings);
      const premiumSeats = availableSeats.filter(s => s.seat_type === 'Premium').slice(0, highValueBookings - vipSeats.length);
      const selectedSeats = [...vipSeats, ...premiumSeats];

      console.log(`   Selected seats: ${vipSeats.length} VIP + ${premiumSeats.length} Premium`);

      const bookingPromises = selectedSeats.map((seat, index) => {
        const vipPremium = seat.seat_type === 'VIP' ? 50 : 0;
        const bookingData = {
          showId: show.show_id,
          seatIds: [seat.seat_id],
          paymentMethod: 'CREDIT_CARD',
          amount: show.price + vipPremium
        };

        return apiHelper.bookTickets(
          bookingData,
          testUsers[index % testUsers.length].user_id,
          null
        )
          .then(response => ({
            success: true,
            amount: bookingData.amount,
            seatType: seat.seat_type,
            data: response.body.data
          }))
          .catch(error => ({
            success: false,
            amount: bookingData.amount,
            seatType: seat.seat_type,
            error
          }));
      });

      const startTime = Date.now();
      const results = await Promise.all(bookingPromises);
      const endTime = Date.now();

      const successfulBookings = results.filter(r => r.success);
      const totalValue = successfulBookings.reduce((sum, r) => sum + r.amount, 0);
      const avgAmount = totalValue / successfulBookings.length;

      console.log(`\n📊 High-value booking results (${endTime - startTime}ms):`);
      console.log(`   Successful bookings: ${successfulBookings.length}/${results.length}`);
      console.log(`   Total transaction value: $${totalValue}`);
      console.log(`   Average booking value: $${Math.round(avgAmount)}`);

      expect(successfulBookings.length).toBeGreaterThan(results.length * 0.95);
      expect(totalValue).toBeGreaterThan(show.price * selectedSeats.length);

      console.log('✅ HIGH-VALUE LOAD TEST PASSED!\n');
    });
  });

  describe('🔄 Cancellation Load Tests', () => {

    it('should handle mass cancellation scenarios', async () => {
      const bookingCount = 30;
      const cancellationRatio = 0.7; // 70% will be cancelled
      const show = testShows[4];

      console.log(`\n❌ CANCELLATION LOAD: ${bookingCount} bookings, ${Math.round(cancellationRatio * 100)}% cancellation rate`);

      // First, create bookings
      const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);
      const createdBookings = [];

      console.log('   Phase 1: Creating bookings...');
      for (let i = 0; i < bookingCount && i < availableSeats.length; i++) {
        const booking = await TestDataFactory.createTestBooking({
          user_id: testUsers[i % testUsers.length].user_id,
          show_id: show.show_id,
          seat_ids: [availableSeats[i].seat_id],
          total_amount: show.price
        });
        createdBookings.push(booking);
      }

      console.log(`   Created ${createdBookings.length} bookings`);

      // Select bookings for cancellation
      const bookingsToCancel = createdBookings.slice(0, Math.floor(createdBookings.length * cancellationRatio));
      console.log(`   Phase 2: Cancelling ${bookingsToCancel.length} bookings...`);

      const cancellationPromises = bookingsToCancel.map(booking => {
        return apiHelper.cancelBooking(booking.booking_id, booking.user_id, null)
          .then(response => ({
            success: true,
            bookingId: booking.booking_id,
            data: response.body.data
          }))
          .catch(error => ({
            success: false,
            bookingId: booking.booking_id,
            error
          }));
      });

      const startTime = Date.now();
      const cancellationResults = await Promise.all(cancellationPromises);
      const endTime = Date.now();

      const successfulCancellations = cancellationResults.filter(r => r.success);
      const failedCancellations = cancellationResults.filter(r => !r.success);

      console.log(`\n📊 Cancellation results (${endTime - startTime}ms):`);
      console.log(`   Successful: ${successfulCancellations.length}/${cancellationResults.length}`);
      console.log(`   Failed: ${failedCancellations.length}/${cancellationResults.length}`);

      // Verify seat availability increased
      const finalAvailableSeats = await TestDataFactory.getAvailableSeats(show.show_id);
      const expectedAvailable = availableSeats.length - (createdBookings.length - successfulCancellations.length);

      console.log(`   Seat availability: ${finalAvailableSeats.length} (expected: ~${expectedAvailable})`);

      expect(successfulCancellations.length).toBeGreaterThan(cancellationResults.length * 0.95);
      expect(finalAvailableSeats.length).toBeGreaterThanOrEqual(expectedAvailable - 5); // Allow small variance

      console.log('✅ CANCELLATION LOAD TEST PASSED!\n');
    });
  });

  describe('📊 System Resource Monitoring', () => {

    it('should maintain acceptable memory usage during load', async () => {
      const iterations = 50;
      console.log(`\n🧠 MEMORY TEST: Monitoring memory usage during ${iterations} operations`);

      const initialMemory = process.memoryUsage();
      console.log(`   Initial memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);

      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        // Perform a booking operation
        const show = testShows[i % testShows.length];
        const availableSeats = await TestDataFactory.getAvailableSeats(show.show_id);

        if (availableSeats.length > 0) {
          try {
            const bookingData = {
              showId: show.show_id,
              seatIds: [availableSeats[0].seat_id],
              paymentMethod: 'CREDIT_CARD',
              amount: show.price
            };

            await apiHelper.bookTickets(
              bookingData,
              testUsers[i % testUsers.length].user_id,
              null
            );
          } catch (error) {
            // Memory test continues regardless of booking failures
          }
        }

        // Take memory snapshot every 10 iterations
        if (i % 10 === 0) {
          const memory = process.memoryUsage();
          memorySnapshots.push({
            iteration: i,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external
          });
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`\n📊 Memory usage analysis:`);
      console.log(`   Final memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`   Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${Math.round(memoryIncreasePercent)}%)`);

      // Memory should not grow excessively
      expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase

      console.log('✅ MEMORY TEST PASSED!\n');
    });

    it('should complete load test summary', async () => {
      console.log('\n📊 LOAD TEST SUMMARY');
      console.log('====================');

      // Get final database statistics
      const totalBookings = await TestDataFactory.query(
        'SELECT COUNT(*) as count FROM Bookings WHERE status = "CONFIRMED"',
        []
      );

      const totalPayments = await TestDataFactory.query(
        'SELECT COUNT(*) as count, SUM(amount) as total_amount FROM Payments WHERE payment_status = "SUCCESS"',
        []
      );

      const bookingsByShow = await TestDataFactory.query(`
        SELECT s.show_id, m.title, COUNT(b.booking_id) as booking_count
        FROM Shows s
        LEFT JOIN Movies m ON s.movie_id = m.movie_id
        LEFT JOIN Bookings b ON s.show_id = b.show_id AND b.status = 'CONFIRMED'
        GROUP BY s.show_id, m.title
        ORDER BY booking_count DESC
        LIMIT 5
      `, []);

      console.log(`✅ Total confirmed bookings: ${totalBookings[0].count}`);
      console.log(`💰 Total payment value: $${totalPayments[0].total_amount || 0}`);
      console.log(`📈 Payment success rate: ${Math.round(totalPayments[0].count / Math.max(totalBookings[0].count, 1) * 100)}%`);

      console.log(`\n🏆 Top 5 shows by bookings:`);
      bookingsByShow.forEach((show, index) => {
        console.log(`   ${index + 1}. "${show.title}": ${show.booking_count} bookings`);
      });

      console.log('====================');
      console.log('🎉 ALL LOAD TESTS COMPLETED!');
      console.log('💪 System demonstrated high performance under stress!');

      // Final assertion - system should have processed significant load
      expect(totalBookings[0].count).toBeGreaterThan(50);
      expect(totalPayments[0].count).toBeGreaterThan(40);
    });
  });
});