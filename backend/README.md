# Backend - Movie Ticket Booking System

This directory contains the backend application layer for the Movie Ticket Booking System. The backend serves as the API layer connecting the database to frontend clients.

---

## Table of Contents
- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)

---

## Overview

**Framework**: Node.js with Express (or Python with Flask/FastAPI)
**Architecture**: MVC (Model-View-Controller) pattern
**Database**: MySQL 8.0+ via mysql2 (or PyMySQL)

### Key Features
- RESTful API design
- Transaction-safe booking operations
- JWT authentication
- Request validation & sanitization
- Error handling & logging
- API rate limiting

---

## Directory Structure

```
backend/
├── src/
│   ├── config/                    # Configuration Files
│   │   ├── database.js            # DB connection pool
│   │   ├── jwt.js                 # JWT configuration
│   │   └── app.js                 # Express app setup
│   │
│   ├── controllers/               # Business Logic
│   │   ├── authController.js      # Login, register, logout
│   │   ├── movieController.js     # Movie CRUD operations
│   │   ├── theatreController.js   # Theatre management
│   │   ├── showController.js      # Show scheduling
│   │   ├── bookingController.js   # Booking engine (CRITICAL)
│   │   └── paymentController.js   # Payment processing
│   │
│   ├── models/                    # Data Access Layer
│   │   ├── User.js                # User model
│   │   ├── Movie.js               # Movie model
│   │   ├── Theatre.js             # Theatre model
│   │   ├── Show.js                # Show model
│   │   ├── Booking.js             # Booking model
│   │   └── Seat.js                # Seat model
│   │
│   ├── routes/                    # API Routes
│   │   ├── index.js               # Route aggregator
│   │   ├── authRoutes.js          # /api/auth/*
│   │   ├── movieRoutes.js         # /api/movies/*
│   │   ├── theatreRoutes.js       # /api/theatres/*
│   │   ├── showRoutes.js          # /api/shows/*
│   │   ├── bookingRoutes.js       # /api/bookings/*
│   │   └── adminRoutes.js         # /api/admin/*
│   │
│   ├── middleware/                # Custom Middleware
│   │   ├── auth.js                # JWT verification
│   │   ├── validate.js            # Request validation
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── rateLimiter.js         # Rate limiting
│   │   └── logger.js              # Request logging
│   │
│   └── utils/                     # Helper Functions
│       ├── logger.js              # Winston logger
│       ├── response.js            # Standard response format
│       ├── password.js            # bcrypt utilities
│       └── transaction.js         # DB transaction helpers
│
├── tests/
│   ├── unit/                      # Unit Tests
│   │   ├── controllers/           # Controller tests
│   │   ├── models/                # Model tests
│   │   └── utils/                 # Utility tests
│   │
│   ├── integration/               # Integration Tests
│   │   ├── auth.test.js           # Auth flow tests
│   │   ├── booking.test.js        # Booking flow tests
│   │   └── movies.test.js         # Movie API tests
│   │
│   └── stress/                    # Stress & Concurrency Tests
│       ├── concurrent-bookings.js # Test parallel bookings
│       └── load-test.js           # Performance testing
│
├── .env.example                   # Environment template
├── .eslintrc.js                   # ESLint configuration
├── jest.config.js                 # Jest test configuration
├── package.json                   # Dependencies
├── server.js                      # Entry point
└── README.md                      # This file
```

---

## Setup Instructions

### Prerequisites
- Node.js 16+ (or Python 3.9+)
- MySQL 8.0+ (with database already set up)
- npm or yarn (or pip for Python)

### Step 1: Install Dependencies

**Node.js:**
```bash
cd backend
npm install
```

**Python:**
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Environment Variables** (.env):
```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=movie_booking
DB_USER=root
DB_PASSWORD=your_password
DB_CONNECTION_LIMIT=10

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Step 3: Run the Server
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start

# Python
python app.py
```

The server should start on `http://localhost:3000`

---

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
Most endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints Overview

#### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | User registration | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |
| POST | `/auth/refresh` | Refresh JWT token | Yes |
| GET | `/auth/profile` | Get user profile | Yes |

