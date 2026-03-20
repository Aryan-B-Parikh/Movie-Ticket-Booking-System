# Movie Ticket Booking System - Deployment Guide

## Overview
This guide covers the deployment of the Movie Ticket Booking System, a database-centric application built with Node.js, Express, and MySQL.

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.4GHz
- **RAM**: 4GB (8GB recommended)
- **Storage**: 20GB available space
- **Operating System**: Ubuntu 22.04 LTS, CentOS 8+, or similar Linux distribution
- **Network**: Stable internet connection for package downloads

### Software Dependencies
- **Node.js**: Version 16.0.0 or higher (18+ recommended)
- **npm**: Version 8.0.0 or higher
- **MySQL**: Version 8.0 or higher
- **Git**: For code deployment
- **PM2**: For process management (production)

## Quick Start Deployment

### 1. Prerequisites Installation

#### Ubuntu/Debian Systems
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL Server 8.0
sudo apt install mysql-server -y

# Install Git and build essentials
sudo apt install git build-essential -y

# Install PM2 globally for production
sudo npm install -g pm2
```

#### CentOS/RHEL Systems
```bash
# Update system packages
sudo yum update -y

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# Install MySQL Server 8.0
sudo yum install mysql-server -y

# Install Git and development tools
sudo yum groupinstall "Development Tools" -y
sudo yum install git -y

# Install PM2 globally
sudo npm install -g pm2
```

### 2. MySQL Database Setup

#### Secure MySQL Installation
```bash
# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Run secure installation
sudo mysql_secure_installation
```

#### Create Database and User
```bash
# Login to MySQL as root
mysql -u root -p

# Create database and user
CREATE DATABASE movie_booking_system;
CREATE USER 'booking_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON movie_booking_system.* TO 'booking_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Deployment

#### Clone Repository
```bash
# Clone the repository
git clone <your-repository-url>
cd Movie\ Ticket\ Booking\ System

# Navigate to backend directory
cd backend
```

#### Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Verify installation
npm audit
```

#### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**Required Environment Variables:**
```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=booking_user
DB_PASSWORD=secure_password_here
DB_NAME=movie_booking_system

# Database Connection Pool
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# API Configuration
API_PREFIX=/api
```

### 4. Database Schema Deployment

#### Initialize Database Schema
```bash
# From project root directory
cd database/schema

# Apply schema in order
mysql -u booking_user -p movie_booking_system < init_database.sql
mysql -u booking_user -p movie_booking_system < 001_create_tables.sql
mysql -u booking_user -p movie_booking_system < 002_create_indexes.sql
mysql -u booking_user -p movie_booking_system < 003_create_constraints.sql

# Install stored procedures
cd ../procedures
mysql -u booking_user -p movie_booking_system < sp_get_available_seats.sql
mysql -u booking_user -p movie_booking_system < sp_book_tickets.sql
mysql -u booking_user -p movie_booking_system < sp_cancel_booking.sql

# Install triggers
cd ../triggers
mysql -u booking_user -p movie_booking_system < trg_prevent_double_booking.sql
mysql -u booking_user -p movie_booking_system < trg_validate_show_time.sql
mysql -u booking_user -p movie_booking_system < trg_audit_booking_create.sql
mysql -u booking_user -p movie_booking_system < trg_audit_booking_changes.sql
mysql -u booking_user -p movie_booking_system < trg_prevent_payment_modification.sql

# Install views
cd ../views
mysql -u booking_user -p movie_booking_system < vw_available_seats.sql
mysql -u booking_user -p movie_booking_system < vw_booking_summary.sql
mysql -u booking_user -p movie_booking_system < vw_show_occupancy.sql
```

#### Seed Initial Data (Optional)
```bash
# Run seed scripts for sample data
cd ../seeds
mysql -u booking_user -p movie_booking_system < run_all_seeds.sql

# Verify installation
mysql -u booking_user -p movie_booking_system < verify_seeds.sql
```

### 5. Application Testing

#### Test Database Connection
```bash
# Return to backend directory
cd ../../backend

# Test the application
npm test

# Test database connectivity
node -e "require('./src/config/database').testConnection()"
```

#### Run Application in Development Mode
```bash
# Start in development mode
npm run dev

# Test API endpoints
curl http://localhost:3000/api/health
```

### 6. Production Deployment

#### Using PM2 Process Manager
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'movie-booking-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## Security Configuration

### Firewall Setup
```bash
# Configure UFW firewall (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Application port
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# For production, consider restricting application port access
# sudo ufw deny 3000/tcp  # Block direct access
# Use reverse proxy (nginx) instead
```

### SSL/TLS Certificate (Production)
```bash
# Install certbot for Let's Encrypt
sudo apt install certbot -y

