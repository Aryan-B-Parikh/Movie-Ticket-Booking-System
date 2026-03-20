# Movie Booking CLI

A professional command-line interface for the Movie Ticket Booking System. Book movie tickets, browse shows, and manage your bookings from the terminal with style.

## Features

- 🎬 **Movie Management**: Browse, search, and view movie details
- 🎭 **Show Listings**: View upcoming shows with filtering options
- 🏢 **Theatre Information**: Explore theatres and their locations
- 🎫 **Booking System**: Interactive ticket booking with seat selection
- 💳 **Payment Integration**: Multiple payment methods support
- 🔐 **Authentication**: Secure user registration and login
- 🎨 **Rich Interface**: Colorful tables, progress bars, and formatted output
- ⚡ **Fast Performance**: Optimized API communication and caching

## Installation

### Prerequisites

- Node.js 14.0 or higher
- Access to Movie Booking System backend API

### Local Installation

1. Clone the repository and navigate to the CLI directory:
   ```bash
   cd frontend/cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` file with your API settings:
   ```env
   API_URL=http://localhost:3000/api
   ```

### Global Installation

For system-wide access:

```bash
npm install -g .
```

After global installation, you can use `movie-booking` command from anywhere.

## Configuration

### Environment Variables

Create a `.env` file in the CLI directory:

```env
# API Configuration
API_URL=http://localhost:3000/api
API_TIMEOUT=10000

# CLI Settings
CLI_DEBUG=false
CLI_NO_COLOR=false

# Default Options
DEFAULT_MOVIE_LIMIT=20
DEFAULT_SHOW_LIMIT=20
DEFAULT_BOOKING_LIMIT=20
DEFAULT_UPCOMING_DAYS=7
```

### Command Line Options

Global options available for all commands:

- `--api-url <url>`: Override API base URL
- `--timeout <ms>`: Set request timeout (default: 10000ms)
- `--debug`: Enable debug output
- `--no-color`: Disable colored output

## Usage

### Basic Commands

```bash
# Show help
movie-booking --help

# Show version
movie-booking --version

# Quick booking (interactive)
movie-booking book
```

### Authentication

```bash
# Login (interactive)
movie-booking auth login

# Login with credentials
movie-booking auth login -e user@example.com -p password

# Register new account
movie-booking auth register

# Check authentication status
movie-booking auth status

# Logout
movie-booking auth logout
```

### Movies

```bash
# List all movies
movie-booking movies list

# List movies with filters
movie-booking movies list --genre ACTION --language English --limit 10

# Search movies
movie-booking movies search "Avengers"

# Show movie details
movie-booking movies show 1

# Show movie with upcoming shows
movie-booking movies show 1 --include-shows

# List available genres
movie-booking movies genres

# List available languages
movie-booking movies languages
```

### Shows

```bash
# List all shows
movie-booking shows list

# List upcoming shows (next 7 days)
movie-booking shows upcoming

# List upcoming shows for next 3 days
movie-booking shows upcoming --days 3

# Filter shows by movie
movie-booking shows list --movie 1

# Filter shows by theatre
movie-booking shows list --theatre 2

# Filter shows by date
movie-booking shows list --date 2026-03-25

# Filter shows by date range
movie-booking shows list --start-date 2026-03-20 --end-date 2026-03-25

# Show details for a specific show
movie-booking shows show 1

# View available seats for a show
movie-booking shows seats 1

# View only available seats
movie-booking shows seats 1 --available-only
```

### Theatres

```bash
# List all theatres
movie-booking theatres list

# List theatres by location
movie-booking theatres list --location Mumbai

# Show theatre details
movie-booking theatres show 1

# Show theatre with screen information
movie-booking theatres show 1 --include-screens

# List shows at a specific theatre
movie-booking theatres shows 1

# List shows at theatre for specific date
movie-booking theatres shows 1 --date 2026-03-25
```

### Bookings

```bash
# List your bookings
movie-booking bookings list

# List bookings with filters
movie-booking bookings list --status CONFIRMED --limit 10

# Show booking details
movie-booking bookings show 1

# Create booking (interactive)
movie-booking bookings create

# Create booking with parameters
movie-booking bookings create --show 1 --seats "A1,A2" --payment CREDIT_CARD

# Cancel booking
movie-booking bookings cancel 1

# Cancel without confirmation
movie-booking bookings cancel 1 --force
```

