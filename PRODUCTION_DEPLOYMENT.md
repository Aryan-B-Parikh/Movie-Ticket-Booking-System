# Production Deployment Guide

## Overview
This guide covers advanced production deployment of the Movie Ticket Booking System with security hardening, high availability, monitoring, and scalability considerations.

## Production Architecture

### Recommended Infrastructure
```
Internet → Load Balancer → Reverse Proxy (Nginx) → Application Servers (PM2) → Database (MySQL)
           ↓
        SSL Termination
           ↓
        Rate Limiting
           ↓
        Static Files (CDN)
```

## Server Requirements

### Minimum Production Specs
- **CPU**: 4 cores, 2.8GHz
- **RAM**: 16GB (32GB recommended)
- **Storage**: 100GB SSD (with 20GB for application, 80GB for database)
- **Network**: 1Gbps connection
- **OS**: Ubuntu 22.04 LTS Server

### Recommended Production Specs
- **CPU**: 8 cores, 3.0GHz+
- **RAM**: 32GB+
- **Storage**: 500GB+ NVMe SSD
- **Network**: 10Gbps connection
- **Backup**: Separate storage for backups

### Multi-Server Setup
```
Production Environment:
├── Load Balancer Server (2 cores, 4GB RAM)
├── Application Server 1 (4 cores, 16GB RAM)
├── Application Server 2 (4 cores, 16GB RAM)
├── Database Server (8 cores, 32GB RAM)
└── Monitoring Server (2 cores, 8GB RAM)
```

## Pre-Deployment Checklist

### Infrastructure
- [ ] Server provisioning complete
- [ ] Network security groups configured
- [ ] SSH key-based authentication set up
- [ ] Domain name and DNS records configured
- [ ] SSL certificates obtained
- [ ] Backup storage configured

### Security
- [ ] Firewall rules configured
- [ ] User accounts created with proper permissions
- [ ] Database users with minimal privileges
- [ ] Environment variables secured
- [ ] Security scanning completed

### Application
- [ ] Code reviewed and tested
- [ ] Database migrations prepared
- [ ] Configuration files prepared
- [ ] Monitoring and logging configured
- [ ] Backup procedures tested

## Production Server Setup

### 1. Base Server Configuration

#### System Updates and Security
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install security updates automatically
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure automatic security updates
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades

# Install fail2ban for intrusion prevention
sudo apt install fail2ban -y

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

#### User Management
```bash
# Create application user
sudo useradd -m -s /bin/bash movieapp
sudo usermod -aG sudo movieapp

# Set up SSH key for application user
sudo mkdir -p /home/movieapp/.ssh
sudo chmod 700 /home/movieapp/.ssh
sudo chown movieapp:movieapp /home/movieapp/.ssh

# Copy your public key to authorized_keys
echo "your-ssh-public-key" | sudo tee /home/movieapp/.ssh/authorized_keys
sudo chmod 600 /home/movieapp/.ssh/authorized_keys
sudo chown movieapp:movieapp /home/movieapp/.ssh/authorized_keys
```

#### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 if using non-standard port)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MySQL from application servers only
sudo ufw allow from <app-server-1-ip> to any port 3306
sudo ufw allow from <app-server-2-ip> to any port 3306

# Enable firewall
sudo ufw enable
```

### 2. Install Production Dependencies

#### Node.js Installation
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
```

#### MySQL Production Installation
```bash
# Install MySQL Server 8.0
sudo apt update
sudo apt install mysql-server -y

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
sudo mysql_secure_installation
```

### 3. MySQL Production Configuration

#### Production MySQL Configuration
```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

**Production MySQL Settings:**
```ini
[mysqld]
# Basic Settings
user = mysql
port = 3306
basedir = /usr
datadir = /var/lib/mysql
tmpdir = /tmp
socket = /var/run/mysqld/mysqld.sock

# Security Settings
bind-address = 127.0.0.1  # Bind to localhost only
skip-networking = false
skip-name-resolve = true

