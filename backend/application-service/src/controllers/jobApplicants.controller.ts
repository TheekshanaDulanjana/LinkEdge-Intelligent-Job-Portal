import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { scoreApplications, usableCvText } from '../services/scoring.service';
import { overridePatch } from '../services/screening.service';
import { APPLICATION_LIST_SELECT } from '../lib/select';

import { ATS_URL } from '../config';

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
      select: APPLICATION_LIST_SELECT,
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
      take: 1000,
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
// Re-scores every applicant for this job: ATS score (CV vs requirements) and
// AI match (role fit, transferable skills, proven experience). Deterministic.
export async function smartRankApplicants(req: any, res: Response) {
  try {
    const { jobId } = req.params;
    const job = await verifyJobOwnership(req, jobId);
    if (!job) { res.status(403).json({ success: false, message: 'Not authorized for this job' }); return; }

    const applications = await prisma.application.findMany({ where: { jobId }, take: 1000 });
    if (applications.length === 0) {
      res.json({ success: true, data: { ranked: 0, applicants: [] } });
      return;
    }

    const scored = await scoreApplications(
      applications.map(a => ({
        id: a.id,
        seekerId: a.seekerId,
        cvText: usableCvText(a),
        job: { id: job.id, title: job.title, description: job.description, requirements: job.requirements },
      }))
    );

    const updated = await prisma.application.findMany({
      where: { jobId },
      select: APPLICATION_LIST_SELECT,
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
      take: 1000,
    });

    res.json({ success: true, data: { ranked: scored, applicants: updated } });
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
      where: { id }, data: { status: 'SHORTLISTED', ...overridePatch(application) },
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
    const { interviewDate, interviewTime, interviewVenue } = req.body; // validated by scheduleInterviewSchema

    const application = await prisma.application.findUnique({ where: { id }, include: { job: true } });
    if (!application) { res.status(404).json({ success: false, message: 'Application not found' }); return; }

    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || application.job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const interviewDateTime = new Date(`${interviewDate}T${interviewTime}:00`);
    const practiceExpiresAt = new Date(interviewDateTime.getTime() - 60 * 60 * 1000);

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: 'INTERVIEW',
        interviewDate: interviewDateTime,
        interviewTime,
        interviewVenue: interviewVenue || null,
        practiceExpiresAt,
        ...overridePatch(application),
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
    const { reasonTitle } = req.body; // validated by rejectSchema

    const application = await prisma.application.findUnique({ where: { id }, include: { job: true } });
    if (!application) { res.status(404).json({ success: false, message: 'Application not found' }); return; }

    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || application.job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const contact = await getSeekerContact(application.seekerId);

    let aiMessage = `Thank you for applying for ${application.job.title}. After comparing your profile with the role, we could not move forward mainly because of: ${String(reasonTitle).toLowerCase().replace(/\.$/, '')}. We encourage you to strengthen this area and apply again.`;

    // Full CV text: the submitted CV first, then the parsed profile CV.
    let cvText = usableCvText(application) || application.cvTextSnapshot || '';
    if (cvText.length < 200) {
      try {
        const rows: Array<{ parsed_text: string | null }> = await prisma.$queryRaw`
          SELECT parsed_text FROM candidate_resumes WHERE candidate_id = ${application.seekerId} LIMIT 1`;
        cvText = rows[0]?.parsed_text || cvText;
      } catch { /* optional */ }
    }
    const job: any = application.job;
    const jobText = [
      job.description,
      `Requirements: ${job.requirements}`,
      job.responsibilities?.length ? `Responsibilities: ${job.responsibilities.join('; ')}` : '',
      job.skills?.length ? `Key skills: ${job.skills.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    let generated = false;
    if (cvText.length >= 100) {
      try {
        const aiRes = await axios.post(
          `${AI_URL}/api/v1/ai/generate-rejection-message`,
          {
            reason_title:    String(reasonTitle).slice(0, 200),
            candidate_name:  (contact?.name || 'Candidate').slice(0, 120),
            job_title:       job.title.slice(0, 200),
            company_name:    (company.companyName || '').slice(0, 200),
            cv_text:         cvText.slice(0, 60000),
            job_description: jobText.slice(0, 30000),
          },
          { timeout: 25000 }
        );
        if (aiRes.data?.generated && aiRes.data?.ai_message) { aiMessage = aiRes.data.ai_message; generated = true; }
      } catch (e: any) {
        console.warn('[reject] AI paragraph failed, trying ATS explanation:', e.message);
      }
    }
    if (!generated) {
      try {
        const atsRes = await axios.post(
          `${ATS_URL}/api/v1/ats/rejection-explanation`,
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
        console.warn('[reject] ATS explanation failed, using template:', e.message);
      }
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reasonTitle, rejectionMessage: aiMessage, autoRejected: false },
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