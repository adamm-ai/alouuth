import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import {
  uploadFile,
  uploadMultiple,
  deleteFile,
  getUploadStats
} from '../controllers/uploadController.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Upload routes
router.post('/single', upload.single('file'), handleUploadError, uploadFile);
router.post('/multiple', upload.array('files', 10), handleUploadError, uploadMultiple);

// File management
router.delete('/file', deleteFile);
router.get('/stats', getUploadStats);

export default router;