# Connection Settings
max_connections = 200
max_user_connections = 150
max_connect_errors = 100000

# Memory Settings (adjust based on available RAM)
innodb_buffer_pool_size = 8G  # 50-70% of total RAM
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT

# Performance Settings
query_cache_type = 0  # Disabled in MySQL 8.0
query_cache_size = 0
thread_cache_size = 16
table_open_cache = 4000
tmp_table_size = 256M
max_heap_table_size = 256M

# Logging Settings
general_log = OFF
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = ON

# Binary Logging (for replication/backup)
log_bin = /var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds = 604800  # 7 days
max_binlog_size = 100M

# InnoDB Settings
innodb_file_per_table = ON
innodb_buffer_pool_instances = 4
innodb_read_io_threads = 4
innodb_write_io_threads = 4
```

#### Restart MySQL and Verify
```bash
# Restart MySQL
sudo systemctl restart mysql

# Verify configuration
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
mysql -u root -p -e "SHOW GLOBAL STATUS LIKE 'connections';"
```

#### Create Production Database and User
```bash
# Connect to MySQL
mysql -u root -p

# Create production database
CREATE DATABASE movie_booking_prod;

# Create production user with restricted privileges
CREATE USER 'movieapp_prod'@'localhost' IDENTIFIED BY 'SECURE_PRODUCTION_PASSWORD';

# Grant minimal required privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON movie_booking_prod.* TO 'movieapp_prod'@'localhost';
GRANT EXECUTE ON movie_booking_prod.* TO 'movieapp_prod'@'localhost';
GRANT CREATE TEMPORARY TABLES ON movie_booking_prod.* TO 'movieapp_prod'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 4. Application Deployment

#### Application Directory Structure
```bash
# Create application directory
sudo mkdir -p /opt/movieapp
sudo chown movieapp:movieapp /opt/movieapp

# Switch to application user
sudo -u movieapp -i

# Create directory structure
mkdir -p /opt/movieapp/{app,logs,backups,configs}
cd /opt/movieapp
```

#### Deploy Application Code
```bash
# Clone repository
git clone <your-repository-url> app
cd app

# Install dependencies (production only)
cd backend
npm ci --only=production

# Create logs directory
mkdir -p logs
```

#### Production Environment Configuration
```bash
# Create production environment file
cat > .env.production << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=movieapp_prod
DB_PASSWORD=SECURE_PRODUCTION_PASSWORD
DB_NAME=movie_booking_prod

# Database Connection Pool
DB_CONNECTION_LIMIT=20
DB_QUEUE_LIMIT=0

# Authentication (Generate strong secrets)
JWT_SECRET=SUPER_SECURE_JWT_SECRET_32_CHARACTERS_MINIMUM
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# API Configuration
API_PREFIX=/api

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/movieapp/logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Secure environment file
chmod 600 .env.production
```

