import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getDashboardStats,
  getMinistryStats,
  getContentStats,
  getUsers,
  updateUserRole,
  getRecentActivity,
  getCoursesWithStats
} from '../controllers/adminController.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/ministry-stats', getMinistryStats);
router.get('/content-stats', getContentStats);
router.get('/activity', getRecentActivity);

// User management
router.get('/users', getUsers);
router.put('/users/:userId', updateUserRole);

// Courses with admin stats
router.get('/courses', getCoursesWithStats);

export default router;