## Interactive Booking Flow

The CLI provides an intuitive interactive booking experience:

```bash
movie-booking book
```

This will guide you through:

1. **Show Selection**: Browse and select from upcoming shows
2. **Seat Selection**: View seat layout and select preferred seats
3. **Payment Method**: Choose from available payment options
4. **Confirmation**: Review booking details before confirming

## Advanced Usage

### Filtering and Pagination

Most list commands support filtering and pagination:

```bash
# Movies with pagination
movie-booking movies list --limit 10 --offset 20

# Shows with multiple filters
movie-booking shows list --movie 1 --date 2026-03-25 --limit 5

# Bookings with status filter
movie-booking bookings list --status CONFIRMED --page 2
```

### Output Formats

The CLI provides rich, formatted output:

- **Tables**: Structured data display with colors
- **Seat Maps**: Visual representation of cinema seat layouts
- **Detailed Views**: Comprehensive information for individual items
- **Status Indicators**: Color-coded status and progress indicators

### Debug Mode

Enable debug mode for troubleshooting:

```bash
movie-booking --debug movies list
```

This will show:
- API request/response details
- Authentication status
- Error stack traces
- Performance metrics

## Error Handling

The CLI provides clear error messages and suggestions:

```bash
# Authentication required
movie-booking bookings list
# Error: Authentication required. Please login first with: movie-booking auth login

# Invalid date format
movie-booking shows list --date 2026-3-25
# Error: Invalid date format. Please use YYYY-MM-DD format.

# API connection issues
movie-booking movies list
# Error: Cannot connect to API server at http://localhost:3000/api
```

## Examples

### Quick Movie Search and Booking

```bash
# Search for a movie
movie-booking movies search "Spider-Man"

# View shows for the movie
movie-booking movies show 5 --include-shows

# View seats for a specific show
movie-booking shows seats 10

# Book tickets interactively
movie-booking book
```

### Check Today's Shows

```bash
# See what's showing today
movie-booking shows list --date $(date +%Y-%m-%d)

# Or upcoming shows for next 3 days
movie-booking shows upcoming --days 3
```

### Manage Your Bookings

```bash
# Check your booking history
movie-booking bookings list

# View details of a recent booking
movie-booking bookings show 5

# Cancel if needed
movie-booking bookings cancel 5
```

## Token Storage

Authentication tokens are securely stored in:
- **Windows**: `%USERPROFILE%\.movie-booking-cli\auth.json`
- **macOS/Linux**: `~/.movie-booking-cli/auth.json`

The CLI automatically handles token expiration and will prompt for re-authentication when needed.

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Ensure backend server is running
   # Check API_URL in .env file
   movie-booking auth status --debug
   ```

2. **Authentication Errors**
   ```bash
   # Clear stored credentials and login again
   movie-booking auth logout
   movie-booking auth login
   ```

3. **Permission Errors**
   ```bash
   # On Windows, run as administrator if needed
   # On macOS/Linux, check file permissions in ~/.movie-booking-cli/
   ```

### Debug Information

Use debug mode to get detailed information:

```bash
movie-booking --debug <command>
```

### Getting Help

```bash
# General help
movie-booking --help

# Command-specific help
movie-booking movies --help
movie-booking bookings create --help
```

## API Compatibility

This CLI is compatible with Movie Booking System API v1.0. Ensure your backend server is running and accessible at the configured API URL.

### Required API Endpoints

- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /movies` - List movies
- `GET /shows` - List shows
- `GET /theatres` - List theatres
- `POST /bookings` - Create bookings
- `GET /bookings/my-bookings` - List user bookings

## Development

### Project Structure

```
frontend/cli/
├── src/
│   ├── commands/          # Command implementations
│   │   ├── authCommands.js
│   │   ├── movieCommands.js
│   │   ├── showCommands.js
│   │   ├── bookingCommands.js
│   │   └── theatreCommands.js
│   ├── api.js            # API client
│   └── utils.js          # CLI utilities
├── index.js              # Main CLI entry point
├── package.json          # Dependencies and scripts
├── .env.example          # Environment configuration
└── README.md            # This file
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Use `--debug` flag for detailed error information