# API Examples - Movie Ticket Booking System

This document provides practical examples of using the Movie Ticket Booking System API, including complete workflows, request/response examples, and error scenarios.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication Flow](#authentication-flow)
3. [Complete Booking Workflow](#complete-booking-workflow)
4. [Movie Discovery](#movie-discovery)
5. [Theatre and Show Management](#theatre-and-show-management)
6. [Booking Management](#booking-management)
7. [Error Scenarios](#error-scenarios)
8. [Postman Collection](#postman-collection)

## Getting Started

### Base Configuration

```bash
# Environment Variables
API_BASE_URL=http://localhost:5000/api
CONTENT_TYPE=application/json
```

### Required Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>  # For protected endpoints
```

## Authentication Flow

### 1. User Registration

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywidXNlcm5hbWUiOiJqb2huX2RvZSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNjQyNjc0NjAwLCJleHAiOjE2NDI3NjEwMDB9.signature"
  },
  "message": "User registered successfully",
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

### 2. User Login

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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
  "message": "Login successful",
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

## Complete Booking Workflow

This section demonstrates the complete flow from finding a movie to booking tickets.

### Step 1: Search for Movies

**Request:**
```http
GET /api/movies/search?q=batman
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "movies": [
      {
        "id": 1,
        "title": "The Dark Knight",
        "description": "Batman faces the Joker in Gotham City...",
        "genre": "ACTION",
        "language": "English",
        "duration_minutes": 152,
        "release_date": "2008-07-18",
        "rating": "PG-13",
        "poster_url": "https://example.com/batman-poster.jpg",
        "is_active": true,
        "created_at": "2026-03-15T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "hasNext": false
    }
  },
  "message": "Movies retrieved successfully"
}
```

### Step 2: Find Shows for the Movie

**Request:**
```http
GET /api/shows?movieId=1&date=2026-03-20
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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
      },
      {
        "id": 2,
        "movie_id": 1,
        "screen_id": 1,
        "show_time": "2026-03-20T21:00:00Z",
        "price": 280.00,
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

### Step 3: Check Seat Availability

**Request:**
```http
GET /api/shows/1/seats
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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
        "seat_type": "PREMIUM",
        "is_available": true
      },
      {
        "seat_id": 3,
        "seat_number": "A3",
        "seat_type": "PREMIUM",
        "is_available": false
      },
      {
        "seat_id": 4,
        "seat_number": "B1",
        "seat_type": "REGULAR",
        "is_available": true
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

### Step 4: Create Booking (CRITICAL)

**Request:**
```http
POST /api/bookings
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "showId": 1,
  "seatIds": [1, 2],
  "paymentMethod": "CREDIT_CARD"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "user_id": 123,
      "show_id": 1,
      "booking_time": "2026-03-20T10:30:00Z",
      "total_amount": 500.00,
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
        "amount": 500.00,
        "payment_method": "CREDIT_CARD",
        "payment_status": "SUCCESS",
        "transaction_id": "TXN123456789"
      }
    }
  },
  "message": "Booking created successfully",
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

## Movie Discovery

### Get All Movies with Filters

**Request:**
```http
GET /api/movies?genre=ACTION&language=English&limit=5&offset=0
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "movies": [
      {
        "id": 1,
        "title": "The Dark Knight",
        "description": "Batman faces the Joker...",
        "genre": "ACTION",
        "language": "English",
        "duration_minutes": 152,
        "release_date": "2008-07-18",
        "rating": "PG-13",
        "poster_url": "https://example.com/batman.jpg",
        "is_active": true,
        "created_at": "2026-03-15T00:00:00Z"
      },
      {
        "id": 2,
        "title": "Mission Impossible",
        "description": "Tom Cruise does impossible things...",
        "genre": "ACTION",
        "language": "English",
        "duration_minutes": 147,
        "release_date": "2023-07-12",
        "rating": "PG-13",
        "poster_url": "https://example.com/mi.jpg",
        "is_active": true,
        "created_at": "2026-03-16T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 5,
      "offset": 0,
      "hasNext": true
    }
  },
  "message": "Movies retrieved successfully"
}
```

### Get Movie Details with Shows

**Request:**
```http
GET /api/movies/1/shows
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "movie": {
      "id": 1,
      "title": "The Dark Knight",
      "description": "Batman faces the Joker in Gotham City...",
      "genre": "ACTION",
      "language": "English",
      "duration_minutes": 152,
      "release_date": "2008-07-18",
      "rating": "PG-13",
      "poster_url": "https://example.com/batman-poster.jpg"
    },
    "shows": [
      {
        "id": 1,
        "show_time": "2026-03-20T18:30:00Z",
        "price": 250.00,
        "theatre": {
          "name": "PVR Cinemas",
          "location": "Mumbai",
          "city": "Mumbai"
        },
        "screen": {
          "screen_name": "Screen 1",
          "screen_type": "IMAX"
        }
      }
    ]
  },
  "message": "Movie with shows retrieved successfully"
}
```

## Theatre and Show Management

### List Theatres

**Request:**
```http
GET /api/theatres
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "theatres": [
      {
        "id": 1,
        "name": "PVR Cinemas",
        "location": "123 Main Street, Andheri",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "is_active": true,
        "created_at": "2026-03-10T00:00:00Z"
      },
      {
        "id": 2,
        "name": "INOX Megaplex",
        "location": "456 Mall Road, Bandra",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400050",
        "is_active": true,
        "created_at": "2026-03-11T00:00:00Z"
      }
    ]
  },
  "message": "Theatres retrieved successfully"
}
```

### Get Theatre with Screens

**Request:**
```http
GET /api/theatres/1
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "theatre": {
      "id": 1,
      "name": "PVR Cinemas",
      "location": "123 Main Street, Andheri",
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
        },
        {
          "id": 2,
          "screen_name": "Screen 2",
          "total_seats": 80,
          "screen_type": "REGULAR"
        }
      ]
    }
  },
  "message": "Theatre details retrieved successfully"
}
```

### Get Upcoming Shows

**Request:**
```http
GET /api/shows/upcoming?days=3
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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
      },
      {
        "id": 2,
        "movie_id": 1,
        "screen_id": 1,
        "show_time": "2026-03-21T15:00:00Z",
        "price": 220.00,
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
  "message": "Upcoming shows retrieved successfully"
}
```

## Booking Management

### Get User's Bookings

**Request:**
```http
GET /api/bookings/my-bookings?page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 456,
        "show_id": 1,
        "booking_time": "2026-03-20T10:30:00Z",
        "total_amount": 500.00,
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
          },
          {
            "seat_number": "A2",
            "seat_type": "PREMIUM"
          }
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "hasNext": false
    }
  },
  "message": "User bookings retrieved successfully"
}
```

### Get Booking Details

**Request:**
```http
GET /api/bookings/456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "user_id": 123,
      "show_id": 1,
      "booking_time": "2026-03-20T10:30:00Z",
      "total_amount": 500.00,
      "status": "CONFIRMED",
      "user": {
        "id": 123,
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
        },
        {
          "seat_id": 2,
          "seat_number": "A2",
          "seat_type": "PREMIUM"
        }
      ],
      "payment": {
        "id": 789,
        "amount": 500.00,
        "payment_method": "CREDIT_CARD",
        "payment_status": "SUCCESS",
        "transaction_id": "TXN123456789",
        "payment_time": "2026-03-20T10:30:05Z"
      }
    }
  },
  "message": "Booking details retrieved successfully"
}
```

### Cancel Booking

**Request:**
```http
PUT /api/bookings/456/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "status": "CANCELLED",
      "cancelled_at": "2026-03-20T12:00:00Z",
      "refund_amount": 450.00,
      "cancellation_fee": 50.00
    }
  },
  "message": "Booking cancelled successfully",
  "meta": {
    "timestamp": "2026-03-20T12:00:00Z",
    "api_version": "1.0"
  }
}
```

## Error Scenarios

### Authentication Error

**Request:**
```http
GET /api/bookings/my-bookings
# Missing Authorization header
```

**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Authentication required",
    "details": ["Authorization header is missing"],
    "path": "/api/bookings/my-bookings"
  },
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

### Validation Error

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "jo",
  "email": "invalid-email",
  "password": "123"
}
```

**Response:**
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      "Username must be between 3 and 50 characters",
      "Please provide a valid email",
      "Password must be at least 8 characters long"
    ],
    "path": "/api/auth/register"
  },
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

### Booking Conflict Error

**Request:**
```http
POST /api/bookings
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "showId": 1,
  "seatIds": [3, 4],
  "paymentMethod": "CREDIT_CARD"
}
```

**Response:**
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "One or more seats are already booked",
    "details": [
      "Seat A3 is already booked by another user",
      "Seat A4 is not available for booking"
    ],
    "path": "/api/bookings"
  },
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

### Cancellation Not Allowed

**Request:**
```http
PUT /api/bookings/456/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "CANCELLATION_NOT_ALLOWED",
    "message": "Booking cannot be cancelled within 2 hours of show time",
    "details": [
      "Show time: 2026-03-20T18:30:00Z",
      "Current time: 2026-03-20T17:00:00Z",
      "Minimum cancellation time required: 2 hours before show"
    ],
    "path": "/api/bookings/456/cancel"
  },
  "meta": {
    "timestamp": "2026-03-20T17:00:00Z",
    "api_version": "1.0"
  }
}
```

### Resource Not Found

**Request:**
```http
GET /api/movies/999
```

**Response:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Movie not found",
    "details": ["No movie exists with ID: 999"],
    "path": "/api/movies/999"
  },
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

## Admin Operations

### Create Movie (Admin Only)

**Request:**
```http
POST /api/movies
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Admin token

