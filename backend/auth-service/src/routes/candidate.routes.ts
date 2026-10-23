import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

// Internal service-to-service auth — used for calls FROM other backend services,
// not from the browser. Verifies a shared secret key instead of a user JWT.
function requireServiceKey(req: any, res: Response, next: any): void {
  const key = req.headers['x-service-key'];
  if (!key || key !== process.env.INTERNAL_SERVICE_KEY) {
    res.status(403).json({ success: false, message: 'Forbidden — internal service key required' });
    return;
  }
  next();
}

// POST /api/v1/auth/candidate/skills-distribution
// Aggregates skills across a given list of seekerIds (company-facing, browser call)
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
// Company-facing: full candidate profile used by Candidates page detail panel (browser call)
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

// GET /api/v1/auth/candidate/:seekerId/contact
// Internal service-to-service call FROM application-service — uses service key, not user JWT
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
      data: {
        email: user.email,
        name: jobSeeker?.fullName ?? 'Candidate',
      },
    });
  } catch (e) {
    console.error('[candidate/contact]', e);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate contact' });
  }
});

export default router;