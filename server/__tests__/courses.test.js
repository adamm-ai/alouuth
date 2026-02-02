import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcryptjs from 'bcryptjs';
import authRoutes from '../routes/auth.js';
import coursesRoutes from '../routes/courses.js';
import { clearDatabase, approveUser, createAdminUser } from './setup.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);

describe('Courses API', () => {
  let adminToken, learnerToken, courseId;

  beforeEach(async () => {
    await clearDatabase();

    // Create admin user directly in database (bypass registration validation)
    const password_hash = await bcryptjs.hash('Admin@123456', 10);
    await createAdminUser('admin@gov.bb', password_hash, 'Admin User');

    // Login admin to get token
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@gov.bb',
        password: 'Admin@123456'
      });
    adminToken = adminLoginRes.body.token;

    // Create learner user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'learner@gov.bb',
        password: 'Learner@123456',
        name: 'Learner User',
        ministry: 'Test Ministry'
      });
    await approveUser('learner@gov.bb');

    // Login learner to get token
    const learnerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'learner@gov.bb',
        password: 'Learner@123456'
      });
    learnerToken = learnerLoginRes.body.token;
  });

  describe('GET /api/courses', () => {
    test('should get all published courses', async () => {
      // Create a course
      await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Course',
          description: 'Test Description',
          level: 'Beginner',
          is_published: true
        });

      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${learnerToken}`);

      if (response.status !== 200) {
        console.log('GET courses error:', response.status, response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].title).toBe('Test Course');
    });

    test('should not show unpublished courses to learners', async () => {
      // Create unpublished course
      await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Unpublished Course',
          description: 'Test',
          level: 'Beginner',
          is_published: false
        });

      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${learnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.courses).toHaveLength(0);
    });
  });

  describe('POST /api/courses', () => {
    test('admin should create course successfully', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Course',
          description: 'Course Description',
          level: 'Intermediate',
          totalDuration: '10h'
        });

      console.log('Create course response:', response.status, response.body);

      expect(response.status).toBe(201);
      expect(response.body.course).toHaveProperty('id');
      expect(response.body.course.title).toBe('New Course');
      expect(response.body.course.level).toBe('Intermediate');

      courseId = response.body.course.id;
    });

    test('learner should not be able to create course', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          title: 'Unauthorized Course',
          description: 'Test'
        });

      expect(response.status).toBe(403);
    });

    test('should reject course without title', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'No title'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/courses/:id', () => {
    beforeEach(async () => {
      // Create a course
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Title',
          description: 'Original Description',
          level: 'Beginner'
        });
      courseId = res.body.course.id;
    });

    test('admin should update course successfully', async () => {
      const response = await request(app)
        .put(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated Description'
        });

      expect(response.status).toBe(200);
      expect(response.body.course.title).toBe('Updated Title');
      expect(response.body.course.description).toBe('Updated Description');
    });

    test('learner should not be able to update course', async () => {
      const response = await request(app)
        .put(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          title: 'Hacked Title'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Lessons Management', () => {
    beforeEach(async () => {
      // Create a course
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Course with Lessons',
          description: 'Test',
          level: 'Beginner'
        });
      console.log('Create course in lessons beforeEach:', res.status, res.body);
      courseId = res.body.course.id;
    });

    test('admin should add lesson to course', async () => {
      const response = await request(app)
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Lesson 1',
          type: 'video',
          durationMin: 15,
          videoUrl: 'https://youtube.com/watch?v=test'
        });

      expect(response.status).toBe(201);
      expect(response.body.lesson.title).toBe('Lesson 1');
      expect(response.body.lesson.type).toBe('video');
    });

    test('should add quiz lesson with questions', async () => {
      const response = await request(app)
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Quiz Lesson',
          type: 'quiz',
          durationMin: 10,
          quiz: [
            {
              question: 'What is 2+2?',
              options: ['3', '4', '5'],
              correctAnswer: 1
            },
            {
              question: 'What is the capital of France?',
              options: ['London', 'Paris', 'Berlin'],
              correctAnswer: 1
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.lesson.type).toBe('quiz');
    });

    test('should reject quiz with more than 15 questions', async () => {
      const questions = Array.from({ length: 16 }, (_, i) => ({
        question: `Question ${i + 1}`,
        options: ['A', 'B', 'C'],
        correctAnswer: 0
      }));

      const response = await request(app)
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Too Many Questions',
          type: 'quiz',
          durationMin: 10,
          quiz: questions
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('maximum');
    });
  });
});
