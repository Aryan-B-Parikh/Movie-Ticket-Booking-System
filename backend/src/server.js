require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Start server function
const startServer = async () => {
  try {
    // Test database connection before starting server
    await testConnection();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
      server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();
