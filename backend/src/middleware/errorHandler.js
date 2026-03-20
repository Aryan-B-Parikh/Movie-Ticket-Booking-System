const AppError = require('../utils/AppError');

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  // Set default error values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', err.stack);
  }

  // Handle specific MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    err = handleDuplicateKeyError(err);
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    err = handleForeignKeyError(err);
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    err = handleConstraintError(err);
  } else if (err.code === 'ER_DATA_TOO_LONG') {
    err = handleDataTooLongError(err);
  }

  // Development error response - detailed
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  }

  // Production error response - minimal
  // Don't leak error details to client
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Programming or unknown error: don't leak details
  console.error('ERROR:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong on the server'
  });
};

// MySQL duplicate key error handler
const handleDuplicateKeyError = (err) => {
  const field = err.message.match(/for key '(.+?)'/)?.[1] || 'field';
  const message = `Duplicate value for ${field}. Please use another value.`;
  return new AppError(message, 400);
};

// MySQL foreign key constraint error handler
const handleForeignKeyError = (err) => {
  const message = 'Invalid reference. The referenced record does not exist.';
  return new AppError(message, 400);
};

// MySQL constraint error handler
const handleConstraintError = (err) => {
  const message = 'Cannot delete or update. This record is referenced by other records.';
  return new AppError(message, 400);
};

// MySQL data too long error handler
const handleDataTooLongError = (err) => {
  const message = 'Data too long for field. Please use a shorter value.';
  return new AppError(message, 400);
};

module.exports = errorHandler;
