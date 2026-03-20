# Development Environment Setup Guide

## Overview
This guide helps developers set up a complete local development environment for the Movie Ticket Booking System.

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 10GB free space
- **Internet**: Stable connection for package downloads

### Required Software
- **Node.js**: Version 16.0.0+ (18.x LTS recommended)
- **npm**: Version 8.0.0+
- **MySQL**: Version 8.0+
- **Git**: Latest version
- **IDE/Editor**: VS Code (recommended) or your preferred editor

## Installation Guide

### 1. Install Node.js and npm

#### Windows
```bash
# Download from https://nodejs.org/
# Or use Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

#### macOS
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install MySQL

#### Windows
```bash
# Download MySQL Installer from https://dev.mysql.com/downloads/installer/
# Or use Chocolatey
choco install mysql

# Alternative: Use MySQL Workbench for GUI management
choco install mysql.workbench
```

#### macOS
```bash
# Using Homebrew
brew install mysql

# Start MySQL service
brew services start mysql

# Secure installation
mysql_secure_installation
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation
```

### 3. Install Development Tools

#### Git
```bash
# Windows (Chocolatey)
choco install git

# macOS (Homebrew)
brew install git

# Linux
sudo apt install git
```

#### VS Code (Recommended IDE)
```bash
# Windows
choco install vscode

# macOS
brew install --cask visual-studio-code

# Linux
sudo snap install code --classic
```

### 4. Install Global Development Dependencies
```bash
# Install nodemon for development
npm install -g nodemon

# Install eslint for code linting
npm install -g eslint

# Optional: Install PM2 for process management testing
npm install -g pm2
```

## Project Setup

### 1. Clone Repository
```bash
# Clone the repository
git clone <your-repository-url>
cd Movie\ Ticket\ Booking\ System

# Create a development branch
git checkout -b feature/development-setup
```

### 2. Backend Setup

#### Install Dependencies
```bash
# Navigate to backend directory
cd backend

# Install all dependencies
npm install

# Install development dependencies
npm install --only=dev

# Verify installation
npm audit
npm list --depth=0
```

#### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment file for development
# Use your preferred editor (VS Code, nano, vim, etc.)
code .env  # Opens in VS Code
```

**Development Environment Variables (.env):**
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=dev_user
DB_PASSWORD=dev_password
DB_NAME=movie_booking_dev

# Database Connection Pool (smaller for development)
DB_CONNECTION_LIMIT=5
DB_QUEUE_LIMIT=0

# Authentication (use different secrets for dev/prod)
JWT_SECRET=development_jwt_secret_change_for_production
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=10

# CORS Configuration (allow localhost)
CORS_ORIGIN=http://localhost:3000

# API Configuration
API_PREFIX=/api
```

### 3. Database Setup for Development

#### Create Development Database
```bash
# Connect to MySQL as root
mysql -u root -p

# Create development database and user
CREATE DATABASE movie_booking_dev;
CREATE USER 'dev_user'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON movie_booking_dev.* TO 'dev_user'@'localhost';

# Optional: Create test database
CREATE DATABASE movie_booking_test;
GRANT ALL PRIVILEGES ON movie_booking_test.* TO 'dev_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

#### Initialize Database Schema
```bash
# From project root, navigate to database directory
cd ../database

# Apply schema files in order
mysql -u dev_user -p movie_booking_dev < schema/init_database.sql
mysql -u dev_user -p movie_booking_dev < schema/001_create_tables.sql
mysql -u dev_user -p movie_booking_dev < schema/002_create_indexes.sql
mysql -u dev_user -p movie_booking_dev < schema/003_create_constraints.sql

# Install stored procedures
mysql -u dev_user -p movie_booking_dev < procedures/sp_get_available_seats.sql
mysql -u dev_user -p movie_booking_dev < procedures/sp_book_tickets.sql
mysql -u dev_user -p movie_booking_dev < procedures/sp_cancel_booking.sql

# Install triggers
mysql -u dev_user -p movie_booking_dev < triggers/trg_prevent_double_booking.sql
mysql -u dev_user -p movie_booking_dev < triggers/trg_validate_show_time.sql
mysql -u dev_user -p movie_booking_dev < triggers/trg_audit_booking_create.sql
mysql -u dev_user -p movie_booking_dev < triggers/trg_audit_booking_changes.sql
mysql -u dev_user -p movie_booking_dev < triggers/trg_prevent_payment_modification.sql

# Install views
mysql -u dev_user -p movie_booking_dev < views/vw_available_seats.sql
mysql -u dev_user -p movie_booking_dev < views/vw_booking_summary.sql
mysql -u dev_user -p movie_booking_dev < views/vw_show_occupancy.sql

# Load sample data for development
mysql -u dev_user -p movie_booking_dev < seeds/run_all_seeds.sql

# Verify installation
mysql -u dev_user -p movie_booking_dev < seeds/verify_seeds.sql
```

