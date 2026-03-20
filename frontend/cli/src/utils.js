const chalk = require('chalk');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const ora = require('ora');
const moment = require('moment');

/**
 * CLI Utilities for Movie Booking System
 * Provides formatting, display, and interactive utility functions
 */
class Utils {
  /**
   * Display success message
   */
  static success(message) {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Display error message
   */
  static error(message) {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Display warning message
   */
  static warning(message) {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Display info message
   */
  static info(message) {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Display header with title
   */
  static header(title, subtitle = null) {
    console.log('');
    console.log(chalk.bold.blue(`📽  ${title}`));
    if (subtitle) {
      console.log(chalk.gray(`   ${subtitle}`));
    }
    console.log('');
  }

  /**
   * Create a spinner for long-running operations
   */
  static spinner(text = 'Loading...') {
    return ora({
      text,
      spinner: 'dots',
      color: 'blue'
    });
  }

  /**
   * Format date for display
   */
  static formatDate(date, format = 'MMM DD, YYYY') {
    return moment(date).format(format);
  }

  /**
   * Format time for display
   */
  static formatTime(time, format = 'hh:mm A') {
    return moment(time).format(format);
  }

  /**
   * Format datetime for display
   */
  static formatDateTime(datetime, format = 'MMM DD, YYYY hh:mm A') {
    return moment(datetime).format(format);
  }

  /**
   * Format currency
   */
  static formatCurrency(amount, currency = '₹') {
    return `${currency}${parseFloat(amount).toFixed(2)}`;
  }

  /**
   * Format duration in minutes to hours and minutes
   */
  static formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  /**
   * Display movies in a table format
   */
  static displayMovies(movies, options = {}) {
    if (!movies || movies.length === 0) {
      this.warning('No movies found.');
      return;
    }

    const table = new Table({
      head: ['ID', 'Title', 'Genre', 'Language', 'Duration', 'Rating', 'Release Date'].map(h => chalk.blue(h)),
      style: {
        head: [],
        border: ['grey']
      },
      colWidths: [5, 25, 12, 10, 10, 8, 12]
    });

    movies.forEach(movie => {
      table.push([
        movie.movie_id,
        movie.title.length > 22 ? movie.title.substring(0, 19) + '...' : movie.title,
        movie.genre,
        movie.language,
        this.formatDuration(movie.duration_minutes),
        movie.rating || 'NR',
        this.formatDate(movie.release_date, 'MMM DD, YY')
      ]);
    });

    console.log(table.toString());

    if (options.showCount) {
      console.log(chalk.gray(`\nShowing ${movies.length} movie(s)`));
    }
  }

  /**
   * Display shows in a table format
   */
  static displayShows(shows, options = {}) {
    if (!shows || shows.length === 0) {
      this.warning('No shows found.');
      return;
    }

    const table = new Table({
      head: ['ID', 'Movie', 'Theatre', 'Screen', 'Show Time', 'Price'].map(h => chalk.blue(h)),
      style: {
        head: [],
        border: ['grey']
      },
      colWidths: [5, 25, 25, 8, 18, 10]
    });

    shows.forEach(show => {
      const movieTitle = show.movie_title || show.Movie?.title || 'N/A';
      const theatreName = show.theatre_name || show.Screen?.Theatre?.name || 'N/A';
      const screenName = show.screen_name || show.Screen?.screen_name || `Screen ${show.screen_id}`;

      table.push([
        show.show_id,
        movieTitle.length > 22 ? movieTitle.substring(0, 19) + '...' : movieTitle,
        theatreName.length > 22 ? theatreName.substring(0, 19) + '...' : theatreName,
        screenName,
        this.formatDateTime(show.show_time),
        this.formatCurrency(show.price)
      ]);
    });

    console.log(table.toString());

    if (options.showCount) {
      console.log(chalk.gray(`\nShowing ${shows.length} show(s)`));
    }
  }

  /**
   * Display theatres in a table format
   */
  static displayTheatres(theatres, options = {}) {
    if (!theatres || theatres.length === 0) {
      this.warning('No theatres found.');
      return;
    }

    const table = new Table({
      head: ['ID', 'Name', 'Location', 'City', 'State'].map(h => chalk.blue(h)),
      style: {
        head: [],
        border: ['grey']
      },
      colWidths: [5, 25, 30, 15, 15]
    });

    theatres.forEach(theatre => {
      table.push([
        theatre.theatre_id,
        theatre.name.length > 22 ? theatre.name.substring(0, 19) + '...' : theatre.name,
        theatre.location.length > 27 ? theatre.location.substring(0, 24) + '...' : theatre.location,
        theatre.city,
        theatre.state
      ]);
    });

    console.log(table.toString());

    if (options.showCount) {
      console.log(chalk.gray(`\nShowing ${theatres.length} theatre(s)`));
    }
  }

  /**
   * Display bookings in a table format
   */
  static displayBookings(bookings, options = {}) {
    if (!bookings || bookings.length === 0) {
      this.warning('No bookings found.');
      return;
    }

    const table = new Table({
      head: ['ID', 'Movie', 'Show Time', 'Theatre', 'Seats', 'Amount', 'Status'].map(h => chalk.blue(h)),
      style: {
        head: [],
        border: ['grey']
      },
      colWidths: [8, 20, 18, 20, 12, 10, 12]
    });

    bookings.forEach(booking => {
      const movieTitle = booking.movie_title || booking.Show?.Movie?.title || 'N/A';
      const theatreName = booking.theatre_name || booking.Show?.Screen?.Theatre?.name || 'N/A';
      const showTime = booking.show_time || booking.Show?.show_time || 'N/A';
      const seatCount = booking.seat_count || booking.BookingSeats?.length || 0;

      // Color code status
      let statusColor = chalk.gray;
      if (booking.status === 'CONFIRMED') statusColor = chalk.green;
      else if (booking.status === 'CANCELLED') statusColor = chalk.red;
      else if (booking.status === 'PENDING') statusColor = chalk.yellow;

      table.push([
        booking.booking_id,
        movieTitle.length > 17 ? movieTitle.substring(0, 14) + '...' : movieTitle,
        this.formatDateTime(showTime, 'MMM DD, hh:mm A'),
        theatreName.length > 17 ? theatreName.substring(0, 14) + '...' : theatreName,
        `${seatCount} seat(s)`,
        this.formatCurrency(booking.total_amount),
        statusColor(booking.status)
      ]);
    });

    console.log(table.toString());

    if (options.showCount) {
      console.log(chalk.gray(`\nShowing ${bookings.length} booking(s)`));
    }
  }

  /**
   * Display seats layout
   */
  static displaySeats(seats, options = {}) {
    if (!seats || seats.length === 0) {
      this.warning('No seats found.');
      return;
    }

    console.log(chalk.bold.blue('\n🎬 Screen Layout\n'));

    // Group seats by row
    const seatsByRow = {};
    seats.forEach(seat => {
      const row = seat.seat_number.charAt(0);
      if (!seatsByRow[row]) {
        seatsByRow[row] = [];
      }
      seatsByRow[row].push(seat);
    });

    // Sort rows and seats within rows
    const sortedRows = Object.keys(seatsByRow).sort();

    // Display screen
    console.log(chalk.gray('     ') + chalk.white.bgGray('                 SCREEN                 '));
    console.log('');

    sortedRows.forEach(row => {
      const rowSeats = seatsByRow[row].sort((a, b) => {
        const numA = parseInt(a.seat_number.substring(1));
        const numB = parseInt(b.seat_number.substring(1));
        return numA - numB;
      });

      let rowDisplay = chalk.bold.blue(`${row}    `);

      rowSeats.forEach(seat => {
        let seatSymbol;
        if (seat.is_available === false || seat.status === 'BOOKED') {
          seatSymbol = chalk.red('■'); // Booked seat
        } else if (seat.seat_type === 'PREMIUM') {
          seatSymbol = chalk.yellow('▲'); // Premium available seat
        } else {
          seatSymbol = chalk.green('□'); // Regular available seat
        }
        rowDisplay += seatSymbol + ' ';
      });

      console.log(rowDisplay);
    });

    // Legend
    console.log('');
    console.log(chalk.gray('Legend:'));
    console.log(`  ${chalk.green('□')} Available (Regular)    ${chalk.yellow('▲')} Available (Premium)    ${chalk.red('■')} Booked`);

    if (options.showCount) {
      const available = seats.filter(s => s.is_available !== false && s.status !== 'BOOKED').length;
      const total = seats.length;
      console.log(chalk.gray(`\n${available} of ${total} seats available`));
    }
  }

  /**
   * Display detailed movie information
   */
  static displayMovieDetails(movie) {
    console.log('');
    console.log(chalk.bold.blue('📽  Movie Details'));
    console.log('');

    const details = new Table({
      chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
             , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
             , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
             , 'right': '' , 'right-mid': '' },
      style: { 'padding-left': 2, 'padding-right': 2 },
      colWidths: [15, 50]
    });

    details.push(
      [chalk.blue('Title'), movie.title],
      [chalk.blue('Genre'), movie.genre],
      [chalk.blue('Language'), movie.language],
      [chalk.blue('Duration'), this.formatDuration(movie.duration_minutes)],
      [chalk.blue('Rating'), movie.rating || 'Not Rated'],
      [chalk.blue('Release Date'), this.formatDate(movie.release_date)],
      [chalk.blue('Description'), movie.description]
    );

    console.log(details.toString());
  }

  /**
   * Display detailed show information
   */
  static displayShowDetails(show) {
    console.log('');
    console.log(chalk.bold.blue('🎭 Show Details'));
    console.log('');

    const details = new Table({
      chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
             , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
             , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
             , 'right': '' , 'right-mid': '' },
      style: { 'padding-left': 2, 'padding-right': 2 },
      colWidths: [15, 50]
    });

    details.push(
      [chalk.blue('Show ID'), show.show_id],
      [chalk.blue('Movie'), show.Movie?.title || show.movie_title || 'N/A'],
      [chalk.blue('Theatre'), show.Screen?.Theatre?.name || show.theatre_name || 'N/A'],
      [chalk.blue('Screen'), show.Screen?.screen_name || `Screen ${show.screen_id}`],
      [chalk.blue('Show Time'), this.formatDateTime(show.show_time)],
      [chalk.blue('Price'), this.formatCurrency(show.price)]
    );

    console.log(details.toString());
  }

  /**
   * Display detailed booking information
   */
  static displayBookingDetails(booking) {
    console.log('');
    console.log(chalk.bold.blue('🎫 Booking Details'));
    console.log('');

    // Color code status
    let statusColor = chalk.gray;
    if (booking.status === 'CONFIRMED') statusColor = chalk.green;
    else if (booking.status === 'CANCELLED') statusColor = chalk.red;
    else if (booking.status === 'PENDING') statusColor = chalk.yellow;

    const details = new Table({
      chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
             , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
             , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
             , 'right': '' , 'right-mid': '' },
      style: { 'padding-left': 2, 'padding-right': 2 },
      colWidths: [15, 50]
    });

    // Display booking info
    details.push(
      [chalk.blue('Booking ID'), booking.booking_id],
      [chalk.blue('Status'), statusColor(booking.status)],
      [chalk.blue('Movie'), booking.Show?.Movie?.title || booking.movie_title || 'N/A'],
      [chalk.blue('Theatre'), booking.Show?.Screen?.Theatre?.name || booking.theatre_name || 'N/A'],
      [chalk.blue('Screen'), booking.Show?.Screen?.screen_name || `Screen ${booking.Show?.screen_id}`],
      [chalk.blue('Show Time'), this.formatDateTime(booking.Show?.show_time || booking.show_time)],
      [chalk.blue('Total Amount'), this.formatCurrency(booking.total_amount)],
      [chalk.blue('Booked On'), this.formatDateTime(booking.booking_date || booking.createdAt)]
    );

    console.log(details.toString());

    // Display seats if available
    if (booking.BookingSeats && booking.BookingSeats.length > 0) {
      console.log(chalk.blue('\n🪑 Booked Seats:'));
      const seatNumbers = booking.BookingSeats.map(bs => bs.Seat?.seat_number || `ID:${bs.seat_id}`);
      console.log(`   ${seatNumbers.join(', ')}\n`);
    }

    // Display payment info if available
    if (booking.Payment) {
      console.log(chalk.blue('💳 Payment Information:'));
      const payment = booking.Payment;
      console.log(`   Method: ${payment.payment_method}`);
      console.log(`   Status: ${payment.payment_status}`);
      if (payment.payment_date) {
        console.log(`   Date: ${this.formatDateTime(payment.payment_date)}`);
      }
      console.log('');
    }
  }

  /**
   * Prompt for authentication
   */
  static async promptAuth(type = 'login') {
    if (type === 'login') {
      return await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          validate: input => input.includes('@') || 'Please enter a valid email address'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: input => input.length > 0 || 'Password cannot be empty'
        }
      ]);
    } else if (type === 'register') {
      return await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: 'Username:',
          validate: input => {
            if (input.length < 3) return 'Username must be at least 3 characters long';
            if (!/^[a-zA-Z0-9_]+$/.test(input)) return 'Username can only contain letters, numbers, and underscores';
            return true;
          }
        },
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          validate: input => input.includes('@') || 'Please enter a valid email address'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: input => {
            if (input.length < 8) return 'Password must be at least 8 characters long';
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input)) {
              return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
            }
            return true;
          }
        },
        {
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm Password:',
          mask: '*',
          validate: (input, answers) => {
            return input === answers.password || 'Passwords do not match';
          }
        }
      ]);
    }
  }

  /**
   * Prompt for confirmation
   */
  static async promptConfirm(message, defaultAnswer = false) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultAnswer
      }
    ]);
    return answer.confirmed;
  }

  /**
   * Prompt for selection from list
   */
  static async promptSelect(message, choices, pageSize = 10) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices,
        pageSize
      }
    ]);
    return answer.selected;
  }

  /**
   * Prompt for multiple selections
   */
  static async promptMultiSelect(message, choices, pageSize = 10) {
    const answer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message,
        choices,
        pageSize,
        validate: input => input.length > 0 || 'Please select at least one option'
      }
    ]);
    return answer.selected;
  }

  /**
   * Prompt for input with validation
   */
  static async promptInput(message, validate = null, defaultValue = null) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message,
        default: defaultValue,
        validate: validate || (input => input.length > 0 || 'This field cannot be empty')
      }
    ]);
    return answer.input;
  }

  /**
   * Parse comma-separated values
   */
  static parseCommaSeparated(input) {
    return input.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * Validate payment method
   */
  static validatePaymentMethod(method) {
    const validMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'WALLET'];
    return validMethods.includes(method.toUpperCase());
  }

  /**
   * Get payment method choices
   */
  static getPaymentMethodChoices() {
    return [
      { name: '💳 Credit Card', value: 'CREDIT_CARD' },
      { name: '💳 Debit Card', value: 'DEBIT_CARD' },
      { name: '📱 UPI', value: 'UPI' },
      { name: '💰 Wallet', value: 'WALLET' }
    ];
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  static validateDate(date) {
    return moment(date, 'YYYY-MM-DD', true).isValid();
  }

  /**
   * Get relative time string
   */
  static getRelativeTime(date) {
    return moment(date).fromNow();
  }
}

module.exports = Utils;