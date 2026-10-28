import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { applicationController } from '../controllers/application.controller';
import { authenticate, requireCompany, requireSeeker } from '../middleware/authenticate';
import { applyLimiter, heavyActionLimiter } from '../middleware/security';
import { validateBody, validateParams, applySchema } from '../lib/validation';
import { UPLOAD_DIR, MAX_CV_BYTES } from '../config';
import notificationRoutes from './notification.routes';

const router = Router();

const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    // Random name; the extension comes from a whitelist, never from user input.
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and Word files allowed'));
  },
});

// Seeker routes
router.post('/', authenticate, requireSeeker, applyLimiter, upload.single('cv'), validateBody(applySchema), applicationController.apply);
router.get('/my-applications', authenticate, requireSeeker, applicationController.getMyApplications);

// Company routes
router.get('/rejection-reasons', authenticate, requireCompany, applicationController.getRejectionReasons);
router.get('/job/:jobId', authenticate, requireCompany, validateParams('jobId'), applicationController.getJobApplications);
router.patch('/:id/status', authenticate, requireCompany, heavyActionLimiter, validateParams('id'), applicationController.updateStatus);
router.get('/:id/download-cv', authenticate, requireCompany, validateParams('id'), applicationController.downloadCv);

// Notifications
router.use('/notifications', notificationRoutes);

export default router;
