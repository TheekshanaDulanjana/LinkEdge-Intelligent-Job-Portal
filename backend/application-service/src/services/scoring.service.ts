import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { ATS_URL } from '../config';

const prisma = new PrismaClient();

export interface ScorableApplication {
  id: string;
  seekerId: string;
  /** Text of the CV that was submitted with the application (scored instead of the profile CV). */
  cvText?: string | null;
  job: { id: string; title: string; description: string; requirements: string };
}

export interface ScoreOutcome {
  id: string;
  scored: boolean;       // false when no readable CV was available
  aiScore: number | null;
  atsScore: number | null;
  breakdown: any | null;
}

/**
 * Snapshot text is only trusted for scoring when it is a complete CV: either the application went
 * through screening (full text stored) or it is an old snapshot that was not cut at the 5000 cap.
 */
export function usableCvText(app: { cvTextSnapshot?: string | null; screenedAt?: Date | null }): string | undefined {
  const s = app.cvTextSnapshot ?? '';
  if (app.screenedAt && s.length >= 200) return s;
  if (s.length >= 300 && s.length < 4990) return s;
  return undefined;
}

/**
 * Scores applications with the ATS service and stores the result.
 *   atsScore -> how well the CV text matches the job requirements
 *   aiScore  -> AI match: role alignment, transferable skills, depth of experience
 */
export async function scoreApplicationsDetailed(apps: ScorableApplication[]): Promise<ScoreOutcome[]> {
  if (apps.length === 0) return [];
  const outcomes: ScoreOutcome[] = [];

  // The ATS service accepts at most 100 items per call.
  for (let i = 0; i < apps.length; i += 100) {
    const chunk = apps.slice(i, i + 100);
    const res = await axios.post(
      `${ATS_URL}/api/v1/ats/scores-batch`,
      {
        items: chunk.map(a => ({
          candidate_id: a.seekerId,
          job_id: a.job.id,
          job_title: a.job.title.slice(0, 200),
          job_description: a.job.description.slice(0, 30000),
          job_requirements: (a.job.requirements || '').slice(0, 30000),
          cv_text: a.cvText ? a.cvText.slice(0, 150000) : undefined,
        })),
      },
      { timeout: 60000 }
    );

    const results: any[] = res.data?.results ?? [];
    const byKey = new Map(results.map(r => [`${r.candidate_id}:${r.job_id}`, r]));

    await Promise.all(
      chunk.map(async a => {
        const r = byKey.get(`${a.seekerId}:${a.job.id}`);
        if (!r || !r.has_resume) {
          outcomes.push({ id: a.id, scored: false, aiScore: null, atsScore: null, breakdown: null });
          return;
        }
        const ai = r.ai_breakdown ?? {};
        const breakdown = {
          strengths: ai.strengths ?? [],
          weaknesses: ai.gaps ?? [],
          recommendation: ai.recommendation ? `${ai.recommendation}: ${ai.label ?? ''}`.trim() : '',
          matchedSkills: ai.matched_skills ?? [],
          missingSkills: ai.missing_skills ?? [],
          aiComponents: ai.components ?? null,
          ats: r.ats_breakdown ?? null,
          rankedAt: new Date().toISOString(),
        };
        try {
          await prisma.application.update({
            where: { id: a.id },
            data: { aiScore: r.ai_score, atsScore: r.ats_score, atsBreakdown: breakdown },
          });
          outcomes.push({ id: a.id, scored: true, aiScore: r.ai_score, atsScore: r.ats_score, breakdown });
        } catch (e: any) {
          console.warn('[scoring] update failed for', a.id, e.message);
          outcomes.push({ id: a.id, scored: false, aiScore: null, atsScore: null, breakdown: null });
        }
      })
    );
  }
  return outcomes;
}

/** Same as scoreApplicationsDetailed, returns how many applications were scored. */
export async function scoreApplications(apps: ScorableApplication[]): Promise<number> {
  return (await scoreApplicationsDetailed(apps)).filter(o => o.scored).length;
}
