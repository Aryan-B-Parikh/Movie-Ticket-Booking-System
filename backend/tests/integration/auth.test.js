// Integration tests for Authentication endpoints
// Tests user registration, login, and authorization flows

const request = require('supertest');
const app = require('../../../src/app');
const { TestDataFactory, DatabaseCleaner } = require('../../helpers/testData');
const { ApiHelper, ResponseValidator } = require('../../helpers/requestHelpers');

describe('Authentication Integration Tests', () => {

  let apiHelper;

  beforeAll(() => {
    apiHelper = new ApiHelper(app);
  });

  beforeEach(async () => {
    await DatabaseCleaner.cleanAll();
  });

  afterAll(async () => {
    await DatabaseCleaner.cleanAll();
  });

  describe('POST /api/auth/register', () => {

    const validUserData = {
      username: 'newuser123',
      email: 'newuser@example.com',
      password: 'Password123'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      ResponseValidator.validateSuccessResponse(response, ['user', 'token']);

      const { user, token } = response.body.data;

      // Validate user object
      expect(user).toBeValidUser();
      expect(user.username).toBe(validUserData.username);
      expect(user.email).toBe(validUserData.email);
      expect(user.role).toBe('USER'); // Default role
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('password_hash');

      // Validate token
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should register admin user when role is specified', async () => {
      const adminData = {
        ...validUserData,
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(adminData)
        .expect(201);

      const { user } = response.body.data;
      expect(user.role).toBe('ADMIN');
    });

    it('should hash password securely', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Verify password is hashed in database
      const users = await TestDataFactory.query(
        'SELECT password_hash FROM Users WHERE email = ?',
        [validUserData.email]
      );

      expect(users[0].password_hash).not.toBe(validUserData.password);
      expect(users[0].password_hash).toMatch(/^\$2b\$10\$/); // bcrypt hash pattern
    });

    it('should prevent duplicate email registration', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const duplicateData = {
        ...validUserData,
        username: 'differentuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      ResponseValidator.validateErrorResponse(response, 'already exists');
    });

    it('should validate username format', async () => {
      const invalidUsernames = [
        'ab', // Too short
        'a'.repeat(51), // Too long
        'user@name', // Invalid character
        'user name', // Space
        'user-name' // Dash
      ];

      for (const username of invalidUsernames) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validUserData, username })
          .expect(400);

        ResponseValidator.validateErrorResponse(response);
        expect(response.body.error.message).toMatch(/username|Username/i);
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user.example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validUserData, email })
          .expect(400);

        ResponseValidator.validateErrorResponse(response);
        expect(response.body.error.message).toMatch(/email|Email/i);
      }
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        'short', // Too short
        'alllowercase123', // No uppercase
        'ALLUPPERCASE123', // No lowercase
        'NoNumbers', // No numbers
        'Simple123' // Valid but should pass (adjust if needed)
      ];

      for (const password of weakPasswords.slice(0, 3)) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validUserData, password })
          .expect(400);

        ResponseValidator.validateErrorResponse(response);
        expect(response.body.error.message).toMatch(/password|Password/i);
      }
    });

    it('should require all mandatory fields', async () => {
      const requiredFields = ['username', 'email', 'password'];

      for (const field of requiredFields) {
        const incompleteData = { ...validUserData };
        delete incompleteData[field];

        const response = await request(app)
          .post('/api/auth/register')
          .send(incompleteData)
          .expect(400);

        ResponseValidator.validateErrorResponse(response);
      }
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking database failure
      // For integration tests, we might skip this or implement with test database issues
    });

    it('should normalize email case', async () => {
      const upperCaseEmailData = {
        ...validUserData,
        email: 'NEWUSER@EXAMPLE.COM'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(upperCaseEmailData)
        .expect(201);

      const { user } = response.body.data;
      expect(user.email).toBe('newuser@example.com'); // Normalized to lowercase
    });
  });

  describe('POST /api/auth/login', () => {

    let testUser;

    beforeEach(async () => {
      testUser = await TestDataFactory.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      ResponseValidator.validateSuccessResponse(response, ['user', 'token']);

      const { user, token } = response.body.data;

      expect(user).toBeValidUser();
      expect(user.user_id).toBe(testUser.user_id);
      expect(user.email).toBe(testUser.email);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      ResponseValidator.validateErrorResponse(response, 'Invalid credentials');
    });

    it('should reject incorrect password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      ResponseValidator.validateErrorResponse(response, 'Invalid credentials');
    });

    it('should validate email format in login', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      ResponseValidator.validateErrorResponse(response);
      expect(response.body.error.message).toMatch(/email|Email/i);
    });

    it('should require password in login', async () => {
      const loginData = {
        email: testUser.email
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      ResponseValidator.validateErrorResponse(response);
      expect(response.body.error.message).toMatch(/password|Password/i);
    });

    it('should be case sensitive for password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123' // Different case
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      ResponseValidator.validateErrorResponse(response, 'Invalid credentials');
    });

    it('should accept email in different case', async () => {
      const loginData = {
        email: testUser.email.toUpperCase(),
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      ResponseValidator.validateSuccessResponse(response);
    });

    it('should login admin users correctly', async () => {
      const adminUser = await TestDataFactory.createUser({
        username: 'admin',
        email: 'admin@example.com',
        password: 'AdminPassword123',
        role: 'ADMIN'
      });

      const loginData = {
        email: adminUser.email,
        password: adminUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const { user } = response.body.data;
      expect(user.role).toBe('ADMIN');
    });
  });

  describe('JWT Token Functionality', () => {

    let testUser;
    let token;

    beforeEach(async () => {
      testUser = await TestDataFactory.createUser();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      token = loginResponse.body.data.token;
    });

    it('should include valid JWT payload', async () => {
      // Decode JWT token (without verification for testing)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      expect(payload).toHaveProperty('user_id', testUser.user_id);
      expect(payload).toHaveProperty('email', testUser.email);
      expect(payload).toHaveProperty('role', testUser.role);
      expect(payload).toHaveProperty('exp'); // Expiration
      expect(payload).toHaveProperty('iat'); // Issued at
    });

    it('should have reasonable token expiration', async () => {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const issuedTime = payload.iat * 1000;
      const now = Date.now();

      expect(expirationTime).toBeGreaterThan(now); // Not expired
      expect(expirationTime - issuedTime).toBeGreaterThan(3600000); // At least 1 hour
      expect(expirationTime - issuedTime).toBeLessThan(86400000 * 2); // Less than 2 days
    });
  });

  describe('Role-Based Access Control', () => {

    let regularUser, adminUser;
    let userToken, adminToken;

    beforeEach(async () => {
      // Create users
      regularUser = await TestDataFactory.createUser({
        email: 'user@example.com',
        role: 'USER'
      });

      adminUser = await TestDataFactory.createUser({
        email: 'admin@example.com',
        role: 'ADMIN'
      });

      // Get tokens
      const userLogin = await apiHelper.loginUser({
        email: regularUser.email,
        password: regularUser.password
      });
      userToken = userLogin.token;

      const adminLogin = await apiHelper.loginUser({
        email: adminUser.email,
        password: adminUser.password
      });
      adminToken = adminLogin.token;
    });

    it('should identify user role in token', async () => {
      const userPayload = JSON.parse(
        Buffer.from(userToken.split('.')[1], 'base64').toString()
      );
      expect(userPayload.role).toBe('USER');

      const adminPayload = JSON.parse(
        Buffer.from(adminToken.split('.')[1], 'base64').toString()
      );
      expect(adminPayload.role).toBe('ADMIN');
    });

    it('should maintain consistent user_id in token', async () => {
      const userPayload = JSON.parse(
        Buffer.from(userToken.split('.')[1], 'base64').toString()
      );
      expect(userPayload.user_id).toBe(regularUser.user_id);

      const adminPayload = JSON.parse(
        Buffer.from(adminToken.split('.')[1], 'base64').toString()
      );
      expect(adminPayload.user_id).toBe(adminUser.user_id);
    });
  });

  describe('Security Measures', () => {

    it('should not expose password in any response', async () => {
      const userData = {
        username: 'securitytest',
        email: 'security@example.com',
        password: 'SecurePassword123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      // Check both responses don't contain password
      expect(JSON.stringify(registerResponse.body)).not.toContain(userData.password);
      expect(JSON.stringify(loginResponse.body)).not.toContain(userData.password);

      expect(registerResponse.body.data.user).not.toHaveProperty('password');
      expect(registerResponse.body.data.user).not.toHaveProperty('password_hash');
      expect(loginResponse.body.data.user).not.toHaveProperty('password');
      expect(loginResponse.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should provide consistent error messages for security', async () => {
      const loginResponse1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        })
        .expect(401);

      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      // Both should have same generic error message
      expect(loginResponse1.body.error.message).toBe(loginResponse2.body.error.message);
      expect(loginResponse1.body.error.message).toMatch(/invalid credentials/i);
    });

    it('should handle SQL injection attempts safely', async () => {
      const maliciousData = {
        email: "'; DROP TABLE Users; --",
        password: "Password123"
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousData)
        .expect(400); // Should fail validation first

      expect(response.body.error).toBeDefined();
    });

    it('should sanitize input data', async () => {
      const userData = {
        username: '  testuser  ', // Whitespace
        email: '  TEST@EXAMPLE.COM  ', // Case and whitespace
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const { user } = response.body.data;
      expect(user.username).toBe('testuser'); // Trimmed
      expect(user.email).toBe('test@example.com'); // Normalized
    });
  });

  describe('Performance and Limits', () => {

    it('should handle registration within reasonable time', async () => {
      const userData = {
        username: 'performancetest',
        email: 'performance@example.com',
        password: 'Password123'
      };

      const startTime = Date.now();

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registration should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle login within reasonable time', async () => {
      const testUser = await TestDataFactory.createUser();

      const startTime = Date.now();

      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Login should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should reject oversized request bodies', async () => {
      const oversizedData = {
        username: 'test',
        email: 'test@example.com',
        password: 'Password123',
        extra: 'x'.repeat(11 * 1024 * 1024) // 11MB (over 10MB limit)
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(oversizedData)
        .expect(413);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {

    it('should return proper error format for validation failures', async () => {
      const invalidData = {
        username: 'a', // Too short
        email: 'invalid-email',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .expect(400);

      ResponseValidator.validateErrorResponse(response);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});