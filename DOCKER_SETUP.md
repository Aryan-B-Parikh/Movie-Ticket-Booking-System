# Docker Deployment Guide

## Overview
This guide covers containerized deployment of the Movie Ticket Booking System using Docker and Docker Compose for both development and production environments.

## Prerequisites

### System Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Operating System**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 20GB available space

### Installation

#### Install Docker (Ubuntu/Debian)
```bash
# Update package index
sudo apt update

# Install dependencies
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release -y

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### Install Docker (macOS)
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop/
# Or install using Homebrew
brew install --cask docker

# Verify installation
docker --version
docker compose version
```

#### Install Docker (Windows)
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop/
# Ensure WSL2 backend is enabled
# Verify installation in PowerShell
docker --version
docker compose version
```

## Docker Configuration

### 1. Application Dockerfile

Create `backend/Dockerfile`:
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S movieapp -u 1001 -G nodejs

# Copy source code
COPY --chown=movieapp:nodejs . .

# Expose port
EXPOSE 3000

# Switch to non-root user
USER movieapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# Start application
CMD ["node", "src/server.js"]

# Development stage
FROM base AS development

USER root

# Install development dependencies
RUN npm ci && npm cache clean --force

# Install development tools
RUN npm install -g nodemon

USER movieapp

# Override CMD for development
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Set production environment
ENV NODE_ENV=production

# Start application
CMD ["node", "src/server.js"]
```

### 2. Health Check Script

Create `backend/healthcheck.js`:
```javascript
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('Health check error:', err.message);
  process.exit(1);
});

request.end();
```

### 3. Docker Ignore File

Create `backend/.dockerignore`:
```
node_modules
npm-debug.log
logs
coverage
.nyc_output
.env
.env.local
.env.test
.DS_Store
*.log
tests
.git
.gitignore
README.md
Dockerfile
docker-compose*.yml
```

## Development Environment

### 1. Development Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: movieapp_mysql_dev
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: movie_booking_dev
      MYSQL_USER: dev_user
      MYSQL_PASSWORD: dev_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema:/docker-entrypoint-initdb.d/schema
      - ./database/procedures:/docker-entrypoint-initdb.d/procedures
      - ./database/triggers:/docker-entrypoint-initdb.d/triggers
      - ./database/views:/docker-entrypoint-initdb.d/views
      - ./mysql/conf.d:/etc/mysql/conf.d
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - movieapp_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache (optional)
  redis:
    image: redis:7-alpine
    container_name: movieapp_redis_dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - movieapp_network
    command: redis-server --appendonly yes

  # Application Backend
  backend:
    build:
      context: ./backend
      target: development
    container_name: movieapp_backend_dev
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=dev_user
      - DB_PASSWORD=dev_password
      - DB_NAME=movie_booking_dev
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules  # Anonymous volume for node_modules
      - ./backend/logs:/app/logs
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - movieapp_network
    command: npm run dev

  # phpMyAdmin (optional database administration)
  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    container_name: movieapp_phpmyadmin_dev
    restart: unless-stopped
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      PMA_USER: dev_user
      PMA_PASSWORD: dev_password
    ports:
      - "8080:80"
    depends_on:
      - mysql
    networks:
      - movieapp_network

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local

networks:
  movieapp_network:
    driver: bridge
```

### 2. MySQL Configuration for Docker

Create `mysql/conf.d/movie-booking.cnf`:
```ini
[mysqld]
# Basic settings
default-authentication-plugin=mysql_native_password
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# Performance settings for development
innodb_buffer_pool_size=256M
innodb_log_file_size=64M
innodb_flush_log_at_trx_commit=2
innodb_flush_method=O_DIRECT

# Connection settings
max_connections=100
max_user_connections=80

# Logging
general_log=ON
general_log_file=/var/log/mysql/general.log
slow_query_log=ON
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2
log_queries_not_using_indexes=ON

# Binary logging
log_bin=/var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds=86400
max_binlog_size=100M
```

### 3. Environment Configuration for Development

Create `backend/.env.docker`:
```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration (Docker services)
DB_HOST=mysql
DB_PORT=3306
DB_USER=dev_user
DB_PASSWORD=dev_password
DB_NAME=movie_booking_dev

# Database Connection Pool
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Authentication
JWT_SECRET=development_jwt_secret_change_for_production
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=10

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# API Configuration
API_PREFIX=/api

