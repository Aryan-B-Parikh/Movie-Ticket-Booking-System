// Global test setup - runs once before all test suites
// Handles environment configuration and database initialization

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('\n🔧 Global test setup starting...');

  // Verify test environment
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Warning: NODE_ENV is not set to "test"');
    process.env.NODE_ENV = 'test';
  }

  // Verify test database configuration
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missingVars.join(', ')}`);
  }

  // Set test-specific environment variables
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'movie_booking_system_test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  // Verify database schema exists
  const schemaPath = path.join(__dirname, '../../database/schema/01_create_tables.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Database schema file not found:', schemaPath);
    throw new Error('Database schema file is required for tests');
  }

  // Verify stored procedures exist
  const proceduresDir = path.join(__dirname, '../../database/procedures');
  if (!fs.existsSync(proceduresDir)) {
    console.warn('⚠️  Warning: Stored procedures directory not found:', proceduresDir);
  }

  // Create test coverage directory
  const coverageDir = path.join(__dirname, '../coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Performance tracking
  global.testStartTime = Date.now();

  console.log('✅ Global test setup complete');
  console.log(`🏷️  Test database: ${process.env.TEST_DB_NAME}`);
  console.log('🚀 Running test suites...\n');
};