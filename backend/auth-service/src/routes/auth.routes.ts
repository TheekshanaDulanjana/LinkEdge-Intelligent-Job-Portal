import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { PrismaClient } from '@prisma/client';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { AppError } from '../../../shared/middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// -- Multer Storage Configuration --
const profileStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = 'uploads/profiles';
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed') as any);
  },
});

// -- Zod Schemas --
const seekerRegSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  location: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

const companyRegSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
  companyName: z.string().min(2),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

// -- Authentication Routes --

router.post('/register/seeker', validate(seekerRegSchema), async (req, res, next) => {
  try {
    const result = await authService.registerSeeker(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.post('/register/company', validate(companyRegSchema), async (req, res, next) => {
  try {
    const result = await authService.registerCompany(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyEmail(email, code);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const result = await authService.resendVerificationCode(req.body.email);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/google', async (req, res, next) => {
  try {
    const { token, role } = req.body;
    const result = await authService.googleAuth(token, role);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
      include: { seeker: true, company: true },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    const profile = user.role === 'SEEKER' ? user.seeker : user.company;
    res.json({ success: true, data: { id: user.id, email: user.email, role: user.role, profile } });
  } catch (e) { next(e); }
});

// -- Profile Update Routes --

router.patch(
  '/seeker/profile',
  authenticate,
  profileUpload.single('profileImage'),
  async (req: any, res, next) => {
    try {
      const { fullName, phone, location, interestArea, workStatus, professionalSummary } = req.body;
      const updateData: Record<string, any> = {};

      if (fullName) updateData.fullName = fullName;
      if (phone) updateData.phone = phone;
      if (location) updateData.location = location;
      if (interestArea) updateData.interestArea = interestArea;
      if (workStatus) updateData.workStatus = workStatus;
      if (professionalSummary) updateData.professionalSummary = professionalSummary;
      if (req.file) updateData.profileImageUrl = `/uploads/profiles/${req.file.filename}`;

      const seeker = await prisma.jobSeeker.update({
        where: { userId: req.user.userId },
        data: updateData,
      });

      res.json({ success: true, data: seeker });
    } catch (e) { next(e); }
  }
);

router.patch(
  '/company/profile',
  authenticate,
  profileUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  async (req: any, res, next) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const { companyName, industry, website, phone, location, aboutUs } = req.body;
      const updateData: Record<string, any> = {};

      if (companyName) updateData.companyName = companyName;
      if (industry) updateData.industry = industry;
      if (website) updateData.website = website;
      if (phone) updateData.phone = phone;
      if (location) updateData.location = location;
      if (aboutUs) updateData.aboutUs = aboutUs;
      
      if (files.logo?.[0]) {
        updateData.logoUrl = `/uploads/profiles/${files.logo[0].filename}`;
      }
      if (files.coverImage?.[0]) {
        updateData.coverImageUrl = `/uploads/profiles/${files.coverImage[0].filename}`;
      }

      const company = await prisma.company.update({
        where: { userId: req.user.userId },
        data: updateData,
      });

      res.json({ success: true, data: company });
    } catch (e) { next(e); }
  }
);

// -- Public Profile Routes --

// UPDATED: Now includes company data AND their active job listings
router.get('/company/:companyId/public', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.companyId },
      select: {
        id: true,
        companyName: true,
        industry: true,
        website: true,
        location: true,
        phone: true,
        aboutUs: true,
        logoUrl: true,
        coverImageUrl: true,
      },
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const jobs = await prisma.jobPosting.findMany({
      where: { companyId: company.id, status: 'ACTIVE' },
      select: {
        id: true, title: true, location: true,
        jobType: true, deadline: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { ...company, jobs } });
  } catch (e) { next(e); }
});

router.get('/seeker/:seekerId/public', authenticate, async (req: any, res, next) => {
  try {
    const seeker = await prisma.jobSeeker.findUnique({
      where: { id: req.params.seekerId },
      select: {
        fullName: true, location: true, interestArea: true,
        workStatus: true, professionalSummary: true, profileImageUrl: true,
      },
    });
    if (!seeker) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }
    res.json({ success: true, data: seeker });
  } catch (e) { next(e); }
});

export default router;