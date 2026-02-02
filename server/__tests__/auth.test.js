import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.js';
import { clearDatabase, approveUser } from './setup.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication API', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user (pending approval)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@gov.bb',
          password: 'Test@123456',
          name: 'Test User',
          ministry: 'Test Ministry',
          role: 'LEARNER'
        });

      // User is created but needs approval
      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@gov.bb');
      expect(response.body.user.isApproved).toBe(false);
      // No token yet - user must be approved first
      expect(response.body.token).toBeUndefined();
    });

    test('should reject duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@gov.bb',
          password: 'Test@123456',
          name: 'First User',
          ministry: 'Test Ministry'
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@gov.bb',
          password: 'Different@123',
          name: 'Second User',
          ministry: 'Test Ministry'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already submitted');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test@123456',
          name: 'Test User',
          ministry: 'Test Ministry'
        });

      expect(response.status).toBe(400);
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@gov.bb',
          password: '123', // Too short
          name: 'Test User',
          ministry: 'Test Ministry'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create and approve a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@gov.bb',
          password: 'Test@123456',
          name: 'Login Test',
          ministry: 'Test Ministry'
        });

      // Approve the user so they can login
      await approveUser('login@gov.bb');
    });

    test('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@gov.bb',
          password: 'Test@123456'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('login@gov.bb');
    });

    test('should reject wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@gov.bb',
          password: 'WrongPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@gov.bb',
          password: 'Test@123456'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      // Create and approve user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me@gov.bb',
          password: 'Test@123456',
          name: 'Me Test',
          ministry: 'Test Ministry'
        });

      await approveUser('me@gov.bb');

      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'me@gov.bb',
          password: 'Test@123456'
        });
      token = loginRes.body.token;
    });

    test('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('me@gov.bb');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
    });
  });
});
