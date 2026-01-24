import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getDashboardStats,
  getMinistryStats,
  getMinistryCourseStats,
  getContentStats,
  getUsers,
  updateUserRole,
  getRecentActivity,
  getCoursesWithStats,
  getOverdueLearners,
  setCourseDeadline,
  setEnrollmentDeadline,
  setLessonPassingScore
} from '../controllers/adminController.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/ministry-stats', getMinistryStats);
router.get('/ministry-course-stats', getMinistryCourseStats);
router.get('/content-stats', getContentStats);
router.get('/activity', getRecentActivity);
router.get('/overdue', getOverdueLearners);

// User management
router.get('/users', getUsers);
router.put('/users/:userId', updateUserRole);

// Courses with admin stats
router.get('/courses', getCoursesWithStats);

// Deadline management
router.put('/courses/:courseId/deadline', setCourseDeadline);
router.put('/enrollments/:enrollmentId/deadline', setEnrollmentDeadline);

// Quiz settings
router.put('/lessons/:lessonId/passing-score', setLessonPassingScore);

export default router;