#### Movies (`/api/movies`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/movies` | List all movies | No |
| GET | `/movies/:id` | Get movie details | No |
| GET | `/movies/:id/shows` | Get shows for movie | No |
| POST | `/movies` | Create movie (admin) | Yes (Admin) |
| PUT | `/movies/:id` | Update movie (admin) | Yes (Admin) |
| DELETE | `/movies/:id` | Delete movie (admin) | Yes (Admin) |

#### Theatres (`/api/theatres`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/theatres` | List all theatres | No |
| GET | `/theatres/:id` | Get theatre details | No |
| GET | `/theatres/:id/screens` | Get screens in theatre | No |

#### Shows (`/api/shows`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/shows` | List shows (with filters) | No |
| GET | `/shows/:id` | Get show details | No |
| GET | `/shows/:id/seats` | Get available seats | No |

#### Bookings (`/api/bookings`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/bookings` | User's booking history | Yes |
| GET | `/bookings/:id` | Get booking details | Yes |
| POST | `/bookings` | Create new booking | Yes |
| DELETE | `/bookings/:id` | Cancel booking | Yes |

### Example Requests

#### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "phone": "1234567890"
  }'
```

#### Book Tickets
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "show_id": 101,
    "seat_ids": [10, 11, 12],
    "payment_method": "CREDIT_CARD"
  }'
```

#### Get Available Seats
```bash
curl http://localhost:3000/api/shows/101/seats
```

---

## Development

### Code Style
- **Linting**: ESLint with Airbnb style guide
- **Formatting**: Prettier
- **Naming**: camelCase for variables, PascalCase for classes

### Running in Development Mode
```bash
# With nodemon (auto-restart)
npm run dev

# Debug mode
npm run debug
```

### Database Connection
```javascript
// src/config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

### Transaction Pattern
```javascript
// src/utils/transaction.js
async function bookTickets(userId, showId, seatIds) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock seats
    await connection.query(
      'SELECT seat_id FROM Seats WHERE seat_id IN (?) FOR UPDATE',
      [seatIds]
    );

    // Create booking
    const [result] = await connection.query(
      'INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (?, ?, ?, ?)',
      [userId, showId, totalAmount, 'CONFIRMED']
    );

    const bookingId = result.insertId;

    // Link seats
    const values = seatIds.map(seatId => [bookingId, seatId]);
    await connection.query(
      'INSERT INTO Booking_Seats (booking_id, seat_id) VALUES ?',
      [values]
    );

    await connection.commit();
    return bookingId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

---

## Testing

### Run Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Stress tests
npm run test:stress

# With coverage
npm run test:coverage
```

### Test Structure
```javascript
// tests/integration/booking.test.js
describe('Booking API', () => {
  test('should book tickets successfully', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        show_id: 101,
        seat_ids: [10, 11, 12],
        payment_method: 'CREDIT_CARD'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('should prevent double booking', async () => {
    // Simulate concurrent requests
    const requests = Array(10).fill().map(() =>
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          show_id: 101,
          seat_ids: [10],
          payment_method: 'CREDIT_CARD'
        })
    );

    const responses = await Promise.allSettled(requests);
    const successful = responses.filter(r => r.value?.status === 201);

    expect(successful.length).toBe(1); // Only one should succeed
  });
});
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_FAILED",
    "message": "Selected seats are no longer available",
    "details": {
      "unavailable_seats": [10, 11]
    }
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `SEATS_UNAVAILABLE` | 409 | Seats already booked |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Deployment

### Build for Production
```bash
npm run build
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up logging (Winston/Sentry)
- [ ] Enable CORS for allowed origins
- [ ] Configure database connection pooling
- [ ] Set up monitoring (PM2/New Relic)

### Docker Deployment (Coming Soon)
```bash
docker build -t movie-booking-backend .
docker run -p 3000:3000 --env-file .env movie-booking-backend
```

---

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [mysql2 Documentation](https://github.com/sidorares/node-mysql2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- Project documentation: [../docs/](../docs/)

---

**Remember**: This backend prioritizes transaction safety and data integrity. Always test concurrency scenarios before deploying.
