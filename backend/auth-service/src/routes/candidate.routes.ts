import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

function auth(req: any, res: Response, next: any): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'No token' });
    return;
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function companyOnly(req: any, res: Response, next: any): void {
  if (req.user?.role !== 'COMPANY') {
    res.status(403).json({ success: false, message: 'Company access required' });
    return;
  }
  next();
}

function requireServiceKey(req: any, res: Response, next: any): void {
  const key = req.headers['x-service-key'];
  if (!key || key !== process.env.INTERNAL_SERVICE_KEY) {
    res.status(403).json({ success: false, message: 'Forbidden — internal service key required' });
    return;
  }
  next();
}

// POST /api/v1/auth/candidate/skills-distribution
router.post('/skills-distribution', auth, companyOnly, async (req: any, res: Response) => {
  try {
    const { seekerIds } = req.body as { seekerIds: string[] };
    if (!seekerIds || seekerIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const resumes = await prisma.candidateResume.findMany({
      where: { candidateId: { in: seekerIds } },
      select: { skills: true },
    });

    const skillCounts: Record<string, number> = {};
    resumes.forEach((r) => {
      r.skills.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] ?? 0) + 1;
      });
    });

    const top = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    res.json({ success: true, data: top });
  } catch (e) {
    console.error('[skills-distribution]', e);
    res.status(500).json({ success: false, message: 'Failed to load skills distribution' });
  }
});

// GET /api/v1/auth/candidate/:seekerId/profile
router.get('/:seekerId/profile', auth, companyOnly, async (req: any, res: Response) => {
  try {
    const { seekerId } = req.params;

    const [jobSeeker, resume] = await Promise.all([
      prisma.jobSeeker.findFirst({
        where: { userId: seekerId },
        select: {
          fullName: true,
          phone: true,
          location: true,
          profileImageUrl: true,
          interestArea: true,
          workStatus: true,
          professionalSummary: true,
          websiteUrl: true,
          githubUrl: true,
          behanceUrl: true,
          workStyle: true,
        },
      }),
      prisma.candidateResume.findUnique({
        where: { candidateId: seekerId },
        select: {
          originalName: true,
          fileSize: true,
          mimeType: true,
          skills: true,
          technologies: true,
          certifications: true,
          experienceYears: true,
          experience: true,
          education: true,
          jobTitle: true,
          isParsed: true,
        },
      }),
    ]);

    if (!jobSeeker) {
      res.status(404).json({ success: false, message: 'Candidate profile not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        profile: jobSeeker,
        resume: resume ?? null,
      },
    });
  } catch (e) {
    console.error('[candidate/profile]', e);
    res.status(500).json({ success: false, message: 'Failed to load candidate profile' });
  }
});

// GET /api/v1/auth/candidate/:seekerId/resume/file
// Company-facing CV preview — only allowed if this candidate has actually
// applied to one of this company's job postings (prevents arbitrary access).
router.get('/:seekerId/resume/file', auth, companyOnly, async (req: any, res: Response) => {
  try {
    const { seekerId } = req.params;

    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const hasApplied = await prisma.application.findFirst({
      where: { seekerId, job: { companyId: company.id } },
      select: { id: true },
    });

    if (!hasApplied) {
      res.status(403).json({ success: false, message: "Not authorized to view this candidate's CV" });
      return;
    }

    const resume = await prisma.candidateResume.findUnique({
      where: { candidateId: seekerId },
      select: { filePath: true, originalName: true, mimeType: true },
    });

    if (!resume || !resume.filePath) {
      res.status(404).json({ success: false, message: 'Resume file not found' });
      return;
    }

    const absolutePath = path.resolve(resume.filePath);
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ success: false, message: 'File does not exist on server storage' });
      return;
    }

    res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.originalName}"`);
    fs.createReadStream(absolutePath).pipe(res);
  } catch (e) {
    console.error('[candidate/resume/file]', e);
    res.status(500).json({ success: false, message: 'Failed to retrieve resume file' });
  }
});

// GET /api/v1/auth/candidate/:seekerId/contact — internal service-to-service
router.get('/:seekerId/contact', requireServiceKey, async (req: any, res: Response) => {
  try {
    const [user, jobSeeker] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.params.seekerId }, select: { email: true } }),
      prisma.jobSeeker.findFirst({ where: { userId: req.params.seekerId }, select: { fullName: true } }),
    ]);

    if (!user) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    res.json({
      success: true,
      data: { email: user.email, name: jobSeeker?.fullName ?? 'Candidate' },
    });
  } catch (e) {
    console.error('[candidate/contact]', e);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate contact' });
  }
});

export default router;