# Development specific
LOG_LEVEL=debug
```

## Production Environment

### 1. Production Docker Compose

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: movieapp_mysql_prod
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
      MYSQL_DATABASE: movie_booking_prod
      MYSQL_USER: movieapp_prod
      MYSQL_PASSWORD_FILE: /run/secrets/mysql_user_password
    volumes:
      - mysql_prod_data:/var/lib/mysql
      - ./database/schema:/docker-entrypoint-initdb.d/schema:ro
      - ./database/procedures:/docker-entrypoint-initdb.d/procedures:ro
      - ./database/triggers:/docker-entrypoint-initdb.d/triggers:ro
      - ./database/views:/docker-entrypoint-initdb.d/views:ro
      - ./mysql/conf.d/production.cnf:/etc/mysql/conf.d/production.cnf:ro
      - mysql_logs:/var/log/mysql
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - movieapp_internal
    secrets:
      - mysql_root_password
      - mysql_user_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: movieapp_redis_prod
    restart: always
    volumes:
      - redis_prod_data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf:ro
    networks:
      - movieapp_internal
    command: redis-server /etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Application Backend (multiple instances for load balancing)
  backend-1:
    build:
      context: ./backend
      target: production
    container_name: movieapp_backend_prod_1
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=movieapp_prod
      - DB_PASSWORD_FILE=/run/secrets/mysql_user_password
      - DB_NAME=movie_booking_prod
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    volumes:
      - app_logs:/app/logs
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - movieapp_internal
    secrets:
      - mysql_user_password
      - jwt_secret
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'

  backend-2:
    build:
      context: ./backend
      target: production
    container_name: movieapp_backend_prod_2
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=movieapp_prod
      - DB_PASSWORD_FILE=/run/secrets/mysql_user_password
      - DB_NAME=movie_booking_prod
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    volumes:
      - app_logs:/app/logs
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - movieapp_internal
    secrets:
      - mysql_user_password
      - jwt_secret
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'

  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    container_name: movieapp_nginx_prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - backend-1
      - backend-2
    networks:
      - movieapp_internal
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # Monitoring with Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: movieapp_prometheus_prod
    restart: always
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - movieapp_internal
    deploy:
      resources:
        limits:
          memory: 1G

  # Grafana for Monitoring Dashboard
  grafana:
    image: grafana/grafana:latest
    container_name: movieapp_grafana_prod
    restart: always
    environment:
      - GF_SECURITY_ADMIN_PASSWORD_FILE=/run/secrets/grafana_password
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3001:3000"  # Expose on different port
    depends_on:
      - prometheus
    networks:
      - movieapp_internal
    secrets:
      - grafana_password

volumes:
  mysql_prod_data:
    driver: local
  redis_prod_data:
    driver: local
  app_logs:
    driver: local
  nginx_logs:
    driver: local
  mysql_logs:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  movieapp_internal:
    driver: bridge
    internal: true
  movieapp_external:
    driver: bridge

secrets:
  mysql_root_password:
    file: ./secrets/mysql_root_password.txt
  mysql_user_password:
    file: ./secrets/mysql_user_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  grafana_password:
    file: ./secrets/grafana_password.txt
```

### 2. Production MySQL Configuration

Create `mysql/conf.d/production.cnf`:
```ini
[mysqld]
# Basic settings
default-authentication-plugin=mysql_native_password
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# Security settings
bind-address=0.0.0.0
skip-name-resolve=ON

# Performance settings for production
innodb_buffer_pool_size=4G
innodb_log_file_size=1G
innodb_flush_log_at_trx_commit=1
innodb_flush_method=O_DIRECT
innodb_file_per_table=ON
innodb_buffer_pool_instances=4

# Connection settings
max_connections=200
max_user_connections=150
max_connect_errors=100000
thread_cache_size=16
table_open_cache=4000

# Query cache (disabled in MySQL 8.0)
query_cache_type=0
query_cache_size=0

# Temporary table settings
tmp_table_size=256M
max_heap_table_size=256M

# Logging settings
general_log=OFF
slow_query_log=ON
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2
log_queries_not_using_indexes=ON

# Binary logging for replication/backup
log_bin=/var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds=604800
max_binlog_size=100M
binlog_format=ROW

# InnoDB specific settings
innodb_read_io_threads=8
innodb_write_io_threads=8
innodb_thread_concurrency=0
innodb_lock_wait_timeout=50
```

### 3. Nginx Configuration for Load Balancing

