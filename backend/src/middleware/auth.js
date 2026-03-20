const AppError = require('../utils/AppError');

/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens
 *
 * NOTE: This is a PLACEHOLDER implementation for testing
 * TODO: Implement full JWT verification with jsonwebtoken library
 */

/**
 * Protect middleware - verifies user authentication
 * Extracts JWT token from Authorization header and verifies it
 *
 * For testing: Accepts mock user data from X-User-Id header
 *
 * @throws {AppError} 401 Unauthorized if token is missing or invalid
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // TODO: Implement actual JWT verification
    // For now, accept mock user from header for testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      // Mock authentication for testing
      // Accept user ID from X-User-Id header
      const mockUserId = req.headers['x-user-id'];
      const mockUserRole = req.headers['x-user-role'] || 'USER';
      const mockUserEmail = req.headers['x-user-email'] || `user${mockUserId}@example.com`;

      if (mockUserId) {
        req.user = {
          id: parseInt(mockUserId),
          email: mockUserEmail,
          role: mockUserRole
        };
        return next();
      }
    }

    // Check if token exists
    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    // TODO: Verify JWT token
    // Example implementation (commented out):
    /*
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const User = require('../models/User');
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // Grant access to protected route
    req.user = {
      id: user.user_id,
      email: user.email,
      role: user.role
    };
    */

    // For now, throw error for production
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('JWT authentication not yet implemented', 501);
    }

    next();

  } catch (error) {
    // Handle JWT specific errors
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please log in again.', 401));
    }

    next(error);
  }
};

/**
 * Restrict access to specific roles
 * Must be used after protect middleware
 *
 * @param {...string} roles - Allowed roles (e.g., 'ADMIN', 'USER')
 * @returns {function} Express middleware
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }

    next();
  };
};
