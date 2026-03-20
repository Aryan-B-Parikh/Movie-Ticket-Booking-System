#!/usr/bin/env node

/**
 * Movie Ticket Booking System - Quick Start & Status Check
 * =========================================================
 * This script verifies everything is ready to run
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';

console.log(`\n${BLUE}🎬 MOVIE TICKET BOOKING SYSTEM - QUICK START${RESET}`);
console.log('='.repeat(50));

// Check critical files
console.log(`\n${BLUE}📋 CHECKING SYSTEM COMPONENTS...${RESET}`);

const files = [
  { name: 'Backend .env', path: 'backend/.env' },
  { name: 'Database Schema', path: 'database/schema/001_create_tables.sql' },
  { name: 'Stored Procedures', path: 'database/procedures/sp_book_tickets.sql' },
  { name: 'API Documentation', path: 'docs/API_DOCUMENTATION.md' },
  { name: 'Web Frontend', path: 'frontend/web/index.html' },
  { name: 'CLI Frontend', path: 'frontend/cli/package.json' }
];

let allGood = true;
files.forEach(file => {
  const exists = fs.existsSync(file.path);
  const status = exists ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  console.log(`${status} ${file.name}`);
  if (!exists) allGood = false;
});

// Check package.json
console.log(`\n${BLUE}📦 CHECKING DEPENDENCIES...${RESET}`);
const backendPackage = path.join('backend', 'package.json');
if (fs.existsSync(backendPackage)) {
  const pkg = JSON.parse(fs.readFileSync(backendPackage, 'utf8'));
  console.log(`${GREEN}✅${RESET} Backend package.json found`);
  console.log(`   Dependencies: ${Object.keys(pkg.dependencies).length} packages`);
  console.log(`   Dev Dependencies: ${Object.keys(pkg.devDependencies).length} packages`);
} else {
  console.log(`${RED}❌${RESET} Backend package.json not found`);
  allGood = false;
}

// Database credentials check
console.log(`\n${BLUE}🔐 DATABASE CONFIGURATION...${RESET}`);
if (fs.existsSync('backend/.env')) {
  const envContent = fs.readFileSync('backend/.env', 'utf8');
  if (envContent.includes('DB_USER') && envContent.includes('DB_PASSWORD')) {
    console.log(`${GREEN}✅${RESET} Database credentials configured`);
  } else {
    console.log(`${YELLOW}⚠️${RESET} Database credentials not fully configured`);
  }
} else {
  console.log(`${RED}❌${RESET} .env file not found`);
  allGood = false;
}

// Print quick start commands
console.log(`\n${BLUE}🚀 READY TO START! FOLLOW THESE STEPS:${RESET}`);
console.log('');
console.log(`${YELLOW}Step 1: Initialize Database${RESET}`);
console.log('   mysql -u 08Aryan@06Parikh -p -e "CREATE DATABASE IF NOT EXISTS movie_booking_db CHARACTER SET utf8mb4;"');
console.log('   mysql -u 08Aryan@06Parikh -p movie_booking_db < database/schema/init_database.sql');
console.log('');

console.log(`${YELLOW}Step 2: Start Backend Server${RESET}`);
console.log('   cd backend');
console.log('   npm install  # (if not already done)');
console.log('   npm start');
console.log('   # Backend runs on: http://localhost:3000');
console.log('');

console.log(`${YELLOW}Step 3: Start Web Frontend (Terminal 2)${RESET}`);
console.log('   cd frontend/web');
console.log('   python -m http.server 8080');
console.log('   # Web UI runs on: http://localhost:8080');
console.log('');

console.log(`${YELLOW}Step 4: OR use CLI Frontend (Terminal 2)${RESET}`);
console.log('   cd frontend/cli');
console.log('   npm install  # (if not already done)');
console.log('   npm start auth login');
console.log('');

// API endpoints
console.log(`${BLUE}📡 AVAILABLE API ENDPOINTS:${RESET}`);
const endpoints = [
  ['Authentication', 'POST /api/auth/login'],
  ['Movies', 'GET /api/movies'],
  ['Shows', 'GET /api/shows/upcoming'],
  ['Bookings', 'POST /api/bookings'],
  ['User Bookings', 'GET /api/bookings/my-bookings'],
  ['Available Seats', 'GET /api/shows/:id/seats'],
  ['Health Check', 'GET /health']
];

endpoints.forEach(([name, endpoint]) => {
  console.log(`   ${GREEN}✅${RESET} ${endpoint.padEnd(30)} - ${name}`);
});

// Final status
console.log('');
console.log('='.repeat(50));
if (allGood) {
  console.log(`${GREEN}🎉 SYSTEM READY FOR DEPLOYMENT!${RESET}`);
} else {
  console.log(`${YELLOW}⚠️ SOME COMPONENTS MISSING - SEE ABOVE${RESET}`);
}

console.log(`\n${BLUE}📚 DOCUMENTATION:${RESET}`);
console.log(`   • Main Docs: docs/README.md`);
console.log(`   • Development Setup: docs/DEVELOPMENT_SETUP.md`);
console.log(`   • API Reference: docs/API_DOCUMENTATION.md`);
console.log(`   • Database Schema: docs/SRS.md`);
console.log(`   • Project Plan: docs/PROJECT_PLAN.md`);
console.log('');

console.log(`${BLUE}🌟 QUICK LINKS:${RESET}`);
console.log(`   Web UI: http://localhost:8080`);
console.log(`   Backend API: http://localhost:3000/api`);
console.log(`   API Docs: Postman Collection at docs/postman_collection.json`);
console.log('');