{
  "title": "Avengers: Endgame",
  "description": "The culmination of 22 interconnected films...",
  "genre": "ACTION",
  "language": "English",
  "duration_minutes": 181,
  "release_date": "2019-04-26",
  "rating": "PG-13",
  "poster_url": "https://example.com/avengers-poster.jpg"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "movie": {
      "id": 10,
      "title": "Avengers: Endgame",
      "description": "The culmination of 22 interconnected films...",
      "genre": "ACTION",
      "language": "English",
      "duration_minutes": 181,
      "release_date": "2019-04-26",
      "rating": "PG-13",
      "poster_url": "https://example.com/avengers-poster.jpg",
      "is_active": true,
      "created_at": "2026-03-20T10:30:00Z"
    }
  },
  "message": "Movie created successfully",
  "meta": {
    "timestamp": "2026-03-20T10:30:00Z",
    "api_version": "1.0"
  }
}
```

### Create Show (Admin Only)

**Request:**
```http
POST /api/shows
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Admin token

{
  "movie_id": 10,
  "screen_id": 1,
  "show_time": "2026-03-22T20:00:00Z",
  "price": 300.00
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "show": {
      "id": 15,
      "movie_id": 10,
      "screen_id": 1,
      "show_time": "2026-03-22T20:00:00Z",
      "price": 300.00,
      "is_active": true,
      "movie": {
        "title": "Avengers: Endgame",
        "duration_minutes": 181
      },
      "theatre": {
        "name": "PVR Cinemas",
        "location": "Mumbai"
      },
      "screen": {
        "screen_name": "Screen 1"
      }
    }
  },
  "message": "Show created successfully"
}
```

### Get All Bookings (Admin Only)

**Request:**
```http
GET /api/bookings?userId=123&status=CONFIRMED&page=1&limit=25
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Admin token
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 456,
        "user_id": 123,
        "show_id": 1,
        "booking_time": "2026-03-20T10:30:00Z",
        "total_amount": 500.00,
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
          "amount": 500.00,
          "payment_method": "CREDIT_CARD",
          "payment_status": "SUCCESS",
          "transaction_id": "TXN123456789"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 25,
      "hasNext": false
    }
  },
  "message": "All bookings retrieved successfully"
}
```

## Performance Testing Examples

### Load Testing Seat Availability

```bash
# Simulate multiple users checking seat availability
for i in {1..10}; do
  curl -X GET "http://localhost:5000/api/shows/1/seats" \
    -H "Content-Type: application/json" &