#### PM2 Production Configuration
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'movie-booking-api',
    script: './src/server.js',
    instances: 'max',  # Use all CPU cores
    exec_mode: 'cluster',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production'
    },
    # Logging
    log_file: '/opt/movieapp/logs/combined.log',
    out_file: '/opt/movieapp/logs/out.log',
    error_file: '/opt/movieapp/logs/error.log',
    time: true,

    # Memory management
    max_memory_restart: '2G',

    # Auto restart settings
    watch: false,
    ignore_watch: ['node_modules', 'logs'],

    # Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    # Health monitoring
    max_restarts: 10,
    min_uptime: '10s'
  }],

  deploy: {
    production: {
      user: 'movieapp',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'your-repository-url',
      path: '/opt/movieapp',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
EOF
```

### 5. Database Schema Deployment

#### Deploy Database Schema
```bash
# Navigate to database directory
cd /opt/movieapp/app/database

# Apply schema to production database
mysql -u movieapp_prod -p movie_booking_prod < schema/init_database.sql
mysql -u movieapp_prod -p movie_booking_prod < schema/001_create_tables.sql
mysql -u movieapp_prod -p movie_booking_prod < schema/002_create_indexes.sql
mysql -u movieapp_prod -p movie_booking_prod < schema/003_create_constraints.sql

# Install stored procedures
mysql -u movieapp_prod -p movie_booking_prod < procedures/sp_get_available_seats.sql
mysql -u movieapp_prod -p movie_booking_prod < procedures/sp_book_tickets.sql
mysql -u movieapp_prod -p movie_booking_prod < procedures/sp_cancel_booking.sql

# Install triggers
mysql -u movieapp_prod -p movie_booking_prod < triggers/trg_prevent_double_booking.sql
mysql -u movieapp_prod -p movie_booking_prod < triggers/trg_validate_show_time.sql
mysql -u movieapp_prod -p movie_booking_prod < triggers/trg_audit_booking_create.sql
mysql -u movieapp_prod -p movie_booking_prod < triggers/trg_audit_booking_changes.sql
mysql -u movieapp_prod -p movie_booking_prod < triggers/trg_prevent_payment_modification.sql

# Install views
mysql -u movieapp_prod -p movie_booking_prod < views/vw_available_seats.sql
mysql -u movieapp_prod -p movie_booking_prod < views/vw_booking_summary.sql
mysql -u movieapp_prod -p movie_booking_prod < views/vw_show_occupancy.sql

# Load initial production data (if needed)
# mysql -u movieapp_prod -p movie_booking_prod < seeds/production_data.sql
```

#### Verify Database Installation
```bash
# Test database connection
mysql -u movieapp_prod -p movie_booking_prod -e "SHOW TABLES;"

# Verify stored procedures
mysql -u movieapp_prod -p movie_booking_prod -e "SHOW PROCEDURE STATUS WHERE Db = 'movie_booking_prod';"

# Verify triggers
mysql -u movieapp_prod -p movie_booking_prod -e "
  SELECT TRIGGER_NAME, EVENT_MANIPULATION, TIMING
  FROM INFORMATION_SCHEMA.TRIGGERS
  WHERE TRIGGER_SCHEMA = 'movie_booking_prod';"
```

### 6. Nginx Reverse Proxy Setup

#### Install and Configure Nginx
```bash
# Install Nginx
sudo apt install nginx -y

# Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# Create application configuration
sudo nano /etc/nginx/sites-available/movie-booking
```

**Nginx Configuration:**
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# Upstream application servers
upstream movie_booking_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    # Add more servers for load balancing
    # server 192.168.1.101:3001 max_fails=3 fail_timeout=30s;
    # server 192.168.1.102:3001 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_cache shared:le_nginx_SSL:10m;
    ssl_session_timeout 1440m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Logging
    access_log /var/log/nginx/movie-booking.access.log;
    error_log /var/log/nginx/movie-booking.error.log;

    # API routes with rate limiting
    location /api/ {
        # Apply rate limiting
        limit_req zone=api burst=20 nodelay;

        # Proxy settings
        proxy_pass http://movie_booking_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Stricter rate limiting for auth endpoints
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;

        proxy_pass http://movie_booking_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://movie_booking_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Block unwanted requests
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Block common exploit attempts
    location ~* \.(sql|bak|old|backup)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

#### Enable Nginx Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/movie-booking /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7. SSL Certificate Setup

#### Using Let's Encrypt (Certbot)
```bash
# Install certbot
sudo apt install snapd -y
sudo snap install --classic certbot

# Create symbolic link
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Obtain SSL certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Test renewal
sudo certbot renew --dry-run

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 8. Application Startup

#### Start Application with PM2
```bash
# Switch to application user
sudo -u movieapp -i

# Navigate to application directory
cd /opt/movieapp/app/backend

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 startup script
pm2 startup
# Follow the instructions to run the generated command
```

#### Configure PM2 as System Service
```bash
# Generate startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u movieapp --hp /home/movieapp

# Enable and start PM2 service
sudo systemctl enable pm2-movieapp
sudo systemctl start pm2-movieapp
```

## Security Hardening

### 1. System Security

#### SSH Hardening
```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
Port 2222  # Change default port
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

#### Fail2Ban Configuration
```bash
# Configure Fail2Ban for Nginx
sudo nano /etc/fail2ban/jail.local

# Add configuration:
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
```

### 2. Database Security

#### MySQL Security Configuration
```bash
# Additional MySQL security
mysql -u root -p

# Disable unnecessary features
SET GLOBAL local_infile = 0;

# Remove test databases and users
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
FLUSH PRIVILEGES;

# Create read-only user for monitoring
CREATE USER 'monitor'@'localhost' IDENTIFIED BY 'monitor_password';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'monitor'@'localhost';
GRANT SELECT ON performance_schema.* TO 'monitor'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Application Security

#### Environment Security
```bash
# Secure environment files
sudo chmod 600 /opt/movieapp/app/backend/.env.production
sudo chown movieapp:movieapp /opt/movieapp/app/backend/.env.production

# Set up secrets management (example with HashiCorp Vault)
# For production, consider using proper secrets management
```

## Monitoring and Logging

### 1. Application Monitoring

#### Install Monitoring Tools
```bash
# Install htop for system monitoring
sudo apt install htop -y

# Install netdata for real-time monitoring
sudo apt install netdata -y

# Configure netdata
sudo nano /etc/netdata/netdata.conf
```

#### PM2 Monitoring
```bash
# Enable PM2 monitoring
pm2 install pm2-server-monit

# View monitoring dashboard
pm2 monit

# Set up PM2 monitoring web interface
pm2 set pm2-server-monit:monitoring true
```

### 2. Log Management

#### Configure Log Rotation
```bash
# Create log rotation for application
sudo nano /etc/logrotate.d/movie-booking

# Configuration:
/opt/movieapp/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 movieapp movieapp
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### Centralized Logging (Optional)
```bash
# Install and configure rsyslog for centralized logging
sudo nano /etc/rsyslog.d/movie-booking.conf

# Configuration:
$ModLoad imfile
$InputFileName /opt/movieapp/logs/combined.log
$InputFileTag movie-booking:
$InputFileStateFile stat-movie-booking
$InputFileSeverity info
$InputFileFacility local7
$InputRunFileMonitor
local7.* /var/log/movie-booking-app.log
```

### 3. Health Checks and Alerts

#### Create Health Check Script
```bash
# Create health check script
cat > /opt/movieapp/scripts/health_check.sh << 'EOF'
#!/bin/bash

# Configuration
API_URL="https://yourdomain.com/api/health"
DB_HOST="localhost"
DB_USER="monitor"
DB_PASS="monitor_password"
DB_NAME="movie_booking_prod"

# Email configuration
ALERT_EMAIL="admin@yourdomain.com"
LOG_FILE="/opt/movieapp/logs/health_check.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Function to send alert
send_alert() {
    echo "$1" | mail -s "Movie Booking System Alert" $ALERT_EMAIL
    log_message "ALERT: $1"
}

# Check API health
api_response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
if [ "$api_response" != "200" ]; then
    send_alert "API health check failed. HTTP status: $api_response"
fi

# Check database connectivity
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    send_alert "Database health check failed"
fi

# Check PM2 processes
pm2_status=$(pm2 jlist | jq -r '.[] | select(.name=="movie-booking-api") | .pm2_env.status')
if [ "$pm2_status" != "online" ]; then
    send_alert "PM2 process is not online. Status: $pm2_status"
fi

# Check disk space
disk_usage=$(df /opt/movieapp | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 85 ]; then
    send_alert "Disk usage is high: ${disk_usage}%"
fi

log_message "Health check completed successfully"
EOF

chmod +x /opt/movieapp/scripts/health_check.sh

# Schedule health checks
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/movieapp/scripts/health_check.sh") | crontab -
```

## Backup and Recovery

### 1. Database Backup Strategy

#### Automated Database Backup
```bash
# Create backup script
cat > /opt/movieapp/scripts/backup_database.sh << 'EOF'
#!/bin/bash

# Configuration
DB_USER="movieapp_prod"
DB_PASS="SECURE_PRODUCTION_PASSWORD"
DB_NAME="movie_booking_prod"
BACKUP_DIR="/opt/movieapp/backups/database"
S3_BUCKET="your-backup-bucket"  # Optional: for cloud backups
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/moviebooking_$(date +%Y%m%d_%H%M%S).sql"

# Perform database backup
mysqldump -u $DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --default-character-set=utf8mb4 \
    $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3 (optional)
# aws s3 cp $BACKUP_FILE.gz s3://$S3_BUCKET/database/

# Remove old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database backup completed: $BACKUP_FILE.gz" >> /opt/movieapp/logs/backup.log
EOF

chmod +x /opt/movieapp/scripts/backup_database.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/movieapp/scripts/backup_database.sh") | crontab -
```

### 2. Application Backup
```bash
# Create application backup script
cat > /opt/movieapp/scripts/backup_application.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/movieapp/backups/application"
APP_DIR="/opt/movieapp/app"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

# Create application backup (excluding node_modules and logs)
tar -czf $BACKUP_DIR/application_$(date +%Y%m%d_%H%M%S).tar.gz \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=.git \
    -C /opt/movieapp app

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Application backup completed" >> /opt/movieapp/logs/backup.log
EOF

chmod +x /opt/movieapp/scripts/backup_application.sh

# Schedule weekly backups
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/movieapp/scripts/backup_application.sh") | crontab -
```

### 3. Recovery Procedures

#### Database Recovery
```bash
# Create recovery script
cat > /opt/movieapp/scripts/restore_database.sh << 'EOF'
#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1
DB_USER="movieapp_prod"
DB_PASS="SECURE_PRODUCTION_PASSWORD"
DB_NAME="movie_booking_prod"

# Stop application
pm2 stop movie-booking-api

# Decompress backup
gunzip -k $BACKUP_FILE

# Restore database
mysql -u $DB_USER -p$DB_PASS $DB_NAME < ${BACKUP_FILE%.gz}

# Start application
pm2 start movie-booking-api

echo "Database restoration completed"
EOF

chmod +x /opt/movieapp/scripts/restore_database.sh
```

## Performance Optimization

### 1. Database Optimization

#### MySQL Performance Tuning
```sql
-- Optimize tables
OPTIMIZE TABLE Users, Movies, Theatres, Screens, Seats, Shows, Bookings, Booking_Seats, Payments;

-- Analyze tables for query optimization
ANALYZE TABLE Users, Movies, Theatres, Screens, Seats, Shows, Bookings, Booking_Seats, Payments;

-- Monitor slow queries
SELECT * FROM performance_schema.events_statements_summary_by_digest
WHERE digest_text LIKE '%movie_booking_prod%'
ORDER BY avg_timer_wait DESC LIMIT 10;
```

#### Database Connection Pool Optimization
```javascript
// Optimized database configuration for production
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Connection pool settings
  connectionLimit: 50,      // Increased for production
  queueLimit: 0,            // No queue limit
  acquireTimeout: 60000,    // 60 seconds
  timeout: 60000,           // 60 seconds
  reconnect: true,

  // Keep connections alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // SSL configuration (if needed)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});
```

### 2. Application Performance

#### PM2 Cluster Configuration
```javascript
// Optimized PM2 configuration
module.exports = {
  apps: [{
    name: 'movie-booking-api',
    script: './src/server.js',
    instances: 0,  // Use all CPU cores
    exec_mode: 'cluster',

    // Performance settings
    node_args: '--max_old_space_size=2048',
    max_memory_restart: '2G',

    // Graceful restart
    kill_timeout: 10000,
    wait_ready: true,
    listen_timeout: 10000,

    // Auto scaling
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. Caching Strategy

#### Redis Configuration (Optional)
```bash
# Install Redis for caching
sudo apt install redis-server -y

# Configure Redis
sudo nano /etc/redis/redis.conf

# Key settings:
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Load Balancing and Scaling

### 1. Multi-Server Deployment

#### Load Balancer Configuration
```nginx
# Advanced Nginx load balancing
upstream movie_booking_backend {
    least_conn;

    # Application servers
    server 192.168.1.101:3001 weight=3 max_fails=3 fail_timeout=30s;
    server 192.168.1.102:3001 weight=3 max_fails=3 fail_timeout=30s;
    server 192.168.1.103:3001 weight=2 max_fails=3 fail_timeout=30s;

    # Keep-alive connections
    keepalive 64;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

# Health check location
location /health {
    access_log off;
    proxy_pass http://movie_booking_backend;
    proxy_set_header Host $host;
    proxy_connect_timeout 2s;
    proxy_send_timeout 2s;
    proxy_read_timeout 2s;
}
```

### 2. Database Scaling

#### Read Replicas Setup
```sql
-- Configure master server
SET GLOBAL server_id = 1;
SET GLOBAL log_bin = ON;
SET GLOBAL binlog_format = 'ROW';

-- Create replication user
CREATE USER 'replication'@'%' IDENTIFIED BY 'replication_password';
GRANT REPLICATION SLAVE ON *.* TO 'replication'@'%';
FLUSH PRIVILEGES;

-- Get master status
SHOW MASTER STATUS;
```

## Monitoring and Alerting

### 1. System Monitoring

#### Prometheus and Grafana Setup
```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
sudo mv prometheus-*/prometheus /usr/local/bin/
sudo mv prometheus-*/promtool /usr/local/bin/

# Create Prometheus configuration
sudo nano /etc/prometheus/prometheus.yml
```

### 2. Application Performance Monitoring

#### PM2 Keymetrics Integration
```bash
# Link PM2 to Keymetrics
pm2 link your-secret-key your-public-key

# Monitor with PM2 Plus
pm2 install pm2-auto-pull
pm2 install pm2-server-monit
```

## Troubleshooting Production Issues

### 1. Common Production Problems

#### High CPU Usage
```bash
# Identify CPU-intensive processes
top -p $(pgrep -d',' node)

# Analyze PM2 processes
pm2 monit

# Check for infinite loops or blocking operations
```

#### Memory Leaks
```bash
# Monitor memory usage
free -h
pm2 status

# Generate heap dumps
kill -USR2 $(pgrep -f "movie-booking-api")

# Analyze heap dumps with clinic.js
npm install -g clinic
clinic doctor -- node src/server.js
```

#### Database Connection Issues
```bash
# Check MySQL process list
mysql -u root -p -e "SHOW PROCESSLIST;"

# Monitor connection pool
# Check application logs for connection errors

# Reset connection pool
pm2 restart movie-booking-api
```

### 2. Emergency Procedures

#### Rollback Deployment
```bash
# Quick rollback script
cat > /opt/movieapp/scripts/rollback.sh << 'EOF'
#!/bin/bash

echo "Rolling back to previous version..."

# Stop current application
pm2 stop movie-booking-api

# Switch to previous version
cd /opt/movieapp
mv app app-current
mv app-previous app

# Start application
cd app/backend
pm2 start ecosystem.config.js --env production

echo "Rollback completed"
EOF

chmod +x /opt/movieapp/scripts/rollback.sh
```

#### Emergency Maintenance Mode
```bash
# Nginx maintenance configuration
sudo nano /etc/nginx/sites-available/maintenance

# Simple maintenance page
server {
    listen 80;
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        return 503 'System under maintenance. Please try again later.';
        add_header Content-Type text/plain always;
    }
}
```

This production deployment guide provides a comprehensive setup for deploying the Movie Ticket Booking System in a production environment with proper security, monitoring, and scalability considerations. Adjust the configurations based on your specific requirements and infrastructure.