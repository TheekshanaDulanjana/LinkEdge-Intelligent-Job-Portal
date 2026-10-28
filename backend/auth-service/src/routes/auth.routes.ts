import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { PrismaClient } from '@prisma/client';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import * as V from '../validation/fields';
import { AppError } from '../../../shared/middleware/errorHandler';

import { saveImage, deleteImage, MAX_IMAGE_BYTES } from '../services/storage.service';

const router = Router();
const prisma = new PrismaClient();

// -- Image upload: kept in memory, validated by content, then stored by storage.service --
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 2 },
});

// -- Zod Schemas --
const passwordsMatch = (d: { password: string; confirmPassword: string }) => d.password === d.confirmPassword;

const seekerRegSchema = z.object({
  email: V.email,
  password: V.newPassword,
  confirmPassword: z.string().max(72),
  fullName: V.personName('Full name'),
  phone: V.optionalPhone,
  location: V.optionalPlace('Location'),
}).refine(passwordsMatch, { message: 'Passwords do not match', path: ['confirmPassword'] });

const companyRegSchema = z.object({
  email: V.email,
  password: V.newPassword,
  confirmPassword: z.string().max(72),
  companyName: V.businessName('Company name'),
  industry: V.optionalText(60, 'Industry'),
  website: V.optionalUrl('Website'),
  phone: V.optionalPhone,
  location: V.optionalPlace('Location'),
}).refine(passwordsMatch, { message: 'Passwords do not match', path: ['confirmPassword'] });

const loginSchema = z.object({
  email: V.email,
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required').max(128, 'Password is too long'),
});
const verifySchema = z.object({ email: V.email, code: V.code6 });
const emailOnlySchema = z.object({ email: V.email });
const googleSchema = z.object({
  token: V.tokenString,
  role: z.enum(['SEEKER', 'COMPANY'], { message: 'Role must be SEEKER or COMPANY' }).optional(),
});
const resetSchema = z.object({ token: V.tokenString, newPassword: V.newPassword });
const deleteAccountSchema = z.object({ password: z.string().max(128).optional() });

const seekerProfileSchema = z.object({
  fullName: V.personName('Full name').optional(),
  phone: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.union([z.literal(''), V.phone]).optional()),
  location: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.union([z.literal(''), V.businessName('Location', 2, 100)]).optional()),
  interestArea: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.string().max(80, 'Interest area must be at most 80 characters').optional()),
  workStatus: z.enum(['EMPLOYED', 'UNEMPLOYED'], { message: 'Invalid work status' }).optional(),
  professionalSummary: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.string().max(2000, 'Summary must be at most 2000 characters').optional()),
  websiteUrl: z.union([z.literal(''), V.optionalUrl('Website')]).optional(),
  githubUrl: z.union([z.literal(''), V.optionalUrl('GitHub link')]).optional(),
  behanceUrl: z.union([z.literal(''), V.optionalUrl('Behance link')]).optional(),
  workStyle: z.enum(['REMOTE', 'HYBRID', 'ON_SITE'], { message: 'Invalid work style' }).optional(),
});

const companyProfileSchema = z.object({
  companyName: V.businessName('Company name').optional(),
  industry: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.string().max(60, 'Industry must be at most 60 characters').optional()),
  website: z.union([z.literal(''), V.optionalUrl('Website')]).optional(),
  phone: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.union([z.literal(''), V.phone]).optional()),
  location: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.union([z.literal(''), V.businessName('Location', 2, 100)]).optional()),
  aboutUs: z.string().optional().transform((v) => (v === undefined ? undefined : V.clean(v))).pipe(z.string().max(3000, 'About us must be at most 3000 characters').optional()),
});

