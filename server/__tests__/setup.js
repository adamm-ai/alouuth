import { beforeAll, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/database.js';

// Load test environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.test') });

// Setup test database
beforeAll(async () => {
  // Ensure we're using a test database
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test')) {
    console.warn('⚠️  WARNING: Not using a test database. Set DATABASE_URL to a test database.');
  }

  console.log('🔧 Setting up test database...');

  // Run migrations (create tables)
  try {
    const client = await pool.connect();

    // Drop and recreate tables for clean state
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA IF NOT EXISTS public');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'LEARNER',
        ministry VARCHAR(255),
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        is_approved BOOLEAN DEFAULT true
      );
    `);

    // Create courses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(500),
        level VARCHAR(50) DEFAULT 'Beginner',
        total_duration VARCHAR(50),
        order_index INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create lessons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        duration_min INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        video_url VARCHAR(500),
        video_source VARCHAR(50),
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_size INTEGER,
        page_count INTEGER,
        is_external_link BOOLEAN DEFAULT false,
        content TEXT,
        is_published BOOLEAN DEFAULT true,
        passing_score INTEGER DEFAULT 70,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create quiz_questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer INTEGER NOT NULL,
        explanation TEXT,
        order_index INTEGER DEFAULT 0
      );
    `);

    // Create enrollments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(user_id, course_id)
      );
    `);

    // Create lesson_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'NOT_STARTED',
        progress_percent INTEGER DEFAULT 0,
        quiz_score INTEGER,
        quiz_attempts INTEGER DEFAULT 0,
        passed BOOLEAN DEFAULT false,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      );
    `);

    client.release();
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');
  await pool.end();
  console.log('✅ Test cleanup complete');
});

// Helper function to clear all data between tests
export async function clearDatabase() {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE lesson_progress, enrollments, quiz_questions, lessons, courses, users CASCADE');
  } finally {
    client.release();
  }
}

// Helper function to approve a user by email
export async function approveUser(email) {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE users SET is_approved = true WHERE email = $1',
      [email]
    );
  } finally {
    client.release();
  }
}

// Helper function to create an admin user directly in database (bypassing registration validation)
export async function createAdminUser(email, password_hash, name) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, role, ministry, is_approved, is_active)
       VALUES ($1, $2, $3, 'ADMIN', 'Test Ministry', true, true)
       RETURNING id, email, name, role`,
      [email, password_hash, name]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}