Create `nginx/nginx.conf`:
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    # Upstream configuration
    upstream backend {
        least_conn;
        server backend-1:3000 max_fails=3 fail_timeout=30s;
        server backend-2:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # Include additional configurations
    include /etc/nginx/conf.d/*.conf;
}
```

Create `nginx/conf.d/default.conf`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Stricter rate limiting for auth
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /api/health {
        proxy_pass http://backend;
        access_log off;
    }

    # Static files (if any)
    location /static/ {
        root /var/www/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. Redis Configuration

Create `redis/redis.conf`:
```
# Basic configuration
bind 0.0.0.0
protected-mode yes
port 6379

# Persistence
save 900 1
save 300 10
save 60 10000

# Memory management
maxmemory 1gb
maxmemory-policy allkeys-lru

# Security
requirepass your_redis_password

# Logging
loglevel notice
logfile ""

# Performance
tcp-keepalive 300
timeout 0
```

## Docker Secrets Management

### 1. Create Secrets Directory
```bash
# Create secrets directory
mkdir -p secrets

# Create secret files
echo "super_secure_mysql_root_password" > secrets/mysql_root_password.txt
echo "secure_mysql_user_password" > secrets/mysql_user_password.txt
echo "super_secure_jwt_secret_minimum_32_characters" > secrets/jwt_secret.txt
echo "grafana_admin_password" > secrets/grafana_password.txt

# Secure secret files
chmod 600 secrets/*.txt
```

### 2. Environment-Specific Secrets

#### Development Secrets
```bash
# For development, create .env files instead
cat > backend/.env.docker.dev << 'EOF'
# Development secrets (less secure, more convenient)
JWT_SECRET=development_jwt_secret
DB_PASSWORD=dev_password
REDIS_PASSWORD=dev_redis_password
EOF
```

#### Production Secrets
```bash
# For production, use Docker secrets or external secret management
# Example with HashiCorp Vault or AWS Secrets Manager integration
```

## Database Initialization

### 1. Database Initialization Scripts

Create `database/init/01-schema.sh`:
```bash
#!/bin/bash
echo "Applying database schema..."

# Apply schema files in order
mysql -h mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < /docker-entrypoint-initdb.d/schema/init_database.sql
mysql -h mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < /docker-entrypoint-initdb.d/schema/001_create_tables.sql
mysql -h mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < /docker-entrypoint-initdb.d/schema/002_create_indexes.sql
mysql -h mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < /docker-entrypoint-initdb.d/schema/003_create_constraints.sql

echo "Schema applied successfully"
```

Create `database/init/02-procedures.sh`:
```bash
#!/bin/bash
echo "Installing stored procedures..."

for procedure in /docker-entrypoint-initdb.d/procedures/*.sql; do
    echo "Installing procedure: $(basename $procedure)"
    mysql -h mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < "$procedure"
done

echo "Procedures installed successfully"
```

## Development Workflow

### 1. Start Development Environment
```bash
# Clone repository
git clone <your-repository-url>
cd Movie\ Ticket\ Booking\ System

# Start development environment
docker compose up -d

# View logs
docker compose logs -f backend

# Access services
# Application: http://localhost:3000
# phpMyAdmin: http://localhost:8080
# Redis CLI: docker exec -it movieapp_redis_dev redis-cli
```

### 2. Development Commands
```bash
# Stop all services
docker compose down

# Rebuild and start
docker compose up --build -d

# View service status
docker compose ps

# Execute commands in containers
docker exec -it movieapp_backend_dev npm test
docker exec -it movieapp_mysql_dev mysql -u dev_user -p movie_booking_dev

# View logs for specific service
docker compose logs -f mysql

# Remove all data and restart
docker compose down -v
docker compose up -d
```

### 3. Database Management in Docker
```bash
# Backup database
docker exec movieapp_mysql_dev mysqldump -u dev_user -p dev_password movie_booking_dev > backup.sql

# Restore database
docker exec -i movieapp_mysql_dev mysql -u dev_user -p dev_password movie_booking_dev < backup.sql

# Reset database
docker compose stop mysql
docker volume rm movieapp_mysql_data
docker compose up -d mysql
```

## Production Deployment

### 1. Production Setup
```bash
# Create production environment
cp docker-compose.prod.yml docker-compose.yml

# Set up secrets
./scripts/setup-secrets.sh

# Deploy with Docker Compose
docker compose -f docker-compose.prod.yml up -d

# Or deploy with Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml movieapp
```

### 2. Docker Swarm Deployment

Create `docker-stack.yml`:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          memory: 4G
          cpus: '2'
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
      MYSQL_DATABASE: movie_booking_prod
      MYSQL_USER: movieapp_prod
      MYSQL_PASSWORD_FILE: /run/secrets/mysql_user_password
    volumes:
      - mysql_data:/var/lib/mysql
    secrets:
      - mysql_root_password
      - mysql_user_password
    networks:
      - backend

  backend:
    image: movieapp/backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 60s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
    secrets:
      - mysql_user_password
      - jwt_secret
    networks:
      - backend
      - frontend
    depends_on:
      - mysql

  nginx:
    image: nginx:alpine
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == worker
    ports:
      - "80:80"
      - "443:443"
    networks:
      - frontend
    depends_on:
      - backend

volumes:
  mysql_data:
    driver: local

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay

secrets:
  mysql_root_password:
    external: true
  mysql_user_password:
    external: true
  jwt_secret:
    external: true
```

### 3. Monitoring Setup

Create `monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'movie-booking-api'
    static_configs:
      - targets: ['backend-1:3000', 'backend-2:3000']
    metrics_path: '/api/metrics'

  - job_name: 'mysql'
    static_configs:
      - targets: ['mysql:3306']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
```

## Optimization and Best Practices

### 1. Multi-Stage Builds

#### Optimized Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S movieapp -u 1001 -G nodejs

WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder --chown=movieapp:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=movieapp:nodejs . .

# Remove unnecessary files
RUN rm -rf tests/ docs/ *.md && \
    npm cache clean --force

USER movieapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

CMD ["node", "src/server.js"]
```

### 2. Resource Optimization

#### Docker Compose Resource Limits
```yaml
services:
  backend:
    # ... other configuration
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

### 3. Security Hardening

#### Security-focused Dockerfile
```dockerfile
FROM node:18-alpine

# Install security updates
RUN apk --no-cache upgrade

# Create non-root user
RUN addgroup -g 1001 -S movieapp && \
    adduser -S movieapp -u 1001 -G movieapp

# Set working directory
WORKDIR /app

# Set proper ownership
COPY --chown=movieapp:movieapp package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY --chown=movieapp:movieapp . .

# Remove package managers and unnecessary tools
RUN apk del npm

# Switch to non-root user
USER movieapp

# Use non-root port
EXPOSE 3000

# Health check
HEALTHCHECK CMD node healthcheck.js

# Start application
CMD ["node", "src/server.js"]
```

## CI/CD Integration

### 1. GitHub Actions Workflow

Create `.github/workflows/docker-build.yml`:
```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: movie_booking_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run tests
        run: |
          cd backend
          npm test
        env:
          DB_HOST: localhost
          DB_USER: root
          DB_PASSWORD: rootpassword
          DB_NAME: movie_booking_test
          NODE_ENV: test

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v3
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        run: |
          echo "Deploy to production server"
          # Add deployment commands here
```

### 2. Build and Deployment Scripts

Create `scripts/build.sh`:
```bash
#!/bin/bash

set -e

echo "Building Movie Booking System Docker images..."

# Build development image
docker build -t movieapp/backend:dev --target development ./backend

# Build production image
docker build -t movieapp/backend:prod --target production ./backend

# Tag images
docker tag movieapp/backend:prod movieapp/backend:latest

echo "Build completed successfully!"
```

Create `scripts/deploy.sh`:
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-development}

echo "Deploying Movie Booking System to $ENVIRONMENT..."

if [ "$ENVIRONMENT" = "production" ]; then
    # Production deployment
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml up -d

    echo "Waiting for services to be ready..."
    sleep 30

    # Health check
    curl -f http://localhost/api/health || exit 1

elif [ "$ENVIRONMENT" = "development" ]; then
    # Development deployment
    docker compose down
    docker compose up -d

    echo "Waiting for services to be ready..."
    sleep 20

    # Health check
    curl -f http://localhost:3000/api/health || exit 1
fi

echo "Deployment completed successfully!"
```

## Troubleshooting

### 1. Common Docker Issues

#### Container Won't Start
```bash
# Check container logs
docker logs movieapp_backend_dev

# Check container status
docker ps -a

# Inspect container
docker inspect movieapp_backend_dev

# Check resource usage
docker stats
```

#### Database Connection Issues
```bash
# Test database connectivity
docker exec -it movieapp_mysql_dev mysql -u dev_user -p movie_booking_dev

# Check database logs
docker logs movieapp_mysql_dev

# Verify network connectivity
docker exec -it movieapp_backend_dev ping mysql
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check container processes
docker exec -it movieapp_backend_dev top

# Analyze image size
docker images
docker history movieapp/backend:latest
```

### 2. Debugging in Docker

#### Debug Application
```bash
# Start container in debug mode
docker run -it --rm \
  -p 3000:3000 \
  -p 9229:9229 \
  movieapp/backend:dev \
  node --inspect=0.0.0.0:9229 src/server.js

# Attach VS Code debugger to localhost:9229
```

#### Database Debugging
```bash
# Enable MySQL query logging
docker exec -it movieapp_mysql_dev mysql -u root -p

SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

# View logs
docker exec -it movieapp_mysql_dev tail -f /var/log/mysql/general.log
```

This comprehensive Docker setup guide provides everything needed to deploy the Movie Ticket Booking System using containers, from development to production environments with proper monitoring and security considerations.