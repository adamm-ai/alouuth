import { Router } from 'express';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  reorderCourses,
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

// Admin & Subadmin routes - Course CRUD
router.post('/', authenticate, requireRole('ADMIN', 'SUBADMIN'), createCourse);
router.put('/:id', authenticate, requireRole('ADMIN', 'SUBADMIN'), updateCourse);
router.delete('/:id', authenticate, requireRole('ADMIN', 'SUBADMIN'), deleteCourse);
router.post('/reorder', authenticate, requireRole('ADMIN', 'SUBADMIN'), reorderCourses);

// Admin & Subadmin routes - Lesson CRUD
router.post('/:courseId/lessons', authenticate, requireRole('ADMIN', 'SUBADMIN'), addLesson);
router.put('/lessons/:lessonId', authenticate, requireRole('ADMIN', 'SUBADMIN'), updateLesson);
router.delete('/lessons/:lessonId', authenticate, requireRole('ADMIN', 'SUBADMIN'), deleteLesson);

// Admin & Subadmin routes - Quiz CRUD
router.post('/lessons/:lessonId/quiz', authenticate, requireRole('ADMIN', 'SUBADMIN'), addQuizQuestion);
router.put('/quiz/:questionId', authenticate, requireRole('ADMIN', 'SUBADMIN'), updateQuizQuestion);
router.delete('/quiz/:questionId', authenticate, requireRole('ADMIN', 'SUBADMIN'), deleteQuizQuestion);

export default router;
