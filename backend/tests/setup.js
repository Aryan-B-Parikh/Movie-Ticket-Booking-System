// Test setup - runs before all test suites
// Handles database setup, seeding, and cleanup

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  multipleStatements: true
};

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'movie_booking_system_test';

let testPool;

// Setup test database before all tests
beforeAll(async () => {
  try {
    console.log('\n🔧 Setting up test database...');

    // Create connection without database
    const connection = await mysql.createConnection(TEST_DB_CONFIG);

    // Drop and recreate test database
    await connection.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await connection.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log(`✓ Test database "${TEST_DB_NAME}" created`);

    await connection.end();

    // Create pool for test database
    testPool = mysql.createPool({
      ...TEST_DB_CONFIG,
      database: TEST_DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    // Run schema creation script
    const schemaPath = path.join(__dirname, '../../database/schema/01_create_tables.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');

    // Execute schema (split by semicolon for multiple statements)
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await testPool.query(statement);
    }
    console.log('✓ Database schema created');

    // Seed test data
    await seedTestData();
    console.log('✓ Test data seeded');

    // Override database module to use test database
    const dbModule = require('../src/config/database');
    dbModule.pool = testPool;
    dbModule.query = async (sql, params = []) => {
      const [rows] = await testPool.execute(sql, params);
      return rows;
    };
    dbModule.transaction = async (callback) => {
      const connection = await testPool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    };

    console.log('✅ Test environment ready\n');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    console.log('\n🧹 Cleaning up test environment...');

    if (testPool) {
      await testPool.end();
      console.log('✓ Database connections closed');
    }

    // Drop test database
    const connection = await mysql.createConnection(TEST_DB_CONFIG);
    await connection.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log(`✓ Test database "${TEST_DB_NAME}" dropped`);
    await connection.end();

    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
});

// Seed test data for all tests
async function seedTestData() {
  // Insert test users
  await testPool.query(`
    INSERT INTO Users (username, email, password_hash, role) VALUES
    ('Test User', 'test@example.com', '$2b$10$YourHashedPasswordHere', 'USER'),
    ('Admin User', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 'ADMIN'),
    ('John Doe', 'john@example.com', '$2b$10$YourHashedPasswordHere', 'USER')
  `);

  // Insert test movies
  await testPool.query(`
    INSERT INTO Movies (title, description, duration_minutes, genre, language, release_date, rating, poster_url) VALUES
    ('Test Movie 1', 'A test movie', 120, 'Action', 'English', '2024-01-01', 'PG-13', 'http://example.com/poster1.jpg'),
    ('Test Movie 2', 'Another test movie', 150, 'Drama', 'English', '2024-02-01', 'R', 'http://example.com/poster2.jpg'),
    ('Test Movie 3', 'Third test movie', 90, 'Comedy', 'English', '2024-03-01', 'PG', 'http://example.com/poster3.jpg')
  `);

  // Insert test theatres
  await testPool.query(`
    INSERT INTO Theatres (name, location, city, state, pincode, total_screens) VALUES
    ('Test Theatre 1', '123 Main St', 'Test City', 'Test State', '12345', 3),
    ('Test Theatre 2', '456 Oak Ave', 'Test City', 'Test State', '12346', 2)
  `);

  // Insert test screens
  await testPool.query(`
    INSERT INTO Screens (theatre_id, screen_number, total_seats, screen_type) VALUES
    (1, 1, 100, 'Standard'),
    (1, 2, 150, 'IMAX'),
    (2, 1, 80, 'Standard')
  `);

  // Insert test seats (simplified - 10 seats per screen for testing)
  const screenIds = [1, 2, 3];
  for (const screenId of screenIds) {
    const seats = [];
    for (let i = 1; i <= 10; i++) {
      const seatType = i <= 5 ? 'Regular' : i <= 8 ? 'Premium' : 'VIP';
      seats.push(`(${screenId}, 'A${i}', '${seatType}')`);
    }
    await testPool.query(`
      INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES ${seats.join(', ')}
    `);
  }

  // Insert test shows
  await testPool.query(`
    INSERT INTO Shows (movie_id, screen_id, show_time, price) VALUES
    (1, 1, '2026-03-21 10:00:00', 250.00),
    (1, 1, '2026-03-21 14:00:00', 300.00),
    (2, 2, '2026-03-21 18:00:00', 400.00),
    (3, 3, '2026-03-22 10:00:00', 200.00)
  `);
}

module.exports = {
  testPool,
  TEST_DB_NAME
};
