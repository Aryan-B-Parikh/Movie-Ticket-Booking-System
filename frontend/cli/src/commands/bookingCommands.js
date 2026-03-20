const chalk = require('chalk');
const APIClient = require('../api');
const Utils = require('../utils');

/**
 * Booking command handlers
 */
class BookingCommands {
  static async list(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      if (!api.isAuthenticated()) {
        Utils.error('Authentication required. Please login first with: movie-booking auth login');
        process.exit(1);
      }

      Utils.header('My Bookings', `User: ${api.getCurrentUser().username}`);

      const filters = {
        status: options.status,
        page: parseInt(options.page),
        limit: parseInt(options.limit)
      };

      const spinner = Utils.spinner('Loading bookings...');
      spinner.start();

      try {
        const bookings = await api.getBookings(filters);
        spinner.stop();

        if (!bookings || bookings.length === 0) {
          Utils.warning('No bookings found.');
          return;
        }

        Utils.displayBookings(bookings, { showCount: true });

        // Show applied filters
        const appliedFilters = [];
        if (options.status) appliedFilters.push(`Status: ${options.status}`);

        if (appliedFilters.length > 0) {
          console.log(chalk.gray('\nApplied filters: ' + appliedFilters.join(', ')));
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch bookings: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list bookings: ${error.message}`);
      process.exit(1);
    }
  }

  static async show(id, options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      if (!api.isAuthenticated()) {
        Utils.error('Authentication required. Please login first with: movie-booking auth login');
        process.exit(1);
      }

      const spinner = Utils.spinner('Loading booking details...');
      spinner.start();

      try {
        const booking = await api.getBooking(id);
        spinner.stop();

        Utils.displayBookingDetails(booking);

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch booking details: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to show booking details: ${error.message}`);
      process.exit(1);
    }
  }

  static async create(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      if (!api.isAuthenticated()) {
        Utils.error('Authentication required. Please login first with: movie-booking auth login');
        process.exit(1);
      }

      Utils.header('Create Booking', `User: ${api.getCurrentUser().username}`);

      let bookingData = {
        showId: options.show,
        seatIds: options.seats ? Utils.parseCommaSeparated(options.seats) : null,
        paymentMethod: options.payment
      };

      // Interactive booking flow
      if (options.interactive || !bookingData.showId || !bookingData.seatIds || !bookingData.paymentMethod) {
        bookingData = await this.interactiveBookingFlow(api, bookingData);
      }

      // Validate payment method
      if (!Utils.validatePaymentMethod(bookingData.paymentMethod)) {
        Utils.error('Invalid payment method. Valid options: CREDIT_CARD, DEBIT_CARD, UPI, WALLET');
        process.exit(1);
      }

      // Confirm booking details
      await this.confirmBookingDetails(api, bookingData);

      const spinner = Utils.spinner('Creating booking...');
      spinner.start();

      try {
        const booking = await api.createBooking(
          bookingData.showId,
          bookingData.seatIds,
          bookingData.paymentMethod
        );
        spinner.stop();

        Utils.success('Booking created successfully!');
        console.log('');
        Utils.displayBookingDetails(booking);

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to create booking: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to create booking: ${error.message}`);
      process.exit(1);
    }
  }

  static async cancel(id, options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      if (!api.isAuthenticated()) {
        Utils.error('Authentication required. Please login first with: movie-booking auth login');
        process.exit(1);
      }

      // Get booking details first
      const spinner = Utils.spinner('Loading booking details...');
      spinner.start();

      let booking;
      try {
        booking = await api.getBooking(id);
        spinner.stop();
      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch booking details: ${error.message}`);
        process.exit(1);
      }

      // Check if booking can be cancelled
      if (booking.status === 'CANCELLED') {
        Utils.warning('This booking has already been cancelled.');
        return;
      }

      if (booking.status !== 'CONFIRMED') {
        Utils.error('Only confirmed bookings can be cancelled.');
        process.exit(1);
      }

      // Show booking details
      Utils.header('Cancel Booking');
      Utils.displayBookingDetails(booking);

      // Confirm cancellation
      if (!options.force) {
        const confirmed = await Utils.promptConfirm(
          `Are you sure you want to cancel this booking?`,
          false
        );

        if (!confirmed) {
          Utils.info('Booking cancellation cancelled.');
          return;
        }
      }

      const cancelSpinner = Utils.spinner('Cancelling booking...');
      cancelSpinner.start();

