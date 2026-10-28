import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

function auth(req: any, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function seekerOnly(req: any, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'SEEKER') {
    res.status(403).json({ success: false, message: 'Seeker access required' });
    return;
  }
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'profiles');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file, cb) => {
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profile-${req.user.userId}-${uid}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG, or WEBP images are supported'));
  },
});

const ALLOWED_WORK_STYLES = ['REMOTE', 'HYBRID', 'ON_SITE'];

// ── PATCH /api/v1/auth/seeker/profile ───────────────────────────────────────
router.patch(
  '/profile',
  auth,
  seekerOnly,
  upload.single('profileImage'),
  async (req: any, res: Response) => {
    try {
      const {
        fullName,
        phone,
        location,
        interestArea,
        workStatus,
        professionalSummary,
        websiteUrl,
        githubUrl,
        behanceUrl,
        workStyle,
      } = req.body;

      const data: Record<string, any> = {};

      if (fullName !== undefined)           data.fullName = fullName;
      if (phone !== undefined)               data.phone = phone;
      if (location !== undefined)            data.location = location;
      if (interestArea !== undefined)        data.interestArea = interestArea;
      if (professionalSummary !== undefined) data.professionalSummary = professionalSummary;
      if (websiteUrl !== undefined)          data.websiteUrl = websiteUrl || null;
      if (githubUrl !== undefined)           data.githubUrl = githubUrl || null;
      if (behanceUrl !== undefined)          data.behanceUrl = behanceUrl || null;

      if (workStatus !== undefined && ['EMPLOYED', 'UNEMPLOYED'].includes(workStatus)) {
        data.workStatus = workStatus;
      }
      if (workStyle !== undefined && ALLOWED_WORK_STYLES.includes(workStyle)) {
        data.workStyle = workStyle;
      }

      if (req.file) {
        const existing = await prisma.jobSeeker.findFirst({
          where: { userId: req.user.userId },
          select: { profileImageUrl: true },
        });
        if (existing?.profileImageUrl) {
          const oldPath = path.join(process.cwd(), existing.profileImageUrl.replace(/^\//, ''));
          try { fs.unlinkSync(oldPath); } catch { /* already gone */ }
        }
        data.profileImageUrl = `/uploads/profiles/${req.file.filename}`;
      }

      const updated = await prisma.jobSeeker.update({
        where: { userId: req.user.userId },
        data,
      });

      res.json({ success: true, message: 'Profile updated successfully', data: updated });
    } catch (e: any) {
      console.error('[seeker/profile PATCH]', e?.message ?? e);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }
);

export default router;