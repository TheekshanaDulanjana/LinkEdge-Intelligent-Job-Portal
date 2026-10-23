import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const AI_URL    = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const ATS_URL   = process.env.ATS_SERVICE_URL || 'http://localhost:8003';
const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const AUTH_URL  = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY as string;

// Shared axios instance for notification-service calls — always sends the internal key
const notifClient = axios.create({
  baseURL: NOTIF_URL,
  timeout: 15000,
  headers: { 'x-service-key': SERVICE_KEY },
});

// Shared axios instance for auth-service internal calls — always sends the internal key
const authClient = axios.create({
  baseURL: AUTH_URL,
  timeout: 8000,
  headers: { 'x-service-key': SERVICE_KEY },
});

async function verifyJobOwnership(req: any, jobId: string) {
  const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
  if (!company) return null;
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job || job.companyId !== company.id) return null;
  return job;
}

async function getSeekerContact(seekerId: string): Promise<{ email: string; name: string } | null> {
  try {
    const res = await authClient.get(`/api/v1/auth/candidate/${seekerId}/contact`);
    return res.data?.data ?? null;
  } catch (e) {
    console.warn('[getSeekerContact] failed:', (e as any).message);
    return null;
  }
}

function formatDateForEmail(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── GET /api/v1/applications/jobs/:jobId/applicants ───────────────────────────
export async function getJobApplicants(req: any, res: Response) {
  try {
    const { jobId } = req.params;
    const job = await verifyJobOwnership(req, jobId);
    if (!job) { res.status(403).json({ success: false, message: 'Not authorized for this job' }); return; }

    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        job: { id: job.id, title: job.title, description: job.description, requirements: job.requirements },
        applicants: applications,
      },
    });
  } catch (e) {
    console.error('[get-applicants]', e);
    res.status(500).json({ success: false, message: 'Failed to load applicants' });
  }
}

// ── POST /api/v1/applications/jobs/:jobId/smart-rank ──────────────────────────
export async function smartRankApplicants(req: any, res: Response) {
  try {
    const { jobId } = req.params;
    const job = await verifyJobOwnership(req, jobId);
    if (!job) { res.status(403).json({ success: false, message: 'Not authorized for this job' }); return; }

    const applications = await prisma.application.findMany({ where: { jobId } });
    if (applications.length === 0) {
      res.json({ success: true, data: { ranked: 0, applicants: [] } });
      return;
    }

    // Deterministic ATS ranking — replaces the old ai-service ranking agent.
    const atsRes = await axios.post(
      `${ATS_URL}/api/v1/matching/rank-applicants`,
      {
        job_id:            job.id,
        job_title:         job.title,
        job_description:   job.description,
        job_requirements:  job.requirements,
        candidate_ids:     applications.map(a => a.seekerId),
      },
      { timeout: 60000 }
    );

    // Response shape: { ranked, total, candidates: [{ candidate_id, has_resume, overall_score, score_label, score_color, matched_skills, missing_skills, breakdown }] }
    const ranked: Array<{
      candidate_id:   string;
      has_resume:     boolean;
      overall_score?: number;
      score_label?:   string;
      score_color?:   string;
      matched_skills: string[];
      missing_skills: string[];
      breakdown?:     any;
    }> = atsRes.data?.candidates ?? [];

    // Map seekerId -> application id so we update the right row
    const applicationBySeekerId = new Map(applications.map(a => [a.seekerId, a.id]));

    const scored = ranked.filter(r => r.has_resume && r.overall_score != null);

    await Promise.all(
      scored.map(r => {
        const applicationId = applicationBySeekerId.get(r.candidate_id);
        if (!applicationId) return Promise.resolve();
        return prisma.application.update({
          where: { id: applicationId },
          data: {
            aiScore:  r.overall_score,
            atsScore: r.overall_score,
            atsBreakdown: {
              matchedSkills: r.matched_skills ?? [],
              missingSkills: r.missing_skills ?? [],
              scoreLabel:    r.score_label ?? null,
              scoreColor:    r.score_color ?? null,
              breakdown:     r.breakdown ?? null,
              rankedAt:      new Date().toISOString(),
            },
          },
        }).catch(e => console.warn('rank update failed for', applicationId, e.message));
      })
    );

    const updated = await prisma.application.findMany({
      where: { jobId },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
    });

    res.json({ success: true, data: { ranked: scored.length, applicants: updated } });
  } catch (e: any) {
    if (e.response?.data) {
      console.error('[smart-rank] ATS service error:', JSON.stringify(e.response.data));
    } else {
      console.error('[smart-rank]', e.message);
    }
    res.status(500).json({ success: false, message: 'Smart ranking failed. Please try again.' });
  }
}

