import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  enrollInCourse,
  updateLessonProgress,
  completeLesson,
  getCourseProgress,
  getDashboardStats
} from '../controllers/progressController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Course enrollment
router.post('/enroll/:courseId', enrollInCourse);

// Course progress
router.get('/course/:courseId', getCourseProgress);

// Lesson progress
router.put('/lesson/:lessonId', updateLessonProgress);
router.post('/lesson/:lessonId/complete', completeLesson);

export default router;