### 4. Test Environment Setup

#### Create Test Database
```bash
# Copy environment for testing
cd ../backend
cp .env .env.test

# Edit test environment
# Change DB_NAME to movie_booking_test
```

**Test Environment Variables (.env.test):**
```bash
# Test Database Configuration
DB_NAME=movie_booking_test
JWT_SECRET=test_jwt_secret
BCRYPT_ROUNDS=1  # Faster for testing
```

#### Install Test Database Schema
```bash
# Apply schema to test database
cd ../database
mysql -u dev_user -p movie_booking_test < schema/init_database.sql
mysql -u dev_user -p movie_booking_test < schema/001_create_tables.sql
mysql -u dev_user -p movie_booking_test < schema/002_create_indexes.sql
mysql -u dev_user -p movie_booking_test < schema/003_create_constraints.sql

# Install procedures and triggers for testing
mysql -u dev_user -p movie_booking_test < procedures/sp_get_available_seats.sql
mysql -u dev_user -p movie_booking_test < procedures/sp_book_tickets.sql
mysql -u dev_user -p movie_booking_test < procedures/sp_cancel_booking.sql
mysql -u dev_user -p movie_booking_test < triggers/trg_prevent_double_booking.sql
mysql -u dev_user -p movie_booking_test < triggers/trg_validate_show_time.sql
mysql -u dev_user -p movie_booking_test < views/vw_available_seats.sql
mysql -u dev_user -p movie_booking_test < views/vw_booking_summary.sql
mysql -u dev_user -p movie_booking_test < views/vw_show_occupancy.sql
```

## IDE Configuration

### VS Code Setup

#### Recommended Extensions
```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-json
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension ms-vscode-remote.remote-containers
code --install-extension humao.rest-client
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-sql
```

#### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "files.eol": "\n",
  "search.exclude": {
    "**/node_modules": true,
    "**/package-lock.json": true,
    "**/logs": true
  },
  "sql.format.keywordCase": "upper",
  "sql.format.identifierCase": "lower"
}
```

#### VS Code Launch Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch API Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "runtimeArgs": ["--exec"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "test"
      }
    }
  ]
}
```

#### VS Code Tasks
Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "dev",
      "path": "backend/",
      "group": "build",
      "label": "npm: dev - backend",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "type": "npm",
      "script": "test",
      "path": "backend/",
      "group": "test",
      "label": "npm: test - backend"
    },
    {
      "type": "npm",
      "script": "test:watch",
      "path": "backend/",
      "group": "test",
      "label": "npm: test:watch - backend"
    }
  ]
}
```

## Development Workflow

### 1. Starting the Development Environment

#### Terminal Window 1 - API Server
```bash
cd backend
npm run dev
```

#### Terminal Window 2 - Tests (Optional)
```bash
cd backend
npm run test:watch
```

#### Terminal Window 3 - Database Monitoring (Optional)
```bash
# Monitor MySQL processes
watch "mysql -u dev_user -p -e 'SHOW PROCESSLIST;'"
```

### 2. Daily Development Routine

#### Start Development Session
```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd backend
npm update

# Start development server
npm run dev
```

#### Before Committing
```bash
# Run all tests
npm test

# Run linting
npm run lint:fix

# Check for security vulnerabilities
npm audit

# Test database connection
node -e "require('./src/config/database').testConnection()"
```

### 3. Database Development Tools

#### Useful MySQL Commands
```bash
# Connect to development database
mysql -u dev_user -p movie_booking_dev

# Show all tables
SHOW TABLES;

# Describe table structure
DESCRIBE Users;
DESCRIBE Bookings;

# Check stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'movie_booking_dev';

# Check triggers
SELECT * FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = 'movie_booking_dev';

# Check views
SHOW FULL TABLES WHERE Table_Type = 'VIEW';
```

#### Database Reset Script
Create `scripts/reset-db.sh`:
```bash
#!/bin/bash
echo "Resetting development database..."

# Drop and recreate database
mysql -u dev_user -p -e "DROP DATABASE IF EXISTS movie_booking_dev;"
mysql -u dev_user -p -e "CREATE DATABASE movie_booking_dev;"

# Reinstall schema and data
cd database
mysql -u dev_user -p movie_booking_dev < schema/init_database.sql
mysql -u dev_user -p movie_booking_dev < schema/001_create_tables.sql
mysql -u dev_user -p movie_booking_dev < schema/002_create_indexes.sql
mysql -u dev_user -p movie_booking_dev < schema/003_create_constraints.sql

# Install procedures, triggers, views
mysql -u dev_user -p movie_booking_dev < procedures/sp_get_available_seats.sql
mysql -u dev_user -p movie_booking_dev < procedures/sp_book_tickets.sql
mysql -u dev_user -p movie_booking_dev < procedures/sp_cancel_booking.sql
mysql -u dev_user -p movie_booking_dev < triggers/trg_prevent_double_booking.sql
mysql -u dev_user -p movie_booking_dev < triggers/trg_validate_show_time.sql
mysql -u dev_user -p movie_booking_dev < views/vw_available_seats.sql
mysql -u dev_user -p movie_booking_dev < views/vw_booking_summary.sql
mysql -u dev_user -p movie_booking_dev < views/vw_show_occupancy.sql