done
wait
```

### Concurrent Booking Simulation

```bash
# Simulate concurrent booking attempts (should show conflict resolution)
curl -X POST "http://localhost:5000/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{"showId": 1, "seatIds": [5], "paymentMethod": "CREDIT_CARD"}' &

curl -X POST "http://localhost:5000/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"showId": 1, "seatIds": [5], "paymentMethod": "UPI"}' &

wait
```

## Postman Collection

### Collection Structure

```json
{
  "info": {
    "name": "Movie Ticket Booking API",
    "description": "Complete API collection for Movie Ticket Booking System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api",
      "type": "string"
    },
    {
      "key": "jwt_token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"test_user\",\n  \"email\": \"test@example.com\",\n  \"password\": \"TestPass123\"\n}"
            },
            "url": "{{base_url}}/auth/register"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "  const response = pm.response.json();",
                  "  pm.collectionVariables.set('jwt_token', response.data.token);",
                  "}"
                ]
              }
            }
          ]
        },
        {
          "name": "Login User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"TestPass123\"\n}"
            },
            "url": "{{base_url}}/auth/login"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "  const response = pm.response.json();",
                  "  pm.collectionVariables.set('jwt_token', response.data.token);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Movies",
      "item": [
        {
          "name": "Get All Movies",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/movies"
          }
        },
        {
          "name": "Search Movies",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/movies/search?q=batman",
              "host": ["{{base_url}}"],
              "path": ["movies", "search"],
              "query": [
                {
                  "key": "q",
                  "value": "batman"
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Bookings",
      "item": [
        {
          "name": "Create Booking",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"showId\": 1,\n  \"seatIds\": [1, 2],\n  \"paymentMethod\": \"CREDIT_CARD\"\n}"
            },
            "url": "{{base_url}}/bookings"
          }
        },
        {
          "name": "Get My Bookings",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/bookings/my-bookings"
          }
        }
      ]
    }
  ]
}
```

### Environment Setup

```json
{
  "name": "Movie Booking Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api",
      "type": "default",
      "enabled": true
    },
    {
      "key": "admin_token",
      "value": "",
      "type": "secret",
      "enabled": true
    },
    {
      "key": "user_token",
      "value": "",
      "type": "secret",
      "enabled": true
    }
  ]
}
```

## Testing Checklist

### Functional Testing
- [ ] User registration and login
- [ ] JWT token generation and validation
- [ ] Movie CRUD operations (admin)
- [ ] Theatre and screen management
- [ ] Show creation and listing
- [ ] Seat availability checking
- [ ] Booking creation (critical path)
- [ ] Booking cancellation
- [ ] Payment processing
- [ ] Authorization checks

### Edge Cases
- [ ] Concurrent booking attempts
- [ ] Invalid seat selections
- [ ] Expired JWT tokens
- [ ] Booking cancellation limits
- [ ] Payment failures
- [ ] Database connection issues
- [ ] Invalid date formats
- [ ] Boundary value testing

### Performance Testing
- [ ] Response times < 200ms
- [ ] Concurrent user handling
- [ ] Database query optimization
- [ ] Memory usage monitoring
- [ ] Rate limiting verification

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token validity and format
2. **409 Booking Conflict**: Seats already booked by another user
3. **422 Validation Error**: Check request body format and required fields
4. **500 Internal Server Error**: Check database connection and stored procedures

### Debug Headers

```http
# Add these headers for debugging
X-Request-ID: unique-request-id
X-Debug-Mode: true
```

---

*This documentation covers the complete API usage patterns. For additional examples or specific use cases, refer to the main API documentation or create a GitHub issue.*