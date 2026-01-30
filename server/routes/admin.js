import { Router } from 'express';
import { authenticate, requireRole, requireUserManagement } from '../middleware/auth.js';
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
  setLessonPassingScore,
  createUser,
  resetUserPassword,
  getUserPassword
} from '../controllers/adminController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard routes - accessible by ADMIN and SUBADMIN
router.get('/stats', requireRole('ADMIN', 'SUBADMIN'), getDashboardStats);
router.get('/ministry-stats', requireRole('ADMIN', 'SUBADMIN'), getMinistryStats);
router.get('/ministry-course-stats', requireRole('ADMIN', 'SUBADMIN'), getMinistryCourseStats);
router.get('/content-stats', requireRole('ADMIN', 'SUBADMIN'), getContentStats);
router.get('/activity', requireRole('ADMIN', 'SUBADMIN'), getRecentActivity);
router.get('/overdue', requireRole('ADMIN', 'SUBADMIN'), getOverdueLearners);

// User management - ADMIN ONLY (not SUBADMIN)
router.get('/users', requireUserManagement, getUsers);
router.put('/users/:userId', requireUserManagement, updateUserRole);
router.post('/users', requireUserManagement, createUser);
router.post('/users/:userId/reset-password', requireUserManagement, resetUserPassword);
router.get('/users/:userId/password', requireUserManagement, getUserPassword);

// Courses with admin stats - accessible by ADMIN and SUBADMIN
router.get('/courses', requireRole('ADMIN', 'SUBADMIN'), getCoursesWithStats);

// Deadline management - accessible by ADMIN and SUBADMIN
router.put('/courses/:courseId/deadline', requireRole('ADMIN', 'SUBADMIN'), setCourseDeadline);
router.put('/enrollments/:enrollmentId/deadline', requireRole('ADMIN', 'SUBADMIN'), setEnrollmentDeadline);

// Quiz settings - accessible by ADMIN and SUBADMIN
router.put('/lessons/:lessonId/passing-score', requireRole('ADMIN', 'SUBADMIN'), setLessonPassingScore);

export default router;