# Load sample data
mysql -u dev_user -p movie_booking_dev < seeds/run_all_seeds.sql

echo "Database reset completed!"
```

## Testing Setup

### 1. Test Configuration

#### Jest Configuration
The project uses Jest for testing. Configuration is in `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

### 2. Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/models.test.js

# Run tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run stress tests
npm run test:stress

# Debug tests
npm run test:debug
```

### 3. Test Database Management

#### Automated Test Database Reset
Tests should automatically handle database state. Check `tests/setup.js` for configuration.

## API Testing

### 1. Using REST Client Extension

Create `api-tests.http` file:
```http
### Health Check
GET http://localhost:3000/api/health

### Get all movies
GET http://localhost:3000/api/movies

### Get movie by ID
GET http://localhost:3000/api/movies/1

### Register user
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}

### Login user
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

### Get available seats (requires auth)
GET http://localhost:3000/api/shows/1/seats
Authorization: Bearer YOUR_JWT_TOKEN_HERE

### Book tickets (requires auth)
POST http://localhost:3000/api/bookings
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN_HERE

{
  "showId": 1,
  "seatIds": [1, 2],
  "totalAmount": 500
}
```

### 2. Using Postman

#### Import Postman Collection
Create `postman/movie-booking-api.json`:
```json
{
  "info": {
    "name": "Movie Booking API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"phone\": \"1234567890\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        }
      }
    }
  ]
}
```

## Debugging Guide

### 1. Debug API Server

#### Using VS Code Debugger
1. Open VS Code
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select "Launch API Server"
4. Set breakpoints in your code
5. Press F5 to start debugging

#### Using Node.js Inspector
```bash
# Start with inspector
node --inspect src/server.js

# Open Chrome DevTools
# Navigate to chrome://inspect
```

### 2. Debug Database Issues

#### Enable MySQL Query Logging
```sql
-- Enable general query log
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/query.log';

-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

#### Monitor Database Connections
```bash
# Watch active connections
watch "mysql -u dev_user -p -e 'SHOW PROCESSLIST;'"

# Check connection pool status
node -e "
const { pool } = require('./src/config/database');
setInterval(() => {
  console.log('Pool stats:', {
    total: pool._allConnections.length,
    free: pool._freeConnections.length,
    used: pool._allConnections.length - pool._freeConnections.length
  });
}, 1000);
"
```

## Troubleshooting

### Common Development Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /F /PID <PID>  # Windows
```

#### 2. MySQL Connection Refused
```bash
# Check MySQL service status
# macOS
brew services list | grep mysql

# Linux
sudo systemctl status mysql

# Windows
net start MySQL80

# Test connection
mysql -u dev_user -p movie_booking_dev -e "SELECT 1;"
```

#### 3. Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for vulnerabilities
npm audit fix
```

#### 4. Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check environment loading
node -e "require('dotenv').config(); console.log(process.env.DB_NAME);"

# Verify file permissions
chmod 644 .env
```

### Performance Issues

#### 1. Slow Database Queries
```bash
# Enable query profiling
mysql -u dev_user -p movie_booking_dev -e "SET profiling = 1;"

# Run your query
# Then check profile
mysql -u dev_user -p movie_booking_dev -e "SHOW PROFILES;"
```

#### 2. Memory Leaks
```bash
# Monitor memory usage
node --inspect src/server.js

# Use heap snapshots in Chrome DevTools
# Monitor with htop/Activity Monitor
```

## Best Practices for Development

### 1. Code Organization
- Keep controllers thin, business logic in services
- Use consistent error handling
- Follow RESTful API conventions
- Write meaningful commit messages
- Use feature branches for development

### 2. Database Development
- Always use transactions for data consistency
- Test with realistic data volumes
- Use proper indexes for performance
- Follow naming conventions
- Document complex queries

### 3. Testing
- Write tests before implementing features (TDD)
- Test edge cases and error conditions
- Use proper test data isolation
- Mock external dependencies
- Maintain high test coverage

### 4. Security During Development
- Never commit sensitive data
- Use different secrets for development
- Validate all inputs
- Test authentication and authorization
- Keep dependencies updated

## Next Steps

After completing the development setup:

1. **Read the codebase**: Understand the project structure and architecture
2. **Run the test suite**: Ensure everything works correctly
3. **Set up your first feature**: Create a new branch and implement a small feature
4. **Practice database operations**: Get familiar with the schema and stored procedures
5. **Explore the API**: Test all endpoints using the provided HTTP files

## Additional Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) - Database migration procedures
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Docker development environment
- [Express.js Documentation](https://expressjs.com/)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)