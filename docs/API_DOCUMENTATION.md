# Movie Ticket Booking System - API Documentation

## Overview

The Movie Ticket Booking System provides a comprehensive REST API for managing movie bookings, theatres, shows, and user authentication. The API follows RESTful principles and uses JSON for request and response data.

### Base URL
```
http://localhost:5000/api
```

### API Version
- **Current Version**: v1.0
- **Date**: March 2026

## Authentication & Authorization

### Authentication Methods

#### JWT Bearer Token
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

#### User Roles
- **USER**: Regular users who can book tickets and manage their bookings
- **ADMIN**: Administrative users with full access to all resources

### Obtaining Authentication Token

1. **Register a new account** or **Login with existing credentials**
2. The API will return a JWT token in the response
3. Use this token in the Authorization header for subsequent requests

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": ["Additional error details"],
    "path": "/api/endpoint"
  },
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per IP address
- **Headers Included**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when rate limit resets

## Error Handling

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate data) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Authentication failed |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DUPLICATE_ENTRY` | Duplicate data entry |
| `BOOKING_CONFLICT` | Seat already booked |
| `PAYMENT_ERROR` | Payment processing failed |
| `DATABASE_ERROR` | Database operation failed |

## API Endpoints

### Authentication Endpoints

#### Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Validation Rules:**
- `username`: 3-50 characters, alphanumeric + underscores only
- `email`: Valid email format
- `password`: Min 8 characters, must contain uppercase, lowercase, and digit

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER",
      "created_at": "2026-03-20T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

#### Login User
**POST** `/api/auth/login`

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### Movie Endpoints

#### List Movies
**GET** `/api/movies`

Retrieve a list of all movies with optional filtering.

**Query Parameters:**
- `genre` (optional): Filter by genre (ACTION, COMEDY, DRAMA, etc.)
- `language` (optional): Filter by language
- `rating` (optional): Filter by rating (G, PG, PG-13, R, NC-17, NR)
- `limit` (optional): Number of results (max 100, default 20)
- `offset` (optional): Number of results to skip (default 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "movies": [
      {
        "id": 1,
        "title": "The Dark Knight",
        "description": "A Batman movie...",
        "genre": "ACTION",
        "language": "English",
        "duration_minutes": 152,
        "release_date": "2008-07-18",
        "rating": "PG-13",
        "poster_url": "https://example.com/poster.jpg",
        "is_active": true,
        "created_at": "2026-03-15T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "hasNext": true
    }
  },
  "message": "Movies retrieved successfully"
}
```

#### Search Movies
**GET** `/api/movies/search`

Search movies by title, description, or other criteria.

**Query Parameters:**
- `q` (required): Search query (1-100 characters)

**Response (200):** Same format as List Movies

#### Get Movie Details
**GET** `/api/movies/{id}`

Retrieve detailed information about a specific movie.

**Path Parameters:**
- `id`: Movie ID (integer)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "movie": {
      "id": 1,
      "title": "The Dark Knight",
      "description": "A Batman movie...",
      "genre": "ACTION",
      "language": "English",
      "duration_minutes": 152,
      "release_date": "2008-07-18",
      "rating": "PG-13",
      "poster_url": "https://example.com/poster.jpg",
      "is_active": true,
      "created_at": "2026-03-15T00:00:00Z"
    }
  },
  "message": "Movie details retrieved successfully"
}
```

#### Create Movie (Admin Only)
**POST** `/api/movies`

Create a new movie entry.

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "New Movie",
  "description": "Movie description",
  "genre": "ACTION",
  "language": "English",
  "duration_minutes": 120,
  "release_date": "2026-04-01",
  "rating": "PG-13",
  "poster_url": "https://example.com/poster.jpg"
}
```

**Response (201):** Same format as Get Movie Details

#### Update Movie (Admin Only)
**PUT** `/api/movies/{id}`

Update an existing movie.

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Request Body:** Same as Create Movie

**Response (200):** Same format as Get Movie Details

#### Delete Movie (Admin Only)
**DELETE** `/api/movies/{id}`

Soft delete a movie (sets is_active to false).

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Movie deleted successfully"
}
```

### Theatre Endpoints

#### List Theatres
**GET** `/api/theatres`

Retrieve a list of all theatres.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "theatres": [
      {
        "id": 1,
        "name": "PVR Cinemas",
        "location": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "is_active": true,
        "created_at": "2026-03-10T00:00:00Z"
      }
    ]
  },
  "message": "Theatres retrieved successfully"
}
```

#### Get Theatre Details
**GET** `/api/theatres/{id}`