# Generate SSL certificate (replace yourdomain.com)
sudo certbot certonly --standalone -d yourdomain.com
```

### MySQL Security Hardening
```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add security settings
[mysqld]
bind-address = 127.0.0.1
skip-networking = false
max_connections = 50
max_user_connections = 40

# Restart MySQL
sudo systemctl restart mysql
```

## Monitoring and Maintenance

### PM2 Monitoring
```bash
# Monitor processes
pm2 status
pm2 logs movie-booking-api

# Restart application
pm2 restart movie-booking-api

# Monitor system resources
pm2 monit
```

### Database Monitoring
```bash
# Check MySQL status
sudo systemctl status mysql

# Monitor MySQL processes
mysql -u booking_user -p -e "SHOW PROCESSLIST;"

# Check database size
mysql -u booking_user -p -e "SELECT
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
  FROM information_schema.tables
  WHERE table_schema = 'movie_booking_system';"
```

### Log Management
```bash
# Rotate PM2 logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Setup system log rotation
sudo nano /etc/logrotate.d/movie-booking
```

## Backup Strategy

### Database Backup
```bash
# Create backup script
cat > /home/user/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="movie_booking_system"
DB_USER="booking_user"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
EOF

chmod +x /home/user/backup_db.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/user/backup_db.sh") | crontab -
```

### Application Backup
```bash
# Backup application files and configuration
tar -czf /home/user/backups/app_backup_$(date +%Y%m%d).tar.gz \
  Movie\ Ticket\ Booking\ System/ \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check MySQL service status
sudo systemctl status mysql

# Check if port is open
netstat -tlnp | grep 3306

# Test database connection
mysql -u booking_user -p movie_booking_system -e "SELECT 1;"
```

#### Application Won't Start
```bash
# Check Node.js version
node --version

# Check for missing dependencies
npm audit

# Check environment variables
cat .env | grep -v PASSWORD

# Check application logs
pm2 logs movie-booking-api
```

#### High Memory Usage
```bash
# Check PM2 processes
pm2 status

# Monitor memory usage
pm2 monit

# Restart if memory leak suspected
pm2 restart movie-booking-api
```

### Performance Optimization

#### Database Optimization
```bash
# Analyze slow queries
mysql -u booking_user -p -e "
  SET GLOBAL slow_query_log = 'ON';
  SET GLOBAL long_query_time = 2;
  SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
"

# Optimize tables
mysql -u booking_user -p movie_booking_system -e "OPTIMIZE TABLE bookings, booking_seats, shows;"
```

#### Application Optimization
```bash
# Enable gzip compression in reverse proxy
# Monitor API response times
# Implement caching strategies
# Use connection pooling effectively
```

## Health Checks

### Application Health Check
```bash
# Create health check script
cat > health_check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $response -eq 200 ]; then
  echo "Application is healthy"
  exit 0
else
  echo "Application is not responding"
  exit 1
fi
EOF

chmod +x health_check.sh
```

### Database Health Check
```bash
# Check database connectivity
mysql -u booking_user -p movie_booking_system -e "SELECT 1 as health_check;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Database is healthy"
else
  echo "Database connection failed"
fi
```

## Updates and Maintenance

### Application Updates
```bash
# Create update script
cat > update_app.sh << 'EOF'
#!/bin/bash
cd Movie\ Ticket\ Booking\ System

# Pull latest changes
git pull origin main

# Update dependencies
cd backend
npm update

# Restart application
pm2 restart movie-booking-api

echo "Application updated successfully"
EOF
```

### Database Migrations
```bash
# Run new migrations
cd database/migrations
mysql -u booking_user -p movie_booking_system < new_migration.sql
```

## Support and Documentation

### Configuration Files
- `.env` - Environment configuration
- `ecosystem.config.js` - PM2 configuration
- `/etc/mysql/mysql.conf.d/mysqld.cnf` - MySQL configuration

### Log Locations
- Application logs: `./logs/`
- PM2 logs: `~/.pm2/logs/`
- MySQL logs: `/var/log/mysql/`
- System logs: `/var/log/syslog`

### Useful Commands
```bash
# Application management
pm2 status
pm2 restart movie-booking-api
pm2 logs movie-booking-api

# Database management
mysql -u booking_user -p movie_booking_system
mysqldump -u booking_user -p movie_booking_system > backup.sql

# System monitoring
htop
df -h
free -h
netstat -tlnp
```

For additional deployment options, see:
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Local development setup
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Advanced production deployment
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Docker-based deployment
- [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) - Database deployment and migration