/** Validate multipart/JSON profile fields; unknown keys (e.g. remove flags) pass through. */
function validateProfile(schema: z.ZodType<any>) {
  return (req: any, res: any, next: any) => {
    const r = schema.safeParse(req.body ?? {});
    if (!r.success) {
      res.status(400).json({
        success: false,
        message: r.error.issues[0]?.message || 'Validation failed',
        errors: r.error.issues.map((i: any) => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }
    req.body = { ...req.body, ...r.data };
    next();
  };
}

function requireRole(role: 'SEEKER' | 'COMPANY') {
  return (req: any, res: any, next: any) => {
    if (req.user?.role !== role) {
      res.status(403).json({ success: false, message: role === 'SEEKER' ? 'Only job seekers can do this' : 'Only companies can do this' });
      return;
    }
    next();
  };
}

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

router.post('/verify-email', validate(verifySchema), async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyEmail(email, code);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/resend-verification', validate(emailOnlySchema), async (req, res, next) => {
  try {
    const result = await authService.resendVerificationCode(req.body.email);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/google', validate(googleSchema), async (req, res, next) => {
  try {
    const { token, role } = req.body;
    const result = await authService.googleAuth(token, role);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/forgot-password', validate(emailOnlySchema), async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.post('/reset-password', validate(resetSchema), async (req, res, next) => {
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

router.delete('/account', authenticate, validate(deleteAccountSchema), async (req: any, res, next) => {
  try {
    const { password } = req.body;
    const result = await authService.deleteAccount(req.user.userId, password);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

// -- Profile Update Routes --

// අලුත්
router.patch(
  '/seeker/profile',
  authenticate,
  requireRole('SEEKER'),
  profileUpload.single('profileImage'),
  validateProfile(seekerProfileSchema),
  async (req: any, res, next) => {
    try {
      const {
        fullName, phone, location, interestArea, workStatus, professionalSummary,
        websiteUrl, githubUrl, behanceUrl, workStyle,
      } = req.body;
      const updateData: Record<string, any> = {};

      if (fullName) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone || null;
      if (location !== undefined) updateData.location = location || null;
      if (interestArea !== undefined) updateData.interestArea = interestArea || null;
      if (workStatus) updateData.workStatus = workStatus;
      if (professionalSummary !== undefined) updateData.professionalSummary = professionalSummary || null;
      if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl || null;
      if (githubUrl !== undefined) updateData.githubUrl = githubUrl || null;
      if (behanceUrl !== undefined) updateData.behanceUrl = behanceUrl || null;
      if (workStyle) updateData.workStyle = workStyle;
      const before = await prisma.jobSeeker.findUnique({
        where: { userId: req.user.userId },
        select: { profileImageUrl: true },
      });

      let uploadedUrl: string | null = null;
      if (req.file) {
        uploadedUrl = await saveImage(req.file.buffer, 'profiles');
        updateData.profileImageUrl = uploadedUrl;
      } else if (req.body.removeProfileImage === 'true') {
        updateData.profileImageUrl = null;
      }

      let seeker;
      try {
        seeker = await prisma.jobSeeker.update({ where: { userId: req.user.userId }, data: updateData });
      } catch (err) {
        await deleteImage(uploadedUrl); // do not leave an orphan file behind
        throw err;
      }

      // The database now points at the new image, so the old file can go.
      if ('profileImageUrl' in updateData) await deleteImage(before?.profileImageUrl);

      res.json({ success: true, data: seeker });
    } catch (e: any) {
      if (e?.status === 400) { res.status(400).json({ success: false, message: e.message }); return; }
      next(e);
    }
  }
);

router.patch(
  '/company/profile',
  authenticate,
  requireRole('COMPANY'),
  profileUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  validateProfile(companyProfileSchema),
  async (req: any, res, next) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const { companyName, industry, website, phone, location, aboutUs } = req.body;
      const updateData: Record<string, any> = {};

      if (companyName) updateData.companyName = companyName;
      if (industry !== undefined) updateData.industry = industry || null;
      if (website !== undefined) updateData.website = website || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (location !== undefined) updateData.location = location || null;
      if (aboutUs !== undefined) updateData.aboutUs = aboutUs || null;
      
      const before = await prisma.company.findUnique({
        where: { userId: req.user.userId },
        select: { logoUrl: true, coverImageUrl: true },
      });

      const uploaded: string[] = [];
      if (files?.logo?.[0]) {
        updateData.logoUrl = await saveImage(files.logo[0].buffer, 'logos');
        uploaded.push(updateData.logoUrl);
      } else if (req.body.removeLogo === 'true') {
        updateData.logoUrl = null;
      }
      if (files?.coverImage?.[0]) {
        updateData.coverImageUrl = await saveImage(files.coverImage[0].buffer, 'covers');
        uploaded.push(updateData.coverImageUrl);
      } else if (req.body.removeCover === 'true') {
        updateData.coverImageUrl = null;
      }

      let company;
      try {
        company = await prisma.company.update({ where: { userId: req.user.userId }, data: updateData });
      } catch (err) {
        await Promise.all(uploaded.map(deleteImage));
        throw err;
      }

      if ('logoUrl' in updateData) await deleteImage(before?.logoUrl);
      if ('coverImageUrl' in updateData) await deleteImage(before?.coverImageUrl);

      res.json({ success: true, data: company });
    } catch (e: any) {
      if (e?.status === 400) { res.status(400).json({ success: false, message: e.message }); return; }
      next(e);
    }

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
        createdAt: true,
      },
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const jobs = await prisma.jobPosting.findMany({
      where: { companyId: company.id, status: 'ACTIVE' },
      select: {
        id: true, title: true, location: true, department: true, experienceLevel: true,
        locationType: true, salaryMin: true, salaryMax: true,
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