Retrieve detailed information about a specific theatre including its screens.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "theatre": {
      "id": 1,
      "name": "PVR Cinemas",
      "location": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "is_active": true,
      "screens": [
        {
          "id": 1,
          "screen_name": "Screen 1",
          "total_seats": 100,
          "screen_type": "IMAX"
        }
      ]
    }
  },
  "message": "Theatre details retrieved successfully"
}
```

### Show Endpoints

#### List Shows
**GET** `/api/shows`

Retrieve a list of shows with optional filtering.

**Query Parameters:**
- `movieId` (optional): Filter by movie ID
- `theatreId` (optional): Filter by theatre ID
- `date` (optional): Filter by specific date (YYYY-MM-DD)
- `startDate` (optional): Filter from start date
- `endDate` (optional): Filter to end date

**Response (200):**
```json
{
  "success": true,
  "data": {
    "shows": [
      {
        "id": 1,
        "movie_id": 1,
        "screen_id": 1,
        "show_time": "2026-03-20T18:30:00Z",
        "price": 250.00,
        "is_active": true,
        "movie": {
          "title": "The Dark Knight",
          "duration_minutes": 152
        },
        "theatre": {
          "name": "PVR Cinemas",
          "location": "Mumbai"
        },
        "screen": {
          "screen_name": "Screen 1"
        }
      }
    ]
  },
  "message": "Shows retrieved successfully"
}
```

#### Get Show Details
**GET** `/api/shows/{id}`

Retrieve detailed information about a specific show.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "show": {
      "id": 1,
      "movie_id": 1,
      "screen_id": 1,
      "show_time": "2026-03-20T18:30:00Z",
      "price": 250.00,
      "is_active": true,
      "movie": {
        "id": 1,
        "title": "The Dark Knight",
        "genre": "ACTION",
        "duration_minutes": 152
      },
      "theatre": {
        "id": 1,
        "name": "PVR Cinemas",
        "location": "123 Main Street",
        "city": "Mumbai"
      },
      "screen": {
        "id": 1,
        "screen_name": "Screen 1",
        "total_seats": 100,
        "screen_type": "IMAX"
      }
    }
  },
  "message": "Show details retrieved successfully"
}
```

#### Get Available Seats
**GET** `/api/shows/{id}/seats`

Retrieve available seats for a specific show.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "show": {
      "id": 1,
      "show_time": "2026-03-20T18:30:00Z",
      "price": 250.00
    },
    "seats": [
      {
        "seat_id": 1,
        "seat_number": "A1",
        "seat_type": "PREMIUM",
        "is_available": true
      },
      {
        "seat_id": 2,
        "seat_number": "A2",
        "seat_type": "REGULAR",
        "is_available": false
      }
    ],
    "summary": {
      "total_seats": 100,
      "available_seats": 75,
      "booked_seats": 25
    }
  },
  "message": "Seat availability retrieved successfully"
}
```

### Booking Endpoints (CRITICAL)

#### Create Booking
**POST** `/api/bookings`

Create a new ticket booking. This is the most critical endpoint and uses stored procedures for transaction safety.

**Headers:**
```http
Authorization: Bearer <user-token>
```

**Request Body:**
```json
{
  "showId": 1,
  "seatIds": [1, 2, 3],
  "paymentMethod": "CREDIT_CARD"
}
```

**Validation Rules:**
- `showId`: Must be a valid, active show ID
- `seatIds`: Array of valid seat IDs (1-10 seats per booking)
- `paymentMethod`: Must be one of: CREDIT_CARD, DEBIT_CARD, UPI, NET_BANKING

**Response (201):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 123,
      "user_id": 456,
      "show_id": 1,
      "booking_time": "2026-03-20T10:30:00Z",
      "total_amount": 750.00,
      "status": "CONFIRMED",
      "show": {
        "movie_title": "The Dark Knight",
        "show_time": "2026-03-20T18:30:00Z",
        "theatre_name": "PVR Cinemas"
      },
      "seats": [
        {
          "seat_number": "A1",
          "seat_type": "PREMIUM"
        },
        {
          "seat_number": "A2",
          "seat_type": "PREMIUM"
        }
      ],
      "payment": {
        "id": 789,
        "amount": 750.00,
        "payment_method": "CREDIT_CARD",
        "payment_status": "SUCCESS",
        "transaction_id": "TXN123456"
      }
    }
  },
  "message": "Booking created successfully"
}
```

**Error Scenarios:**
- **400**: Invalid request data
- **409**: Seats already booked by another user
- **422**: Payment processing failed

#### Get User Bookings
**GET** `/api/bookings/my-bookings`

Retrieve bookings for the authenticated user.

**Headers:**
```http
Authorization: Bearer <user-token>
```