// ── PATCH /api/v1/applications/:id/shortlist ──────────────────────────────────
export async function shortlistCandidate(req: any, res: Response) {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({ where: { id }, include: { job: true } });
    if (!application) { res.status(404).json({ success: false, message: 'Application not found' }); return; }

    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || application.job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const updated = await prisma.application.update({
      where: { id }, data: { status: 'SHORTLISTED' },
    });

    const contact = await getSeekerContact(application.seekerId);
    if (contact) {
      notifClient.post('/send/shortlisted', {
        to: contact.email,
        seekerName: contact.name,
        jobTitle: application.job.title,
        companyName: company.companyName,
      }).catch(e => console.warn('shortlist email failed:', e.message));
    }

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[shortlist]', e);
    res.status(500).json({ success: false, message: 'Failed to shortlist candidate' });
  }
}

// ── PATCH /api/v1/applications/:id/schedule-interview ─────────────────────────
export async function scheduleInterview(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { interviewDate, interviewTime, interviewVenue } = req.body;

    if (!interviewDate || !interviewTime) {
      res.status(400).json({ success: false, message: 'Interview date and time are required' });
      return;
    }

    const application = await prisma.application.findUnique({ where: { id }, include: { job: true } });
    if (!application) { res.status(404).json({ success: false, message: 'Application not found' }); return; }

    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || application.job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const [hh, mm] = interviewTime.split(':').map(Number);
    const interviewDateTime = new Date(interviewDate);
    interviewDateTime.setHours(hh, mm, 0, 0);
    const practiceExpiresAt = new Date(interviewDateTime.getTime() - 60 * 60 * 1000);

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: 'INTERVIEW',
        interviewDate: interviewDateTime,
        interviewTime,
        interviewVenue: interviewVenue || null,
        practiceExpiresAt,
      },
    });

    const contact = await getSeekerContact(application.seekerId);
    if (contact) {
      notifClient.post('/send/interview-invite', {
        to:          contact.email,
        seekerName:  contact.name,
        jobTitle:    application.job.title,
        companyName: company.companyName,
        date:        formatDateForEmail(interviewDateTime),
        time:        interviewTime,
        venue:       interviewVenue || 'To be confirmed',
      }).catch(e => console.warn('interview email failed:', e.message));
    }

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[schedule-interview]', e);
    res.status(500).json({ success: false, message: 'Failed to schedule interview' });
  }
}

// ── PATCH /api/v1/applications/:id/reject ──────────────────────────────────────
export async function rejectCandidate(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { reasonTitle } = req.body;

    if (!reasonTitle) {
      res.status(400).json({ success: false, message: 'Rejection reason is required' });
      return;
    }

    const application = await prisma.application.findUnique({ where: { id }, include: { job: true } });
    if (!application) { res.status(404).json({ success: false, message: 'Application not found' }); return; }

    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || application.job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const contact = await getSeekerContact(application.seekerId);

    let aiMessage = `Thank you for applying for ${application.job.title}. After careful review, we have decided not to proceed at this time.`;
    try {
      const atsRes = await axios.post(
        `${ATS_URL}/api/v1/matching/rejection-explanation`,
        {
          candidate_id:     application.seekerId,
          job_id:           application.job.id,
          job_title:        application.job.title,
          job_description:  application.job.description,
          job_requirements: application.job.requirements,
          reason_title:     reasonTitle,
        },
        { timeout: 20000 }
      );
      aiMessage = atsRes.data?.explanation ?? aiMessage;
    } catch (e: any) {
      console.warn('[reject] ATS explanation generation failed, using fallback:', e.message);
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reasonTitle, rejectionMessage: aiMessage },
    });

    if (contact) {
      notifClient.post('/send/rejection', {
        to:          contact.email,
        seekerName:  contact.name,
        jobTitle:    application.job.title,
        companyName: company.companyName,
        reason:      reasonTitle,
        aiMessage,
      }).catch(e => console.warn('rejection email failed:', e.message));
    }

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[reject]', e);
    res.status(500).json({ success: false, message: 'Failed to reject candidate' });
  }
}