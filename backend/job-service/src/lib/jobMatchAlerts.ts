import axios from 'axios';
import type { PrismaClient } from '@prisma/client';

/**
 * Job match alerts.
 *
 * When a job is published, every seeker who
 *   - has a parsed CV, a verified e-mail and an active account,
 *   - has "Email Alerts" switched on in the profile, and
 *   - has not already applied to the job
 * is scored against it by the ATS service (the same deterministic score the job cards show).
 * Seekers at or above JOB_ALERT_MIN_SCORE get one e-mail through the notification service.
 *
 * Safety rules: one e-mail per (job, seeker) ever (unique row), a daily cap per seeker, a cap per job,
 * and nothing here can fail or slow down the request that published the job.
 */

const ATS_URL = process.env.ATS_SERVICE_URL || 'http://localhost:8003';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const MIN_SCORE = num(process.env.JOB_ALERT_MIN_SCORE, 70);          // percent
const MAX_PER_JOB = num(process.env.JOB_ALERT_MAX_PER_JOB, 500);      // e-mails for one job
const MAX_PER_SEEKER_PER_DAY = num(process.env.JOB_ALERT_MAX_PER_DAY, 3);
const CHUNK = 100;                                                     // candidates scored per ATS call

const running = new Set<string>();

export async function sendJobMatchAlerts(prisma: PrismaClient, jobId: string): Promise<void> {
  if (running.has(jobId)) return;
  running.add(jobId);
  const started = Date.now();
  let scored = 0;
  let sent = 0;

  try {
    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'ACTIVE' || job.deadline.getTime() < Date.now()) return;

    const company = await prisma.company.findFirst({
      where: { id: job.companyId },
      select: { companyName: true },
    });
    const companyName = company?.companyName || 'A company';

    // Seekers who already applied do not need an alert.
    const applied = new Set(
      (await prisma.application.findMany({ where: { jobId }, select: { seekerId: true } })).map((a) => a.seekerId)
    );

    let cursor: string | undefined;
    const dayAgo = () => new Date(Date.now() - 24 * 3600 * 1000);

    while (sent < MAX_PER_JOB) {
      const batch = await prisma.candidateResume.findMany({
        where: {
          isParsed: true,
          user: {
            role: 'SEEKER',
            status: 'ACTIVE',
            isEmailVerified: true,
            seeker: { is: { emailJobAlerts: true } },
          },
        },
        select: {
          candidateId: true,
          user: { select: { email: true, seeker: { select: { fullName: true } } } },
        },
        orderBy: { candidateId: 'asc' },
        take: CHUNK,
        ...(cursor ? { cursor: { candidateId: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].candidateId;

      const candidates = batch.filter((b) => !applied.has(b.candidateId));
      if (candidates.length === 0) continue;

      let ranked: any[] = [];
      try {
        const res = await axios.post(
          `${ATS_URL}/api/v1/ats/rank-applicants`,
          {
            job_id: job.id,
            job_title: job.title.slice(0, 200),
            job_description: job.description.slice(0, 30000),
            job_requirements: job.requirements.slice(0, 30000),
            candidate_ids: candidates.map((c) => c.candidateId),
          },
          { timeout: 60000 }
        );
        ranked = res.data?.candidates || [];
      } catch (e: any) {
        console.warn(`[job-alerts] ATS scoring failed for job ${jobId}: ${e.message}`);
        continue;
      }
      scored += ranked.length;

      const byId = new Map(candidates.map((c) => [c.candidateId, c]));
      for (const r of ranked) {
        if (sent >= MAX_PER_JOB) break;
        if (!r.has_resume || typeof r.overall_score !== 'number' || r.overall_score < MIN_SCORE) continue;
        const c = byId.get(r.candidate_id);
        if (!c?.user?.email) continue;

        // Daily cap per seeker, so a busy day of postings never floods an inbox.
        const today = await prisma.jobMatchAlert.count({ where: { userId: r.candidate_id, sentAt: { gte: dayAgo() } } });
        if (today >= MAX_PER_SEEKER_PER_DAY) continue;

        // Claim the (job, seeker) pair first; the unique key stops a second e-mail.
        let claim;
        try {
          claim = await prisma.jobMatchAlert.create({
            data: { jobId: job.id, userId: r.candidate_id, score: r.overall_score },
          });
        } catch (e: any) {
          if (e?.code === 'P2002') continue;   // already alerted for this job
          throw e;
        }

        try {
          await axios.post(
            `${NOTIFICATION_URL}/send/job-match`,
            {
              to: c.user.email,
              seekerName: c.user.seeker?.fullName || 'there',
              jobTitle: job.title,
              companyName,
              location: job.location || 'Not specified',
              score: r.overall_score,
              matchedSkills: (r.matched_skills || []).slice(0, 8),
              jobUrl: `${FRONTEND_URL}/jobs/${job.id}`,
              settingsUrl: `${FRONTEND_URL}/seeker/profile`,
            },
            { timeout: 15000 }
          );
          sent++;
        } catch (e: any) {
          // Release the claim so a later run can try this seeker again.
          await prisma.jobMatchAlert.delete({ where: { id: claim.id } }).catch(() => undefined);
          console.warn(`[job-alerts] e-mail failed for job ${jobId}: ${e.message}`);
        }
      }
    }
  } catch (e: any) {
    console.error(`[job-alerts] job ${jobId} failed:`, e?.message || e);
  } finally {
    running.delete(jobId);
    console.log(`[job-alerts] job ${jobId}: scored ${scored}, e-mailed ${sent}, min score ${MIN_SCORE}, ${Date.now() - started} ms`);
  }
}

/** Fire-and-forget: the caller's response never waits for scoring or e-mail. */
export function queueJobMatchAlerts(prisma: PrismaClient, jobId: string): void {
  setImmediate(() => {
    sendJobMatchAlerts(prisma, jobId).catch((e) => console.error('[job-alerts] unexpected error:', e?.message || e));
  });
}
