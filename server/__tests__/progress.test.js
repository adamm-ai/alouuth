import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcryptjs from 'bcryptjs';
import authRoutes from '../routes/auth.js';
import progressRoutes from '../routes/progress.js';
import coursesRoutes from '../routes/courses.js';
import { clearDatabase, approveUser, createAdminUser } from './setup.js';
import pool from '../config/database.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/courses', coursesRoutes);

describe('User Progress API - Data Isolation', () => {
  let userAToken, userBToken, userAId, userBId, courseId, lessonId;

  beforeEach(async () => {
    await clearDatabase();

    // Create User A
    const userARegRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'usera@gov.bb',
        password: 'Test@123456',
        name: 'User A',
        ministry: 'Ministry A'
      });
    userAId = userARegRes.body.user.id;
    await approveUser('usera@gov.bb');

    // Login User A to get token
    const userALoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'usera@gov.bb',
        password: 'Test@123456'
      });
    userAToken = userALoginRes.body.token;

    // Create User B
    const userBRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'userb@gov.bb',
        password: 'Test@123456',
        name: 'User B',
        ministry: 'Ministry B'
      });
    userBId = userBRegRes.body.user.id;
    await approveUser('userb@gov.bb');

    // Login User B to get token
    const userBLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'userb@gov.bb',
        password: 'Test@123456'
      });
    userBToken = userBLoginRes.body.token;

    // Create an admin user directly in database
    const admin_password_hash = await bcryptjs.hash('Admin@123456', 10);
    await createAdminUser('admin@gov.bb', admin_password_hash, 'Admin User');

    // Login admin to get token
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@gov.bb',
        password: 'Admin@123456'
      });
    const adminToken = adminLoginRes.body.token;

    // Create a course
    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Course',
        description: 'Test Description',
        level: 'Beginner'
      });
    courseId = courseRes.body.course.id;

    // Create a lesson
    const lessonRes = await request(app)
      .post(`/api/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Lesson',
        type: 'video',
        durationMin: 10
      });
    lessonId = lessonRes.body.lesson.id;
  });

  describe('CRITICAL: User Data Isolation', () => {
    test('User A and User B should have independent dashboard stats', async () => {
      // User A enrolls in course
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Get User A stats
      const userAStats = await request(app)
        .get('/api/progress/dashboard')
        .set('Authorization', `Bearer ${userAToken}`);

      // Get User B stats (who hasn't enrolled)
      const userBStats = await request(app)
        .get('/api/progress/dashboard')
        .set('Authorization', `Bearer ${userBToken}`);

      // User A should have 1 enrolled course
      expect(userAStats.body.stats.enrolledCourses).toBe(1);

      // User B should have 0 enrolled courses
      expect(userBStats.body.stats.enrolledCourses).toBe(0);

      // Stats should be completely independent
      expect(userAStats.body.stats).not.toEqual(userBStats.body.stats);
    });

    test('User A progress should not affect User B progress', async () => {
      // Both users enroll in the same course
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      // User A completes the lesson
      await request(app)
        .post(`/api/progress/lesson/${lessonId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({});

      // Get User A progress
      const userAProgress = await request(app)
        .get(`/api/progress/course/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Get User B progress
      const userBProgress = await request(app)
        .get(`/api/progress/course/${courseId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      // User A should have 100% progress
      expect(userAProgress.body.courseProgress).toBe(100);

      // User B should have 0% progress
      expect(userBProgress.body.courseProgress).toBe(0);
    });

    test('Database should correctly isolate user progress records', async () => {
      // Both users enroll
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      // User A completes lesson
      await request(app)
        .post(`/api/progress/lesson/${lessonId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Check database directly
      const client = await pool.connect();
      try {
        // Check User A progress
        const userADb = await client.query(
          'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
          [userAId, lessonId]
        );

        // Check User B progress
        const userBDb = await client.query(
          'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
          [userBId, lessonId]
        );

        // User A should have completed record
        expect(userADb.rows.length).toBe(1);
        expect(userADb.rows[0].status).toBe('COMPLETED');

        // User B should have no record
        expect(userBDb.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });

    test('Enrollment records should be user-specific', async () => {
      // Only User A enrolls
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Check database
      const client = await pool.connect();
      try {
        const enrollments = await client.query(
          'SELECT user_id FROM enrollments WHERE course_id = $1',
          [courseId]
        );

        // Should only have 1 enrollment (User A)
        expect(enrollments.rows.length).toBe(1);
        expect(enrollments.rows[0].user_id).toBe(userAId);
      } finally {
        client.release();
      }
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      // Enroll User A in the course
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);
    });

    test('should update lesson progress', async () => {
      const response = await request(app)
        .put(`/api/progress/lesson/${lessonId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'IN_PROGRESS',
          progressPercent: 50
        });

      expect(response.status).toBe(200);
      expect(response.body.progress.status).toBe('IN_PROGRESS');
      expect(response.body.progress.progress_percent).toBe(50);
    });

    test('should complete lesson successfully', async () => {
      const response = await request(app)
        .post(`/api/progress/lesson/${lessonId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.passed).toBe(true);
      expect(response.body.courseProgress).toBe(100);
    });

    test('should get course progress', async () => {
      // Complete the lesson first
      await request(app)
        .post(`/api/progress/lesson/${lessonId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`);

      const response = await request(app)
        .get(`/api/progress/course/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.courseProgress).toBe(100);
      expect(response.body.lessons).toHaveLength(1);
      expect(response.body.lessons[0].status).toBe('COMPLETED');
    });
  });

  describe('Enrollment', () => {
    test('should enroll in a course successfully', async () => {
      const response = await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Successfully enrolled');
    });

    test('should not allow duplicate enrollment', async () => {
      // First enrollment
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Second enrollment attempt
      const response = await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Already enrolled');
    });

    test('should require authentication for enrollment', async () => {
      const response = await request(app)
        .post(`/api/progress/enroll/${courseId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Dashboard Stats', () => {
    test('should return correct dashboard statistics', async () => {
      // Enroll in course
      await request(app)
        .post(`/api/progress/enroll/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Complete lesson
      await request(app)
        .post(`/api/progress/lesson/${lessonId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`);

      const response = await request(app)
        .get('/api/progress/dashboard')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toHaveProperty('enrolledCourses');
      expect(response.body.stats).toHaveProperty('completedCourses');
      expect(response.body.stats).toHaveProperty('lessonsCompleted');
      expect(response.body.stats.enrolledCourses).toBe(1);
      expect(response.body.stats.lessonsCompleted).toBe(1);
    });
  });
});
