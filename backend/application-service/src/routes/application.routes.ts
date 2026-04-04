import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { applicationController } from '../controllers/application.controller';
import { authenticate, requireCompany, requireSeeker } from '../middleware/authenticate';
import notificationRoutes from './notification.routes';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and Word files allowed'));
  },
});

// Seeker routes
router.post('/', authenticate, requireSeeker, upload.single('cv'), applicationController.apply);
router.get('/my-applications', authenticate, requireSeeker, applicationController.getMyApplications);

// Company routes
router.get('/job/:jobId', authenticate, requireCompany, applicationController.getJobApplications);
router.get('/rejection-reasons', authenticate, requireCompany, applicationController.getRejectionReasons);
router.patch('/:id/status', authenticate, requireCompany, applicationController.updateStatus);
router.patch('/:id/reject', authenticate, requireCompany, applicationController.rejectApplication);
router.patch('/:id/schedule-interview', authenticate, requireCompany, applicationController.scheduleInterview);
router.get('/:id/download-cv', authenticate, requireCompany, applicationController.downloadCv);

// Notifications
router.use('/notifications', notificationRoutes);

export default router;