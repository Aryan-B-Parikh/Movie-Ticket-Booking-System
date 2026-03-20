-- ============================================================================
-- Seed Data: Users
-- File: 001_seed_users.sql
-- Purpose: Create initial user accounts (5 regular users + 2 admins)
-- Password: All users have 'password123' (hashed with bcrypt, cost=10)
-- ============================================================================

-- Truncate table to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert users with realistic bcrypt password hashes
-- Hash for 'password123': $2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2
INSERT INTO Users (user_id, name, email, password_hash, role) VALUES
-- Regular Users (role = 'USER')
(1, 'John Smith', 'john.smith@email.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'USER'),
(2, 'Sarah Johnson', 'sarah.j@email.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'USER'),
(3, 'Michael Chen', 'michael.chen@email.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'USER'),
(4, 'Emily Davis', 'emily.davis@email.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'USER'),
(5, 'David Martinez', 'david.m@email.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'USER'),

-- Admin Users (role = 'ADMIN')
(6, 'Admin User', 'admin@moviebooking.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'ADMIN'),
(7, 'Super Admin', 'superadmin@moviebooking.com', '$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2', 'ADMIN');

-- Verify insertion
SELECT COUNT(*) AS 'Total Users',
       SUM(CASE WHEN role = 'USER' THEN 1 ELSE 0 END) AS 'Regular Users',
       SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS 'Admin Users'
FROM Users;
