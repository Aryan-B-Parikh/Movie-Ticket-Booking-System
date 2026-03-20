const chalk = require('chalk');
const APIClient = require('../api');
const Utils = require('../utils');

/**
 * Show command handlers
 */
class ShowCommands {
  static async list(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      Utils.header('Shows', 'Fetching available shows...');

      const filters = {
        movieId: options.movie,
        theatreId: options.theatre,
        date: options.date,
        startDate: options.startDate,
        endDate: options.endDate,
        limit: parseInt(options.limit),
        offset: parseInt(options.offset)
      };

      // Validate date formats
      if (options.date && !Utils.validateDate(options.date)) {
        Utils.error('Invalid date format. Please use YYYY-MM-DD format.');
        process.exit(1);
      }

      if (options.startDate && !Utils.validateDate(options.startDate)) {
        Utils.error('Invalid start date format. Please use YYYY-MM-DD format.');
        process.exit(1);
      }

      if (options.endDate && !Utils.validateDate(options.endDate)) {
        Utils.error('Invalid end date format. Please use YYYY-MM-DD format.');
        process.exit(1);
      }

      const spinner = Utils.spinner('Loading shows...');
      spinner.start();

      try {
        const shows = await api.getShows(filters);
        spinner.stop();

        if (!shows || shows.length === 0) {
          Utils.warning('No shows found matching your criteria.');
          return;
        }

        Utils.displayShows(shows, { showCount: true });

        // Show applied filters
        const appliedFilters = [];
        if (options.movie) appliedFilters.push(`Movie ID: ${options.movie}`);
        if (options.theatre) appliedFilters.push(`Theatre ID: ${options.theatre}`);
        if (options.date) appliedFilters.push(`Date: ${options.date}`);
        if (options.startDate) appliedFilters.push(`From: ${options.startDate}`);
        if (options.endDate) appliedFilters.push(`To: ${options.endDate}`);

        if (appliedFilters.length > 0) {
          console.log(chalk.gray('\nApplied filters: ' + appliedFilters.join(', ')));
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch shows: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list shows: ${error.message}`);
      process.exit(1);
    }
  }

  static async upcoming(options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      const days = parseInt(options.days);
      if (days < 1 || days > 90) {
        Utils.error('Days must be between 1 and 90.');
        process.exit(1);
      }

      Utils.header('Upcoming Shows', `Next ${days} days`);

      const spinner = Utils.spinner('Loading upcoming shows...');
      spinner.start();

      try {
        const shows = await api.getUpcomingShows(days, parseInt(options.limit));
        spinner.stop();

        if (!shows || shows.length === 0) {
          Utils.warning(`No upcoming shows found for the next ${days} days.`);
          return;
        }

        Utils.displayShows(shows, { showCount: true });

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch upcoming shows: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to list upcoming shows: ${error.message}`);
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

      const spinner = Utils.spinner('Loading show details...');
      spinner.start();

      try {
        const show = await api.getShow(id);
        spinner.stop();

        Utils.displayShowDetails(show);

        // Display movie details if available
        if (show.Movie) {
          console.log(chalk.bold.blue('\n📽  Movie Information'));
          console.log('');
          Utils.displayMovieDetails(show.Movie);
        }

        // Display theatre information if available
        if (show.Screen?.Theatre) {
          console.log(chalk.bold.blue('\n🏢 Theatre Information'));
          console.log('');
          const theatre = show.Screen.Theatre;
          console.log(`${chalk.blue('Name:')} ${theatre.name}`);
          console.log(`${chalk.blue('Location:')} ${theatre.location}, ${theatre.city}, ${theatre.state}`);
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch show details: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to show details: ${error.message}`);
      process.exit(1);
    }
  }

  static async seats(showId, options, command) {
    try {
      const globalOpts = command.parent?.parent?.opts() || {};
      const api = new APIClient({
        baseURL: globalOpts.apiUrl,
        timeout: parseInt(globalOpts.timeout),
        debug: globalOpts.debug
      });

      Utils.header('Seat Layout', `Show ID: ${showId}`);

      const spinner = Utils.spinner('Loading seat information...');
      spinner.start();

      try {
        // First get show details
        const show = await api.getShow(showId);

        // Then get available seats
        const seats = await api.getAvailableSeats(showId);
        spinner.stop();

        // Display show information first
        console.log(chalk.blue('Movie:'), show.Movie?.title || 'N/A');
        console.log(chalk.blue('Theatre:'), show.Screen?.Theatre?.name || 'N/A');
        console.log(chalk.blue('Show Time:'), Utils.formatDateTime(show.show_time));
        console.log(chalk.blue('Price:'), Utils.formatCurrency(show.price));

        if (!seats || seats.length === 0) {
          Utils.warning('No seat information available for this show.');
          return;
        }

        // Filter seats if needed
        let displaySeats = seats;
        if (options.availableOnly) {
          displaySeats = seats.filter(seat => seat.is_available !== false && seat.status !== 'BOOKED');
        }

        Utils.displaySeats(displaySeats, { showCount: true });

        // Show pricing information
        const regularSeats = seats.filter(s => s.seat_type === 'REGULAR');
        const premiumSeats = seats.filter(s => s.seat_type === 'PREMIUM');

        if (regularSeats.length > 0 || premiumSeats.length > 0) {
          console.log(chalk.blue('\n💰 Pricing:'));
          console.log(`  Base Price: ${Utils.formatCurrency(show.price)}`);
          if (premiumSeats.length > 0) {
            console.log(`  Premium seats may have additional charges`);
          }
        }

      } catch (error) {
        spinner.stop();
        Utils.error(`Failed to fetch seat information: ${error.message}`);
        process.exit(1);
      }

    } catch (error) {
      Utils.error(`Failed to display seats: ${error.message}`);
      process.exit(1);
    }
  }
}

module.exports = ShowCommands;