      try {
        const result = await api.cancelBooking(id);
        cancelSpinner.stop();

        Utils.success('Booking cancelled successfully!');
        if (result.refund_amount) {
          console.log(chalk.green(`Refund amount: ${Utils.formatCurrency(result.refund_amount)}`));
        }

      } catch (error) {
        cancelSpinner.stop();
        Utils.error(`Failed to cancel booking: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to cancel booking: ${error.message}`);
      process.exit(1);
    }
  }

  static async quickBook(options, command) {
    try {
      const globalOpts = command.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      if (!api.isAuthenticated()) {
        Utils.error('Authentication required. Please login first with: movie-booking auth login');
        process.exit(1);
      }

      Utils.header('Quick Booking', `Welcome, ${api.getCurrentUser().username}!`);

      const bookingData = await this.interactiveBookingFlow(api, {
        showId: options.show,
        seatIds: options.seats ? Utils.parseCommaSeparated(options.seats) : null,
        paymentMethod: options.payment
      });

      // Confirm booking
      await this.confirmBookingDetails(api, bookingData);

      const spinner = Utils.spinner('Creating booking...');
      spinner.start();

      try {
        const booking = await api.createBooking(
          bookingData.showId,
          bookingData.seatIds,
          bookingData.paymentMethod
        );
        spinner.stop();

        Utils.success('Booking created successfully!');
        console.log('');
        Utils.displayBookingDetails(booking);

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to create booking: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Quick booking failed: ${error.message}`);
      process.exit(1);
    }
  }

  // Helper methods
  static async interactiveBookingFlow(api, initialData) {
    const bookingData = { ...initialData };

    // Step 1: Select show if not provided
    if (!bookingData.showId) {
      console.log(chalk.blue('\nStep 1: Select a show'));

      // Get upcoming shows
      const shows = await api.getUpcomingShows(7, 20);
      if (!shows || shows.length === 0) {
        throw new Error('No upcoming shows available.');
      }

      const showChoices = shows.map(show => {
        const movieTitle = show.movie_title || show.Movie?.title || 'Unknown Movie';
        const theatreName = show.theatre_name || show.Screen?.Theatre?.name || 'Unknown Theatre';
        const showTime = Utils.formatDateTime(show.show_time);
        return {
          name: `${movieTitle} - ${theatreName} - ${showTime} (${Utils.formatCurrency(show.price)})`,
          value: show.show_id
        };
      });

      bookingData.showId = await Utils.promptSelect(
        'Choose a show:',
        showChoices,
        10
      );
    }

    // Step 2: Select seats if not provided
    if (!bookingData.seatIds) {
      console.log(chalk.blue('\nStep 2: Select seats'));

      const seats = await api.getAvailableSeats(bookingData.showId);
      const availableSeats = seats.filter(seat => seat.is_available !== false && seat.status !== 'BOOKED');

      if (availableSeats.length === 0) {
        throw new Error('No seats available for this show.');
      }

      // Group seats by type for better display
      const regularSeats = availableSeats.filter(s => s.seat_type === 'REGULAR');
      const premiumSeats = availableSeats.filter(s => s.seat_type === 'PREMIUM');

      console.log(chalk.blue(`\nAvailable seats:`));
      console.log(`Regular: ${regularSeats.length} seats`);
      console.log(`Premium: ${premiumSeats.length} seats`);

      Utils.displaySeats(availableSeats, { showCount: true });

      const seatChoices = availableSeats.map(seat => ({
        name: `${seat.seat_number} (${seat.seat_type})`,
        value: seat.seat_id
      }));

      bookingData.seatIds = await Utils.promptMultiSelect(
        'Select seats:',
        seatChoices,
        15
      );
    }

    // Step 3: Select payment method if not provided
    if (!bookingData.paymentMethod) {
      console.log(chalk.blue('\nStep 3: Choose payment method'));

      bookingData.paymentMethod = await Utils.promptSelect(
        'Select payment method:',
        Utils.getPaymentMethodChoices()
      );
    }

    return bookingData;
  }

  static async confirmBookingDetails(api, bookingData) {
    console.log(chalk.blue('\n📋 Booking Summary'));

    try {
      // Get show details
      const show = await api.getShow(bookingData.showId);
      const seats = await api.getAvailableSeats(bookingData.showId);

      // Find selected seats
      const selectedSeats = seats.filter(seat => bookingData.seatIds.includes(seat.seat_id));

      console.log('');
      console.log(`${chalk.blue('Movie:')} ${show.Movie?.title || 'N/A'}`);
      console.log(`${chalk.blue('Theatre:')} ${show.Screen?.Theatre?.name || 'N/A'}`);
      console.log(`${chalk.blue('Show Time:')} ${Utils.formatDateTime(show.show_time)}`);
      console.log(`${chalk.blue('Seats:')} ${selectedSeats.map(s => s.seat_number).join(', ')}`);
      console.log(`${chalk.blue('Seat Count:')} ${selectedSeats.length}`);
      console.log(`${chalk.blue('Price per Seat:')} ${Utils.formatCurrency(show.price)}`);
      console.log(`${chalk.blue('Total Amount:')} ${Utils.formatCurrency(show.price * selectedSeats.length)}`);
      console.log(`${chalk.blue('Payment Method:')} ${bookingData.paymentMethod}`);

      const confirmed = await Utils.promptConfirm('\nProceed with this booking?', true);

      if (!confirmed) {
        throw new Error('Booking cancelled by user.');
      }

    } catch (error) {
      throw new Error(`Failed to confirm booking details: ${error.message}`);
    }
  }
}

module.exports = BookingCommands;