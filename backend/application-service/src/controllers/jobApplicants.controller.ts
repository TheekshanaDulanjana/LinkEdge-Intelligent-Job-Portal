import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const AI_URL    = process.env.AI_SERVICE_URL || 'http://localhost:8001';
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

    // Payload shape must match ai-service's RankingRequest Pydantic model exactly
    const aiRes = await axios.post(
      `${AI_URL}/api/v1/ai/rank-candidates`,
      {
        job_id:           job.id,
        job_title:        job.title,
        job_description:  job.description,
        job_requirements: job.requirements,
        applications: applications.map(a => ({
          id:        a.id,
          seekerId:  a.seekerId,
          cvUrl:     a.cvUrl,
        })),
      },
      { timeout: 60000 }
    );

    // Response shape: { ranked_candidates: [{ application_id, seeker_id, score, strengths, weaknesses, recommendation }], ranking_summary, total_ranked }
    const ranked: Array<{
      application_id: string;
      seeker_id: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommendation: string;
    }> = aiRes.data?.ranked_candidates ?? [];

    await Promise.all(
      ranked.map(r =>
        prisma.application.update({
          where: { id: r.application_id },
          data: {
            aiScore: r.score,
            atsBreakdown: {
              strengths: r.strengths ?? [],
              weaknesses: r.weaknesses ?? [],
              recommendation: r.recommendation ?? '',
              rankedAt: new Date().toISOString(),
            },
          },
        }).catch(e => console.warn('rank update failed for', r.application_id, e.message))
      )
    );

    const updated = await prisma.application.findMany({
      where: { jobId },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
    });

    res.json({ success: true, data: { ranked: ranked.length, applicants: updated } });
  } catch (e: any) {
    // Surface the actual FastAPI validation error to the terminal for debugging
    if (e.response?.data) {
      console.error('[smart-rank] AI service error:', JSON.stringify(e.response.data));
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
      const aiRes = await axios.post(
        `${AI_URL}/api/v1/ai/generate-rejection-message`,
        {
          reason_title:     reasonTitle,
          candidate_name:   contact?.name ?? 'Candidate',
          job_title:        application.job.title,
          company_name:     company.companyName,
          cv_text:          application.cvTextSnapshot ?? '',
          job_description:  `${application.job.description}\n\nRequirements:\n${application.job.requirements}`,
        },
        { timeout: 20000 }
      );
      aiMessage = aiRes.data?.ai_message ?? aiMessage;
    } catch (e: any) {
      console.warn('[reject] AI message generation failed, using fallback:', e.message);
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