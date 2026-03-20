const User = require('../models/User');
const AppError = require('../utils/AppError');

// Register new user
// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Create new user (password hashing handled in model)
    const newUser = await User.create({
      name,
      email,
      password,
      role: 'USER' // Default role for registration
    });

    // Success response (exclude password)
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          user_id: newUser.user_id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Login user
// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    // TODO: Generate JWT token here (future implementation)
    // For now, return user data without token

    // Success response (exclude password)
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
        // TODO: Add token here
        // token: jwtToken
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get current user profile (placeholder for JWT implementation)
const getCurrentUser = async (req, res, next) => {
  try {
    // TODO: Extract user_id from JWT token
    // const userId = req.user.user_id;

    res.status(501).json({
      status: 'error',
      message: 'JWT authentication not yet implemented'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};
