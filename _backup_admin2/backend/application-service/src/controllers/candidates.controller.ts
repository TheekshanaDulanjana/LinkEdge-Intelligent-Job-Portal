import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { scoreApplications, usableCvText } from '../services/scoring.service';
import { overridePatch } from '../services/screening.service';
import { paging, clean } from '../lib/validation';
import { statusSchema, isUuid } from '../lib/validation';

import { ATS_URL } from '../config';

const prisma = new PrismaClient();

async function getCompanyId(req: any): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where: { userId: req.user.userId },
    select: { id: true },
  });
  return company?.id ?? null;
}

// ── GET /api/v1/applications/company/candidates ───────────────────────────────
export async function getCandidates(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const { search, stage } = req.query;
    const { page, limit, skip } = paging(req.query, 20, 50);

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const where: any = { jobId: { in: jobIds } };
    if (stage && stage !== 'ALL') {
      if (!['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'].includes(String(stage))) {
        res.status(400).json({ success: false, message: 'Invalid stage' });
        return;
      }
      where.status = stage;
    }
    const term = typeof search === 'string' ? clean(search).slice(0, 80) : '';
    if (term) {
      const matches = await prisma.jobSeeker.findMany({
        where: { fullName: { contains: term, mode: 'insensitive' } },
        select: { userId: true },
        take: 500,
      });
      where.OR = [
        { job: { title: { contains: term, mode: 'insensitive' } } },
        { seekerId: { in: matches.map(m => m.userId) } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, seekerId: true, status: true, aiScore: true, atsScore: true,
          createdAt: true, interviewDate: true, cvUrl: true,
          autoRejected: true, companyOverride: true, rejectionReason: true,
          job: { select: { id: true, title: true, description: true, requirements: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    // Backfill: applications that have never been scored (or only have one of the two
    // scores) are scored now, so the list always shows both ATS and AI match.
    const unscored = applications.filter(a => a.aiScore == null || a.atsScore == null);
    if (unscored.length > 0) {
      try {
        const snaps = await prisma.application.findMany({
          where: { id: { in: unscored.map(a => a.id) } },
          select: { id: true, cvTextSnapshot: true, screenedAt: true },
        });
        const snapById = new Map(snaps.map(s => [s.id, s]));
        await scoreApplications(unscored.map(a => ({
          id: a.id, seekerId: a.seekerId, cvText: usableCvText(snapById.get(a.id) ?? {}), job: a.job,
        })));
        const fresh = await prisma.application.findMany({
          where: { id: { in: unscored.map(a => a.id) } },
          select: { id: true, aiScore: true, atsScore: true },
        });
        const byId = new Map(fresh.map(f => [f.id, f]));
        for (const a of applications) {
          const f = byId.get(a.id);
          if (f) { a.aiScore = f.aiScore; a.atsScore = f.atsScore; }
        }
      } catch (e: any) {
        console.warn('[candidates] score backfill skipped:', e.message);
      }
    }

    res.json({
      success: true,
      data: {
        candidates: applications.map(a => ({
          applicationId: a.id,
          seekerId:      a.seekerId,
          jobTitle:      a.job.title,
          status:        a.status,
          aiScore:       a.aiScore,
          atsScore:      a.atsScore,
          appliedDate:   a.createdAt,
          interviewDate: a.interviewDate,
          cvUrl:         a.cvUrl,
          autoRejected:    a.autoRejected,
          companyOverride: a.companyOverride,
          rejectionReason: a.rejectionReason,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error('[candidates]', e);
    res.status(500).json({ success: false, message: 'Failed to load candidates' });
  }
}

// ── GET /api/v1/applications/company/candidates/summary ──────────────────────
export async function getCandidatesSummary(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const now = new Date();
    const startToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday       = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
    const weekAgo        = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

    const jobs   = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const [
      totalApplicants, newToday,
      underReview,
      interviewing, interviewsToday,
      hired, hiredThisWeek,
    ] = await Promise.all([
      prisma.application.count({ where: { jobId: { in: jobIds } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, createdAt: { gte: startToday, lt: endToday } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'REVIEWING' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'INTERVIEW', interviewDate: { gte: startToday, lt: endToday } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'SHORTLISTED', updatedAt: { gte: weekAgo } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalApplicants, newToday,
        underReview,
        interviewing, interviewsToday,
        hired, hiredThisWeek,
      },
    });
  } catch (e) {
    console.error('[candidates-summary]', e);
    res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
}

// ── PATCH /api/v1/applications/company/candidates/:id/stage ──────────────────
export async function updateCandidateStage(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isUuid(id) || !statusSchema.safeParse({ status }).success) {
      res.status(400).json({ success: false, message: 'Invalid status value' });
      return;
    }

    const companyId = await getCompanyId(req);
    const application = await prisma.application.findUnique({
      where: { id }, include: { job: true },
    });

    if (!application || application.job.companyId !== companyId) {
      res.status(403).json({ success: false, message: 'Not authorized for this application' });
      return;
    }

    // Moving a system-rejected candidate forward is a company override.
    const patch = status === 'REJECTED' ? {} : overridePatch(application);
    const updated = await prisma.application.update({
      where: { id }, data: { status, ...patch },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[update-stage]', e);
    res.status(500).json({ success: false, message: 'Failed to update stage' });
  }
}

// ── GET /api/v1/applications/company/candidates/:id/analysis ─────────────────
// Full CV analysis for one application: structured CV, ATS score + breakdown,
// AI match + reasons. Re-reads the stored CV text with the current parser and
// refreshes the scores saved on the application.
export async function getCandidateAnalysis(req: any, res: Response) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }
    const companyId = await getCompanyId(req);
    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!application || !companyId || application.job.companyId !== companyId) {
      res.status(403).json({ success: false, message: 'Not authorized for this application' });
      return;
    }

    const job = application.job;
    const atsRes = await axios.post(
      `${ATS_URL}/api/v1/ats/analyze-candidate`,
      {
        candidate_id: application.seekerId,
        job_id: job.id,
        job_title: job.title,
        job_description: job.description,
        job_requirements: job.requirements,
        cv_text: usableCvText(application),
      },
      { timeout: 30000 }
    );

    const data = atsRes.data;
    if (!data?.has_resume) {
      res.json({ success: true, data: { hasResume: false } });
      return;
    }

    const ai = data.ai_match;
    const ats = data.ats;

    // Keep the saved scores in sync with what the recruiter is looking at.
    await prisma.application.update({
      where: { id },
      data: {
        aiScore: ai.score,
        atsScore: ats.overall_score,
        atsBreakdown: {
          strengths: ai.strengths ?? [],
          weaknesses: ai.gaps ?? [],
          recommendation: ai.recommendation ? `${ai.recommendation}: ${ai.label ?? ''}`.trim() : '',
          matchedSkills: ai.matched_skills ?? [],
          missingSkills: ai.missing_skills ?? [],
          aiComponents: ai.components ?? null,
          ats: ats.breakdown ?? null,
          rankedAt: new Date().toISOString(),
          screening: (application.atsBreakdown as any)?.screening ?? null,
        },
      },
    }).catch(() => undefined);

    res.json({
      success: true,
      data: {
        hasResume: true,
        analysis: data.analysis,
        ats,
        aiMatch: ai,
        job: data.job,
      },
    });
  } catch (e: any) {
    console.error('[candidate-analysis]', e.response?.data ?? e.message);
    res.status(500).json({ success: false, message: 'Failed to analyse this candidate' });
  }
}
