import { PrismaClient } from '@prisma/client';
import { scoreApplicationsDetailed } from './scoring.service';
import { notificationHelper } from './notification.helper';

const prisma = new PrismaClient();

/** Weight of the AI match in the screening decision; the rest is the ATS keyword score. */
const AI_WEIGHT = 0.6;

export const AUTO_REJECT_REASON = 'Did not meet the minimum match requirements';

export function screeningScore(ai: number, ats: number): number {
  return Math.round((AI_WEIGHT * ai + (1 - AI_WEIGHT) * ats) * 10) / 10;
}

function list(items: string[], n: number) {
  return items.slice(0, n).join(', ');
}

function buildMessage(jobTitle: string, companyName: string, score: number, threshold: number, b: any): string {
  const missing: string[] = b?.missingSkills ?? [];
  const matched: string[] = b?.matchedSkills ?? [];
  const parts = [
    `Thank you for applying for ${jobTitle} at ${companyName}.`,
    `Our automated screening compared your CV with the role requirements and your match was ${Math.round(score)}%, below the ${threshold}% this position needs, so your application was not taken forward.`,
  ];
  if (matched.length) parts.push(`What matched: ${list(matched, 5)}.`);
  if (missing.length) parts.push(`Skills asked for that we could not find on your CV: ${list(missing, 6)}.`);
  parts.push('If you have this experience, update your CV so it is clearly listed and apply again. You are welcome to apply to other roles that fit your profile.');
  return parts.join(' ');
}

/**
 * Scores a freshly submitted application and, when the job has auto-screening on and the match is
 * below the job's minimum, rejects it as "system" with an explanation.
 *
 * Safe by design:
 *   - an unreadable CV or an ATS outage never rejects anyone; the application stays PENDING for manual review
 *   - nothing is changed if the company already acted on the application
 *   - the company can still shortlist or interview a system-rejected candidate (override)
 */
export async function screenApplication(applicationId: string): Promise<{ decision: 'rejected' | 'passed' | 'manual' | 'skipped'; score?: number }> {
  const app = await prisma.application.findUnique({ where: { id: applicationId }, include: { job: true } });
  if (!app || app.status !== 'PENDING' || app.companyOverride) return { decision: 'skipped' };

  const [outcome] = await scoreApplicationsDetailed([{
    id: app.id,
    seekerId: app.seekerId,
    cvText: app.cvTextSnapshot,
    job: { id: app.job.id, title: app.job.title, description: app.job.description, requirements: app.job.requirements },
  }]);

  await prisma.application.updateMany({ where: { id: app.id }, data: { screenedAt: new Date() } });

  // Could not read the CV: a human decides.
  if (!outcome?.scored || outcome.aiScore == null || outcome.atsScore == null) return { decision: 'manual' };

  const score = screeningScore(outcome.aiScore, outcome.atsScore);
  const threshold = app.job.minMatchScore;
  const screening = { score, threshold, autoScreen: app.job.autoScreen, at: new Date().toISOString() };
  await prisma.application.update({
    where: { id: app.id },
    data: { atsBreakdown: { ...(outcome.breakdown ?? {}), screening } },
  });

  if (!app.job.autoScreen || score >= threshold) return { decision: 'passed', score };

  const [seeker, company] = await Promise.all([
    prisma.jobSeeker.findFirst({ where: { userId: app.seekerId }, include: { user: true } }),
    prisma.company.findFirst({ where: { id: app.job.companyId } }),
  ]);
  const message = buildMessage(app.job.title, company?.companyName ?? 'the company', score, threshold, outcome.breakdown);

  // Only if still untouched (the company may have acted while scoring ran).
  const changed = await prisma.application.updateMany({
    where: { id: app.id, status: 'PENDING', companyOverride: false },
    data: { status: 'REJECTED', autoRejected: true, rejectionReason: AUTO_REJECT_REASON, rejectionMessage: message },
  });
  if (changed.count === 0) return { decision: 'skipped', score };

  if (seeker && company) {
    notificationHelper
      .applicationRejected(app.seekerId, seeker.user.email, seeker.fullName, app.job.title, company.companyName, AUTO_REJECT_REASON, message, app.id)
      .catch((e: any) => console.warn('[screening] notify failed:', e.message));
  }
  return { decision: 'rejected', score };
}

/** Fields to set when a company moves a system-rejected candidate forward. */
export function overridePatch(current: { status: string; autoRejected: boolean }) {
  if (current.status === 'REJECTED' || current.autoRejected) {
    return { autoRejected: false, companyOverride: true, rejectionReason: null, rejectionMessage: null };
  }
  return {};
}