**Query Parameters:**
- `status` (optional): Filter by status (CONFIRMED, CANCELLED)
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (max 50, default 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 123,
        "show_id": 1,
        "booking_time": "2026-03-20T10:30:00Z",
        "total_amount": 750.00,
        "status": "CONFIRMED",
        "show": {
          "movie_title": "The Dark Knight",
          "show_time": "2026-03-20T18:30:00Z",
          "theatre_name": "PVR Cinemas",
          "screen_name": "Screen 1"
        },
        "seats_count": 2,
        "seats": [
          {
            "seat_number": "A1",
            "seat_type": "PREMIUM"
          }
        ]
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "hasNext": false
    }
  },
  "message": "User bookings retrieved successfully"
}
```

#### Get Booking Details
**GET** `/api/bookings/{id}`

Retrieve detailed information about a specific booking.

**Headers:**
```http
Authorization: Bearer <user-token>
```

**Authorization**: Users can only access their own bookings; admins can access all bookings.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 123,
      "user_id": 456,
      "show_id": 1,
      "booking_time": "2026-03-20T10:30:00Z",
      "total_amount": 750.00,
      "status": "CONFIRMED",
      "user": {
        "id": 456,
        "username": "john_doe",
        "email": "john@example.com"
      },
      "show": {
        "id": 1,
        "movie_title": "The Dark Knight",
        "show_time": "2026-03-20T18:30:00Z",
        "price": 250.00,
        "theatre_name": "PVR Cinemas",
        "screen_name": "Screen 1"
      },
      "seats": [
        {
          "seat_id": 1,
          "seat_number": "A1",
          "seat_type": "PREMIUM"
        }
      ],
      "payment": {
        "id": 789,
        "amount": 750.00,
        "payment_method": "CREDIT_CARD",
        "payment_status": "SUCCESS",
        "transaction_id": "TXN123456",
        "payment_time": "2026-03-20T10:30:05Z"
      }
    }
  },
  "message": "Booking details retrieved successfully"
}
```

#### Cancel Booking
**PUT** `/api/bookings/{id}/cancel`

Cancel an existing booking. Uses stored procedure for transaction safety.

**Headers:**
```http
Authorization: Bearer <user-token>
```

**Authorization**: Users can only cancel their own bookings; admins can cancel any booking.

**Business Rules:**
- Bookings can only be cancelled up to 2 hours before show time
- Refund amount is calculated based on cancellation policy
- Seat availability is automatically updated

**Response (200):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 123,
      "status": "CANCELLED",
      "cancelled_at": "2026-03-20T12:00:00Z",
      "refund_amount": 675.00,
      "cancellation_fee": 75.00
    }
  },
  "message": "Booking cancelled successfully"
}
```

**Error Scenarios:**
- **400**: Booking cannot be cancelled (too close to show time)
- **404**: Booking not found
- **409**: Booking already cancelled

#### List All Bookings (Admin Only)
**GET** `/api/bookings`

Retrieve all bookings in the system (admin only).

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `status` (optional): Filter by status
- `dateFrom` (optional): Start date filter (YYYY-MM-DD)
- `dateTo` (optional): End date filter (YYYY-MM-DD)
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (max 50, default 50)

**Response (200):** Similar to Get User Bookings but includes all users' bookings

## Security Considerations

### Data Protection
- All passwords are hashed using bcrypt
- JWT tokens have configurable expiration times
- Sensitive data is never logged or exposed in error messages

### Input Validation
- All API endpoints use comprehensive input validation
- SQL injection protection through parameterized queries
- Request size limits to prevent DOS attacks

### Business Logic Security
- Amount calculation is always performed server-side
- Seat booking uses database locks to prevent race conditions
- Authorization checks are enforced at multiple levels

## Performance Considerations

### Caching Strategy
- Movie and theatre data is cacheable (rarely changes)
- Show availability is calculated in real-time
- User-specific data is never cached

### Database Optimization
- All foreign key columns are indexed
- Complex queries use stored procedures
- Connection pooling is implemented

### Concurrency Handling
- Critical operations use database transactions
- SELECT...FOR UPDATE locks prevent race conditions
- Retry mechanisms for transient failures

## Pagination

All list endpoints support pagination with the following parameters:

- `page`: Page number (starts from 1)
- `limit`: Items per page (max varies by endpoint)

Pagination response includes:
```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Testing

### Test Environment
- Base URL: `http://localhost:5000/api`
- Use Postman collection: `docs/postman_collection.json`

### Test Credentials
```json
{
  "user": {
    "email": "testuser@example.com",
    "password": "TestPass123"
  },
  "admin": {
    "email": "admin@example.com",
    "password": "AdminPass123"
  }
}
```

## Changelog

### Version 1.0 (March 2026)
- Initial API release
- Authentication and authorization
- Complete CRUD operations for all entities
- Transaction-safe booking system
- Comprehensive error handling

---

## Support

For API support or questions:
- **Documentation**: [API_EXAMPLES.md](./API_EXAMPLES.md)
- **OpenAPI Spec**: [openapi.yaml](./openapi.yaml)
- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)

---

*Last updated: March 20, 2026*