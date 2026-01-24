import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  enrollInCourse,
  updateLessonProgress,
  completeLesson,
  getCourseProgress,
  getDashboardStats,
  checkCourseAccess,
  getDeadlines,
  getLessonRequirements
} from '../controllers/progressController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Deadlines
router.get('/deadlines', getDeadlines);

// Course enrollment and access
router.post('/enroll/:courseId', enrollInCourse);
router.get('/access/:courseId', checkCourseAccess);

// Course progress
router.get('/course/:courseId', getCourseProgress);

// Lesson progress and requirements
router.get('/lesson/:lessonId/requirements', getLessonRequirements);
router.put('/lesson/:lessonId', updateLessonProgress);
router.post('/lesson/:lessonId/complete', completeLesson);

export default router;
