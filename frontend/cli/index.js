#!/usr/bin/env node

require('dotenv').config();
const { Command } = require('commander');
const chalk = require('chalk');
const packageInfo = require('./package.json');

// Import command modules
const authCommands = require('./src/commands/authCommands');
const movieCommands = require('./src/commands/movieCommands');
const showCommands = require('./src/commands/showCommands');
const bookingCommands = require('./src/commands/bookingCommands');
const theatreCommands = require('./src/commands/theatreCommands');

const program = new Command();

// Program configuration
program
  .name('movie-booking')
  .description('Command-line interface for the Movie Ticket Booking System')
  .version(packageInfo.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command');

// Global options
program
  .option('--api-url <url>', 'API base URL', process.env.API_URL || 'http://localhost:3000/api')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '10000')
  .option('--debug', 'Enable debug output')
  .option('--no-color', 'Disable colored output');

// Auth commands
const auth = program.command('auth').description('Authentication commands');
auth
  .command('login')
  .description('Login to the booking system')
  .option('-e, --email <email>', 'User email')
  .option('-p, --password <password>', 'User password')
  .option('-i, --interactive', 'Use interactive prompts', true)
  .action(authCommands.login);

auth
  .command('register')
  .description('Register a new user account')
  .option('-u, --username <username>', 'Username')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .option('-i, --interactive', 'Use interactive prompts', true)
  .action(authCommands.register);

auth
  .command('logout')
  .description('Logout from the booking system')
  .action(authCommands.logout);

auth
  .command('status')
  .description('Show current authentication status')
  .action(authCommands.status);

// Movie commands
const movies = program.command('movies').description('Movie management commands');
movies
  .command('list')
  .description('List all movies')
  .option('-g, --genre <genre>', 'Filter by genre')
  .option('-l, --language <language>', 'Filter by language')
  .option('-r, --rating <rating>', 'Filter by rating')
  .option('--limit <number>', 'Limit number of results', '20')
  .option('--offset <number>', 'Offset for pagination', '0')
  .action(movieCommands.list);

movies
  .command('search <query>')
  .description('Search movies by title')
  .option('--limit <number>', 'Limit number of results', '10')
  .action(movieCommands.search);

movies
  .command('show <id>')
  .description('Show detailed information about a movie')
  .option('--include-shows', 'Include upcoming shows for this movie')
  .action(movieCommands.show);

movies
  .command('genres')
  .description('List all available genres')
  .action(movieCommands.genres);

movies
  .command('languages')
  .description('List all available languages')
  .action(movieCommands.languages);

// Show commands
const shows = program.command('shows').description('Show management commands');
shows
  .command('list')
  .description('List all shows')
  .option('-m, --movie <movieId>', 'Filter by movie ID')
  .option('-t, --theatre <theatreId>', 'Filter by theatre ID')
  .option('-d, --date <date>', 'Filter by date (YYYY-MM-DD)')
  .option('--start-date <date>', 'Filter from start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'Filter to end date (YYYY-MM-DD)')
  .option('--limit <number>', 'Limit number of results', '20')
  .option('--offset <number>', 'Offset for pagination', '0')
  .action(showCommands.list);

shows
  .command('upcoming')
  .description('List upcoming shows')
  .option('-d, --days <days>', 'Number of days to look ahead', '7')
  .option('--limit <number>', 'Limit number of results', '20')
  .action(showCommands.upcoming);

shows
  .command('show <id>')
  .description('Show detailed information about a specific show')
  .action(showCommands.show);

shows
  .command('seats <showId>')
  .description('Show available seats for a show')
  .option('-a, --available-only', 'Show only available seats')
  .action(showCommands.seats);

// Theatre commands
const theatres = program.command('theatres').description('Theatre management commands');
theatres
  .command('list')
  .description('List all theatres')
  .option('-l, --location <location>', 'Filter by location/city')
  .action(theatreCommands.list);

theatres
  .command('show <id>')
  .description('Show detailed information about a theatre')
  .option('--include-screens', 'Include screen details')
  .action(theatreCommands.show);

theatres
  .command('shows <theatreId>')
  .description('List shows at a specific theatre')
  .option('-d, --date <date>', 'Filter by date (YYYY-MM-DD)')
  .action(theatreCommands.shows);

// Booking commands
const bookings = program.command('bookings').description('Booking management commands');
bookings
  .command('list')
  .description('List your bookings')
  .option('-s, --status <status>', 'Filter by status (PENDING, CONFIRMED, CANCELLED)')
  .option('--limit <number>', 'Limit number of results', '20')
  .option('--page <number>', 'Page number for pagination', '1')
  .action(bookingCommands.list);

bookings
  .command('show <id>')
  .description('Show detailed booking information')
  .action(bookingCommands.show);

bookings
  .command('create')
  .description('Create a new booking (interactive)')
  .option('-s, --show <showId>', 'Show ID')
  .option('--seats <seatIds>', 'Comma-separated seat IDs')
  .option('-p, --payment <method>', 'Payment method (CREDIT_CARD, DEBIT_CARD, UPI, WALLET)')
  .option('-i, --interactive', 'Use interactive mode', true)
  .action(bookingCommands.create);

bookings
  .command('cancel <id>')
  .description('Cancel a booking')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(bookingCommands.cancel);

// Quick booking shortcut
program
  .command('book')
  .description('Quick booking interface (interactive)')
  .option('-s, --show <showId>', 'Show ID')
  .option('--seats <seatIds>', 'Comma-separated seat IDs')
  .option('-p, --payment <method>', 'Payment method')
  .action(bookingCommands.quickBook);

// Error handling
program.on('command:*', function (operands) {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log('Use', chalk.cyan('movie-booking --help'), 'to see available commands');
  process.exit(1);
});

// Handle missing subcommand
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ movie-booking auth login');
  console.log('  $ movie-booking movies search "Avengers"');
  console.log('  $ movie-booking shows upcoming --days 3');
  console.log('  $ movie-booking book');
  console.log('  $ movie-booking bookings list');
  console.log('');
  console.log('Get help for a specific command:');
  console.log('  $ movie-booking <command> --help');
  console.log('');
});

// Global error handler
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Unhandled error:'), err.message);
  if (program.opts().debug) {
    console.error(err);
  }
  process.exit(1);
});

// Parse arguments
if (require.main === module) {
  program.parse();
}

module.exports = program;