# API Documentation

This directory contains comprehensive API documentation for the Movie Ticket Booking System.

## 📋 Documentation Files

### 1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
Main API reference documentation containing:
- Complete endpoint documentation
- Authentication & authorization
- Request/response schemas
- Error handling
- Rate limiting
- Security considerations

### 2. [openapi.yaml](./openapi.yaml)
OpenAPI 3.0 specification file:
- Machine-readable API specification
- Complete schema definitions
- Can be imported into Swagger UI
- Supports code generation tools

### 3. [API_EXAMPLES.md](./API_EXAMPLES.md)
Practical examples and workflows:
- Complete booking workflow
- Real request/response examples
- Error scenarios
- Performance testing examples
- Troubleshooting guide

### 4. [postman_collection.json](./postman_collection.json)
Postman collection for API testing:
- Pre-configured requests for all endpoints
- Automated test scripts
- Environment variable management
- Error scenario testing

## 🚀 Quick Start

### 1. Import Postman Collection
```bash
# Import the collection into Postman
# File → Import → Choose postman_collection.json
```

### 2. Set Environment Variables
```json
{
  "base_url": "http://localhost:5000/api",
  "jwt_token": "",
  "admin_token": ""
}
```

### 3. Start with Authentication
1. Run "Register User" or "Login User"
2. JWT token will be automatically saved
3. Use protected endpoints with authentication

### 4. Follow the Booking Workflow
1. Search movies: `GET /api/movies/search?q=batman`
2. Find shows: `GET /api/shows?movieId=1`
3. Check seats: `GET /api/shows/1/seats`
4. Create booking: `POST /api/bookings`

## 📖 Using the Documentation

### For Developers
- Start with [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete reference
- Use [postman_collection.json](./postman_collection.json) for hands-on testing
- Refer to [API_EXAMPLES.md](./API_EXAMPLES.md) for implementation patterns

### For Integration
- Use [openapi.yaml](./openapi.yaml) with Swagger tools
- Generate client SDKs using OpenAPI generators
- Import into API management platforms

### For Testing
- Import Postman collection for manual testing
- Use example requests for automated testing
- Reference error scenarios for edge case testing

## 🎯 Critical Endpoints

### Authentication (Required First)
```http
POST /api/auth/register  # Create account
POST /api/auth/login     # Get JWT token
```

### Core Booking Flow
```http
GET  /api/movies/search          # Find movies
GET  /api/shows?movieId=1        # Find shows
GET  /api/shows/1/seats          # Check availability
POST /api/bookings               # Book tickets (CRITICAL)
```

### User Management
```http
GET  /api/bookings/my-bookings   # User's bookings
GET  /api/bookings/123           # Booking details
PUT  /api/bookings/123/cancel    # Cancel booking
```

## ⚠️ Important Notes

### Database-First Architecture
This system prioritizes:
- Data integrity through stored procedures
- Transaction safety for bookings
- Referential integrity constraints
- Optimized query performance

### Security Considerations
- JWT tokens expire after configured time
- Booking amounts calculated server-side
- Seat locking prevents race conditions
- Role-based access control (USER/ADMIN)

### Error Handling
All endpoints return standardized error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": ["Additional context"],
    "path": "/api/endpoint"
  }
}
```

## 📊 Testing Strategy

### Manual Testing
1. Import Postman collection
2. Follow authentication workflow
3. Test complete booking flow
4. Verify error scenarios

### Automated Testing
1. Use Postman collection with Newman
2. Run test scripts for validation
3. Monitor performance metrics
4. Test concurrent booking scenarios

### Load Testing
```bash
# Test seat availability under load
for i in {1..10}; do
  curl -X GET "localhost:5000/api/shows/1/seats" &
done

# Test concurrent bookings
curl -X POST "localhost:5000/api/bookings" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{"showId":1,"seatIds":[5],"paymentMethod":"CREDIT_CARD"}' &

curl -X POST "localhost:5000/api/bookings" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"showId":1,"seatIds":[5],"paymentMethod":"UPI"}' &
```

## 🛠 Development Tools

### Swagger UI Setup
```bash
# Serve OpenAPI spec with Swagger UI
npx swagger-ui-serve openapi.yaml
# Access at http://localhost:3001
```

### Code Generation
```bash
# Generate client SDK
openapi-generator-cli generate \
  -i openapi.yaml \
  -g javascript \
  -o ./client-sdk
```

## 🔗 Related Files

- [../backend/src/](../backend/src/) - API implementation
- [../database/](../database/) - Database schema and procedures
- [../backend/tests/](../backend/tests/) - API tests

## 📞 Support

For questions or issues:
1. Check [API_EXAMPLES.md](./API_EXAMPLES.md) troubleshooting section
2. Review error response codes in main documentation
3. Test with Postman collection for debugging

---

*Documentation last updated: March 20, 2026*