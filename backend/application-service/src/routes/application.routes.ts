import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { applicationController } from '../controllers/application.controller';
import { authenticate, requireCompany } from '../middleware/authenticate';

const router = Router();

// Configure multer to save uploaded CVs to the uploads/ folder
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, 'uploads/');
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    // Give each file a unique name: timestamp-originalname
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    // Only allow PDF and Word documents
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  },
});

// Seeker routes
router.post('/', authenticate, upload.single('cv'), applicationController.apply);
router.get('/my-applications', authenticate, applicationController.getMyApplications);

// Company routes
router.get('/job/:jobId', authenticate, requireCompany, applicationController.getJobApplications);
router.patch('/:id/status', authenticate, requireCompany, applicationController.updateStatus);

export default router;