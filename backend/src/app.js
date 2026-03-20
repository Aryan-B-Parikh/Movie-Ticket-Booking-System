const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const movieRoutes = require('./routes/movieRoutes');
const theatreRoutes = require('./routes/theatreRoutes');
const screenRoutes = require('./routes/screenRoutes');
const showRoutes = require('./routes/showRoutes');

const app = express();

// Security middleware - sets various HTTP headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser middleware - parse JSON requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
const API_PREFIX = process.env.API_PREFIX || '/api';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/movies`, movieRoutes);
app.use(`${API_PREFIX}/theatres`, theatreRoutes);
app.use(`${API_PREFIX}/screens`, screenRoutes);
app.use(`${API_PREFIX}/shows`, showRoutes);

// 404 handler - must be after all routes
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handling middleware - must be last
app.use(errorHandler);

module.exports = app;
