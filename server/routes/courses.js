import { Router } from 'express';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  deleteLesson,
  addQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion
} from '../controllers/courseController.js';

const router = Router();

// Public/User routes
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourseById);

// Admin routes - Course CRUD
router.post('/', authenticate, requireRole('ADMIN'), createCourse);
router.put('/:id', authenticate, requireRole('ADMIN'), updateCourse);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteCourse);

// Admin routes - Lesson CRUD
router.post('/:courseId/lessons', authenticate, requireRole('ADMIN'), addLesson);
router.put('/lessons/:lessonId', authenticate, requireRole('ADMIN'), updateLesson);
router.delete('/lessons/:lessonId', authenticate, requireRole('ADMIN'), deleteLesson);

// Admin routes - Quiz CRUD
router.post('/lessons/:lessonId/quiz', authenticate, requireRole('ADMIN'), addQuizQuestion);
router.put('/quiz/:questionId', authenticate, requireRole('ADMIN'), updateQuizQuestion);
router.delete('/quiz/:questionId', authenticate, requireRole('ADMIN'), deleteQuizQuestion);

export default router;
