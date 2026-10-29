import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from './db';

/**
 * Read-only platform analytics for the admin console.
 * Every number comes straight from the shared database, so nothing here can drift from reality.
 */
const router = Router();

const DAY = 86400000;
const RANGES = [7, 30, 90, 180, 365];

const rangeOf = (q: unknown): number => {
  const n = parseInt(String(q ?? '30'));
  return RANGES.includes(n) ? n : 30;
};

// A short cache keeps the dashboard quick when several admins open it at once.
const cache = new Map<string, { at: number; data: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  return data;
}

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

/** Run a query that may fail (for example a table owned by another service) without breaking the page. */
async function soft<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

const q = <T = Record<string, unknown>>(sql: Prisma.Sql) => prisma.$queryRaw<T[]>(sql);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const delta = (cur: number, prev: number) => ({ current: cur, previous: prev, change: cur - prev, changePct: prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null });

/** One value per day for the last `days` days (zero where nothing happened). */
async function daily(table: string, where: Prisma.Sql, days: number, col = 'createdAt') {
  const since = new Date(Date.now() - (days - 1) * DAY);
  const rows = await q<{ day: Date; n: number }>(Prisma.sql`
    SELECT d::date AS day, COALESCE(c.n, 0)::int AS n
    FROM generate_series(date_trunc('day', ${since}::timestamp), date_trunc('day', (now() at time zone 'utc')), interval '1 day') d
    LEFT JOIN (
      SELECT date_trunc('day', ${Prisma.raw(`"${col}"`)}) AS day, count(*) AS n
      FROM ${Prisma.raw(`"${table}"`)} WHERE ${where} AND ${Prisma.raw(`"${col}"`)} >= ${since}::timestamp GROUP BY 1
    ) c ON c.day = d
    ORDER BY d`);
  return rows.map((r) => ({ day: r.day, count: r.n }));
}

const people = Prisma.sql`"role" IN ('SEEKER','COMPANY')`;

// ─── summary (dashboard) ────────────────────────────────────────────────────

router.get('/summary', wrap(async (req, res) => {
  const days = rangeOf(req.query.days);
  const data = await cached(`summary:${days}`, 20000, async () => {
    const now = Date.now();
    const since = new Date(now - days * DAY);
    const prev = new Date(now - 2 * days * DAY);
    const d1 = new Date(now - DAY), d7 = new Date(now - 7 * DAY), d30 = new Date(now - 30 * DAY);
    const in7 = new Date(now + 7 * DAY);

    const [
      seekers, companies, seekersCur, seekersPrev, companiesCur, companiesPrev, unverified, disabled,
      jobGroups, jobsCur, jobsPrev, appsTotal, appsCur, appsPrev, appStatus,
      active1, active7, active30, expiring, zeroApps, hiddenJobs, lockedAdmins, failedLogins24,
      sSeekers, sCompanies, sJobs, sApps,
      recentUsers, recentJobs, recentAudit, recentApps, unverifiedOld,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'SEEKER' } }),
      prisma.user.count({ where: { role: 'COMPANY' } }),
      prisma.user.count({ where: { role: 'SEEKER', createdAt: { gte: since } } }),
      prisma.user.count({ where: { role: 'SEEKER', createdAt: { gte: prev, lt: since } } }),
      prisma.user.count({ where: { role: 'COMPANY', createdAt: { gte: since } } }),
      prisma.user.count({ where: { role: 'COMPANY', createdAt: { gte: prev, lt: since } } }),
      prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, isEmailVerified: false } }),
      prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, status: 'DISABLED' } }),
      prisma.jobPosting.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.jobPosting.count({ where: { createdAt: { gte: since } } }),
      prisma.jobPosting.count({ where: { createdAt: { gte: prev, lt: since } } }),
      prisma.application.count(),
      prisma.application.count({ where: { createdAt: { gte: since } } }),
      prisma.application.count({ where: { createdAt: { gte: prev, lt: since } } }),
      prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, lastLoginAt: { gte: d1 } } }),
      prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, lastLoginAt: { gte: d7 } } }),
      prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, lastLoginAt: { gte: d30 } } }),
      prisma.jobPosting.count({ where: { status: 'ACTIVE', deadline: { gte: new Date(), lte: in7 } } }),
      prisma.jobPosting.count({ where: { status: 'ACTIVE', applications: { none: {} }, createdAt: { lt: d7 } } }),
      prisma.jobPosting.count({ where: { status: 'HIDDEN' } }),
      prisma.user.count({ where: { role: 'ADMIN', lockedUntil: { gt: new Date() } } }),
      prisma.auditLog.count({ where: { action: 'admin.login_failed', createdAt: { gte: d1 } } }),
      daily('User', Prisma.sql`"role" = 'SEEKER'`, days),
      daily('User', Prisma.sql`"role" = 'COMPANY'`, days),
      daily('JobPosting', Prisma.sql`true`, days),
      daily('Application', Prisma.sql`true`, days),
      prisma.user.findMany({
        where: { role: { in: ['SEEKER', 'COMPANY'] } }, orderBy: { createdAt: 'desc' }, take: 6,
        select: { id: true, email: true, role: true, createdAt: true, isEmailVerified: true, status: true, seeker: { select: { fullName: true, profileImageUrl: true } }, company: { select: { companyName: true, logoUrl: true } } },
      }),
      prisma.jobPosting.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, title: true, status: true, createdAt: true, location: true, companyId: true, _count: { select: { applications: true } } } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, isEmailVerified: false, createdAt: { lt: new Date(now - 3 * DAY) } } }),
    ]);

    const companyIds = [...new Set(recentJobs.map((j) => j.companyId))];
    const companyRows = companyIds.length ? await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, companyName: true } }) : [];
    const cname = new Map(companyRows.map((c) => [c.id, c.companyName]));

    const jobs: Record<string, number> = { ACTIVE: 0, INACTIVE: 0, CLOSED: 0, DRAFT: 0, HIDDEN: 0 };
    jobGroups.forEach((g) => { jobs[g.status] = g._count._all; });
    const jobsTotal = Object.values(jobs).reduce((a, b) => a + b, 0);
    const apps: Record<string, number> = { PENDING: 0, REVIEWING: 0, SHORTLISTED: 0, INTERVIEW: 0, REJECTED: 0 };
    appStatus.forEach((g) => { apps[g.status] = g._count._all; });

    const merge = (a: { day: Date; count: number }[], b: { day: Date; count: number }[], c: { day: Date; count: number }[], d: { day: Date; count: number }[]) =>
      a.map((x, i) => ({ day: x.day, seekers: x.count, companies: b[i]?.count ?? 0, jobs: c[i]?.count ?? 0, applications: d[i]?.count ?? 0 }));

    return {
      days,
      kpis: {
        seekers: { total: seekers, ...delta(seekersCur, seekersPrev) },
        companies: { total: companies, ...delta(companiesCur, companiesPrev) },
        jobs: { total: jobsTotal, active: jobs.ACTIVE, ...delta(jobsCur, jobsPrev) },
        applications: { total: appsTotal, ...delta(appsCur, appsPrev) },
      },
      users: { seekers, companies, unverified, disabled, active1, active7, active30, verifiedRate: pct(seekers + companies - unverified, seekers + companies) },
      jobs: { ...jobs, total: jobsTotal },
      applications: { ...apps, total: appsTotal, perJob: jobsTotal ? Math.round((appsTotal / jobsTotal) * 10) / 10 : 0 },
      series: merge(sSeekers, sCompanies, sJobs, sApps),
      attention: { unverifiedOld, expiring, zeroApps, hiddenJobs, lockedAdmins, failedLogins24, pendingApplications: recentApps },
      recentUsers: recentUsers.map((u) => ({
        id: u.id, email: u.email, role: u.role, createdAt: u.createdAt, verified: u.isEmailVerified, status: u.status,
        name: u.seeker?.fullName || u.company?.companyName || u.email, image: u.seeker?.profileImageUrl || u.company?.logoUrl || null,
      })),
      recentJobs: recentJobs.map((j) => ({ id: j.id, title: j.title, status: j.status, createdAt: j.createdAt, location: j.location, company: cname.get(j.companyId) ?? 'Unknown', applications: j._count.applications })),
      recentAudit,
    };
  });
  res.json({ success: true, data });
}));

// ─── growth ─────────────────────────────────────────────────────────────────

router.get('/growth', wrap(async (req, res) => {
  const days = rangeOf(req.query.days);
  const data = await cached(`growth:${days}`, 30000, async () => {
    const since = new Date(Date.now() - (days - 1) * DAY);
    const [cumulative, providers, funnelSeeker, funnelCompany, cohorts, weekday, hourly, verification] = await Promise.all([
      q<{ day: Date; seekers: number; companies: number }>(Prisma.sql`
        SELECT d::date AS day,
          (SELECT count(*) FROM "User" u WHERE u."role"='SEEKER' AND u."createdAt" < d + interval '1 day')::int AS seekers,
          (SELECT count(*) FROM "User" u WHERE u."role"='COMPANY' AND u."createdAt" < d + interval '1 day')::int AS companies
        FROM generate_series(date_trunc('day', ${since}::timestamp), date_trunc('day', (now() at time zone 'utc')), interval '1 day') d ORDER BY d`),
      q<{ provider: string; n: number }>(Prisma.sql`SELECT "authProvider"::text AS provider, count(*)::int AS n FROM "User" WHERE ${people} GROUP BY 1`),
      q<{ registered: number; verified: number; resume: number; applied: number }>(Prisma.sql`
        SELECT count(*)::int AS registered,
          count(*) FILTER (WHERE u."isEmailVerified")::int AS verified,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "candidate_resumes" r WHERE r."candidate_id" = u.id))::int AS resume,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Application" a WHERE a."seekerId" = u.id))::int AS applied
        FROM "User" u WHERE u."role"='SEEKER'`),
      q<{ registered: number; verified: number; profile: number; posted: number; received: number }>(Prisma.sql`
        SELECT count(*)::int AS registered,
          count(*) FILTER (WHERE u."isEmailVerified")::int AS verified,
          count(*) FILTER (WHERE c."industry" IS NOT NULL AND c."aboutUs" IS NOT NULL)::int AS profile,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "JobPosting" j WHERE j."companyId" = c.id))::int AS posted,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "JobPosting" j JOIN "Application" a ON a."jobId" = j.id WHERE j."companyId" = c.id))::int AS received
        FROM "User" u LEFT JOIN "Company" c ON c."userId" = u.id WHERE u."role"='COMPANY'`),
      q<{ week: Date; signups: number; returned: number }>(Prisma.sql`
        SELECT date_trunc('week', "createdAt")::date AS week, count(*)::int AS signups,
          count(*) FILTER (WHERE "lastLoginAt" IS NOT NULL AND "lastLoginAt" >= "createdAt" + interval '1 day')::int AS returned
        FROM "User" WHERE ${people} AND "createdAt" >= date_trunc('week', (now() at time zone 'utc')) - interval '7 weeks'
        GROUP BY 1 ORDER BY 1`),
      q<{ dow: number; n: number }>(Prisma.sql`SELECT extract(dow FROM "createdAt")::int AS dow, count(*)::int AS n FROM "Application" WHERE "createdAt" >= ${since}::timestamp GROUP BY 1 ORDER BY 1`),
      q<{ hour: number; n: number }>(Prisma.sql`SELECT extract(hour FROM "createdAt")::int AS hour, count(*)::int AS n FROM "Application" WHERE "createdAt" >= ${since}::timestamp GROUP BY 1 ORDER BY 1`),
      q<{ role: string; verified: number; total: number }>(Prisma.sql`SELECT "role"::text AS role, count(*) FILTER (WHERE "isEmailVerified")::int AS verified, count(*)::int AS total FROM "User" WHERE ${people} GROUP BY 1`),
    ]);
    const dow = Array.from({ length: 7 }, (_, i) => ({ day: i, count: weekday.find((w) => w.dow === i)?.n ?? 0 }));
    const hour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hourly.find((w) => w.hour === i)?.n ?? 0 }));
    return {
      days,
      cumulative,
      providers,
      verification,
      funnels: { seeker: funnelSeeker[0], company: funnelCompany[0] },
      cohorts: cohorts.map((c) => ({ ...c, returnRate: pct(c.returned, c.signups) })),
      applicationsByWeekday: dow,
      applicationsByHour: hour,
    };
  });
  res.json({ success: true, data });
}));

// ─── marketplace: jobs, skills, geography ───────────────────────────────────

router.get('/marketplace', wrap(async (req, res) => {
  const days = rangeOf(req.query.days);
  const data = await cached(`market:${days}`, 30000, async () => {
    const since = new Date(Date.now() - days * DAY);
    const [demand, supply, jobType, locType, level, dept, industries, jobLoc, seekerLoc, workStatus, interest, salary, salaryByType, topCompanies, topJobs, perType] = await Promise.all([
      q<{ skill: string; n: number }>(Prisma.sql`SELECT lower(trim(s)) AS skill, count(*)::int AS n FROM "JobPosting", unnest("skills") s WHERE length(trim(s)) > 0 GROUP BY 1 ORDER BY 2 DESC LIMIT 20`),
      q<{ skill: string; n: number }>(Prisma.sql`SELECT lower(trim(s)) AS skill, count(*)::int AS n FROM "candidate_resumes", unnest("skills") s WHERE length(trim(s)) > 0 GROUP BY 1`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT "jobType"::text AS k, count(*)::int AS n FROM "JobPosting" GROUP BY 1 ORDER BY 2 DESC`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT "locationType"::text AS k, count(*)::int AS n FROM "JobPosting" GROUP BY 1 ORDER BY 2 DESC`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT COALESCE(NULLIF(trim("experienceLevel"), ''), 'Not set') AS k, count(*)::int AS n FROM "JobPosting" GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT COALESCE(NULLIF(trim("department"), ''), 'Not set') AS k, count(*)::int AS n FROM "JobPosting" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT COALESCE(NULLIF(trim("industry"), ''), 'Not set') AS k, count(*)::int AS n FROM "Company" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT COALESCE(NULLIF(trim("location"), ''), 'Not set') AS k, count(*)::int AS n FROM "JobPosting" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT COALESCE(NULLIF(trim("location"), ''), 'Not set') AS k, count(*)::int AS n FROM "JobSeeker" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT "workStatus"::text AS k, count(*)::int AS n FROM "JobSeeker" GROUP BY 1 ORDER BY 2 DESC`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT COALESCE(NULLIF(trim("interestArea"), ''), 'Not set') AS k, count(*)::int AS n FROM "JobSeeker" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      q<{ jobs: number; avg_min: number | null; avg_max: number | null; median: number | null }>(Prisma.sql`
        SELECT count(*)::int AS jobs, avg("salaryMin")::float8 AS avg_min, avg("salaryMax")::float8 AS avg_max,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY ("salaryMin" + "salaryMax") / 2.0)::float8 AS median
        FROM "JobPosting" WHERE "salaryMin" IS NOT NULL AND "salaryMax" IS NOT NULL`),
      q<{ k: string; avg_min: number; avg_max: number; n: number }>(Prisma.sql`
        SELECT "jobType"::text AS k, avg("salaryMin")::float8 AS avg_min, avg("salaryMax")::float8 AS avg_max, count(*)::int AS n
        FROM "JobPosting" WHERE "salaryMin" IS NOT NULL AND "salaryMax" IS NOT NULL GROUP BY 1 ORDER BY 4 DESC`),
      q<{ id: string; name: string; jobs: number; active: number; applications: number; responded: number }>(Prisma.sql`
        SELECT c.id, c."companyName" AS name, count(DISTINCT j.id)::int AS jobs,
          count(DISTINCT j.id) FILTER (WHERE j."status" = 'ACTIVE')::int AS active,
          count(a.id)::int AS applications, count(a.id) FILTER (WHERE a."status" <> 'PENDING')::int AS responded
        FROM "Company" c LEFT JOIN "JobPosting" j ON j."companyId" = c.id LEFT JOIN "Application" a ON a."jobId" = j.id
        GROUP BY c.id ORDER BY applications DESC, jobs DESC LIMIT 8`),
      q<{ id: string; title: string; company: string; status: string; applications: number; avg_ats: number | null }>(Prisma.sql`
        SELECT j.id, j.title, c."companyName" AS company, j."status"::text AS status, count(a.id)::int AS applications, avg(a."atsScore")::float8 AS avg_ats
        FROM "JobPosting" j JOIN "Company" c ON c.id = j."companyId" LEFT JOIN "Application" a ON a."jobId" = j.id AND a."createdAt" >= ${since}
        GROUP BY j.id, c."companyName" ORDER BY applications DESC LIMIT 8`),
      q<{ k: string; jobs: number; applications: number }>(Prisma.sql`
        SELECT j."jobType"::text AS k, count(DISTINCT j.id)::int AS jobs, count(a.id)::int AS applications
        FROM "JobPosting" j LEFT JOIN "Application" a ON a."jobId" = j.id GROUP BY 1 ORDER BY 2 DESC`),
    ]);
    const supplyMap = new Map(supply.map((s) => [s.skill, s.n]));
    const gap = demand.slice(0, 15).map((d) => ({ skill: d.skill, demand: d.n, supply: supplyMap.get(d.skill) ?? 0 }));
    const topSupply = [...supply].sort((a, b) => b.n - a.n).slice(0, 15);
    return {
      days, skillGap: gap, topDemand: demand, topSupply,
      jobType, locationType: locType, experienceLevel: level, departments: dept, industries,
      jobLocations: jobLoc, seekerLocations: seekerLoc, workStatus, interestAreas: interest,
      salary: salary[0], salaryByType,
      topCompanies: topCompanies.map((c) => ({ ...c, responseRate: pct(c.responded, c.applications) })),
      topJobs, perType: perType.map((p) => ({ ...p, perJob: p.jobs ? Math.round((p.applications / p.jobs) * 10) / 10 : 0 })),
    };
  });
  res.json({ success: true, data });
}));

// ─── hiring: pipeline and AI screening ──────────────────────────────────────

router.get('/hiring', wrap(async (req, res) => {
  const days = rangeOf(req.query.days);
  const data = await cached(`hiring:${days}`, 30000, async () => {
    const since = new Date(Date.now() - days * DAY);
    const [status, ats, buckets, dims, matched, missing, rejReasons, respond, perDay, ranks, resumes, extra] = await Promise.all([
      q<{ k: string; n: number }>(Prisma.sql`SELECT "status"::text AS k, count(*)::int AS n FROM "Application" WHERE "createdAt" >= ${since}::timestamp GROUP BY 1`),
      q<{ total: number; scored: number; avg_ats: number | null; avg_ai: number | null; auto_rejected: number; overridden: number; interviews: number }>(Prisma.sql`
        SELECT count(*)::int AS total, count("atsScore")::int AS scored, avg("atsScore")::float8 AS avg_ats, avg("aiScore")::float8 AS avg_ai,
          count(*) FILTER (WHERE "autoRejected")::int AS auto_rejected, count(*) FILTER (WHERE "companyOverride")::int AS overridden,
          count(*) FILTER (WHERE "interviewDate" IS NOT NULL)::int AS interviews
        FROM "Application" WHERE "createdAt" >= ${since}::timestamp`),
      q<{ b: number; n: number }>(Prisma.sql`SELECT LEAST(floor("atsScore" / 20), 4)::int AS b, count(*)::int AS n FROM "Application" WHERE "atsScore" IS NOT NULL AND "createdAt" >= ${since}::timestamp GROUP BY 1 ORDER BY 1`),
      soft(q<{ technical: number | null; experience: number | null; education: number | null; certification: number | null; keyword: number | null; overall: number | null; n: number }>(Prisma.sql`
        SELECT avg("technical_score")::float8 AS technical, avg("experience_score")::float8 AS experience, avg("education_score")::float8 AS education,
          avg("certification_score")::float8 AS certification, avg("keyword_score")::float8 AS keyword, avg("overall_score")::float8 AS overall, count(*)::int AS n
        FROM "ats_scores" WHERE "calculated_at" >= ${since}::timestamp`), []),
      soft(q<{ skill: string; n: number }>(Prisma.sql`SELECT lower(trim(s)) AS skill, count(*)::int AS n FROM "ats_scores", unnest("matched_skills") s WHERE length(trim(s)) > 0 GROUP BY 1 ORDER BY 2 DESC LIMIT 10`), []),
      soft(q<{ skill: string; n: number }>(Prisma.sql`SELECT lower(trim(s)) AS skill, count(*)::int AS n FROM "ats_scores", unnest("missing_skills") s WHERE length(trim(s)) > 0 GROUP BY 1 ORDER BY 2 DESC LIMIT 10`), []),
      q<{ k: string; n: number }>(Prisma.sql`SELECT left(trim("rejectionReason"), 60) AS k, count(*)::int AS n FROM "Application" WHERE "rejectionReason" IS NOT NULL AND length(trim("rejectionReason")) > 0 AND "createdAt" >= ${since}::timestamp GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
      q<{ avg_hours: number | null; responded: number; total: number }>(Prisma.sql`
        SELECT avg(extract(epoch FROM ("updatedAt" - "createdAt")) / 3600) FILTER (WHERE "status" <> 'PENDING')::float8 AS avg_hours,
          count(*) FILTER (WHERE "status" <> 'PENDING')::int AS responded, count(*)::int AS total
        FROM "Application" WHERE "createdAt" >= ${since}::timestamp`),
      daily('Application', Prisma.sql`true`, days),
      q<{ name: string; applications: number; responded: number; hours: number | null }>(Prisma.sql`
        SELECT c."companyName" AS name, count(a.id)::int AS applications, count(a.id) FILTER (WHERE a."status" <> 'PENDING')::int AS responded,
          avg(extract(epoch FROM (a."updatedAt" - a."createdAt")) / 3600) FILTER (WHERE a."status" <> 'PENDING')::float8 AS hours
        FROM "Company" c JOIN "JobPosting" j ON j."companyId" = c.id JOIN "Application" a ON a."jobId" = j.id
        WHERE a."createdAt" >= ${since}::timestamp GROUP BY c.id HAVING count(a.id) >= 1 ORDER BY applications DESC LIMIT 8`),
      q<{ total: number; parsed: number; failed: number; avg_years: number | null }>(Prisma.sql`
        SELECT count(*)::int AS total, count(*) FILTER (WHERE "is_parsed")::int AS parsed, count(*) FILTER (WHERE "parse_error" IS NOT NULL)::int AS failed, avg("experience_years")::float8 AS avg_years
        FROM "candidate_resumes"`),
      q<{ events: number; upcoming: number }>(Prisma.sql`SELECT count(*)::int AS events, count(*) FILTER (WHERE "startTime" > (now() at time zone 'utc'))::int AS upcoming FROM "CalendarEvent"`),
    ]);
    const counts: Record<string, number> = { PENDING: 0, REVIEWING: 0, SHORTLISTED: 0, INTERVIEW: 0, REJECTED: 0 };
    status.forEach((s) => { counts[s.k] = s.n; });
    const total = ats[0]?.total ?? 0;
    const edges = ['0-20', '20-40', '40-60', '60-80', '80-100'];
    return {
      days,
      funnel: counts,
      conversion: {
        shortlistRate: pct(counts.SHORTLISTED + counts.INTERVIEW, total),
        interviewRate: pct(counts.INTERVIEW, total),
        rejectRate: pct(counts.REJECTED, total),
        autoRejectRate: pct(ats[0]?.auto_rejected ?? 0, total),
        overrideRate: pct(ats[0]?.overridden ?? 0, ats[0]?.auto_rejected ?? 0),
        responseRate: pct(respond[0]?.responded ?? 0, respond[0]?.total ?? 0),
      },
      screening: { total, scored: ats[0]?.scored ?? 0, avgAts: ats[0]?.avg_ats ?? null, avgAi: ats[0]?.avg_ai ?? null, autoRejected: ats[0]?.auto_rejected ?? 0, overridden: ats[0]?.overridden ?? 0, interviews: ats[0]?.interviews ?? 0 },
      atsDistribution: edges.map((label, i) => ({ label, count: buckets.find((b) => b.b === i)?.n ?? 0 })),
      dimensions: dims[0] ?? null,
      matchedSkills: matched, missingSkills: missing,
      rejectionReasons: rejReasons,
      avgResponseHours: respond[0]?.avg_hours ?? null,
      perDay,
      companyResponsiveness: ranks.map((r) => ({ ...r, responseRate: pct(r.responded, r.applications) })),
      resumes: { ...resumes[0], parseRate: pct(resumes[0]?.parsed ?? 0, resumes[0]?.total ?? 0) },
      calendar: extra[0],
    };
  });
  res.json({ success: true, data });
}));

// ─── engagement ─────────────────────────────────────────────────────────────

router.get('/engagement', wrap(async (req, res) => {
  const days = rangeOf(req.query.days);
  const data = await cached(`engage:${days}`, 30000, async () => {
    const since = new Date(Date.now() - days * DAY);
    const [activity, notif, notifType, seekerComplete, companyComplete, dormant] = await Promise.all([
      q<{ role: string; d1: number; d7: number; d30: number; never: number; total: number }>(Prisma.sql`
        SELECT "role"::text AS role,
          count(*) FILTER (WHERE "lastLoginAt" >= (now() at time zone 'utc') - interval '1 day')::int AS d1,
          count(*) FILTER (WHERE "lastLoginAt" >= (now() at time zone 'utc') - interval '7 days')::int AS d7,
          count(*) FILTER (WHERE "lastLoginAt" >= (now() at time zone 'utc') - interval '30 days')::int AS d30,
          count(*) FILTER (WHERE "lastLoginAt" IS NULL)::int AS never, count(*)::int AS total
        FROM "User" WHERE ${people} GROUP BY 1`),
      q<{ total: number; read: number }>(Prisma.sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE "isRead")::int AS read FROM "Notification" WHERE "createdAt" >= ${since}::timestamp`),
      q<{ k: string; n: number }>(Prisma.sql`SELECT "type"::text AS k, count(*)::int AS n FROM "Notification" WHERE "createdAt" >= ${since}::timestamp GROUP BY 1 ORDER BY 2 DESC`),
      q<{ score: number; n: number }>(Prisma.sql`
        SELECT LEAST(floor(pct / 25), 3)::int AS score, count(*)::int AS n FROM (
          SELECT 100.0 * (
            (s."phone" IS NOT NULL)::int + (s."location" IS NOT NULL)::int + (s."profileImageUrl" IS NOT NULL)::int + (s."interestArea" IS NOT NULL)::int +
            (s."professionalSummary" IS NOT NULL)::int + (EXISTS (SELECT 1 FROM "candidate_resumes" r WHERE r."candidate_id" = s."userId"))::int +
            (s."githubUrl" IS NOT NULL OR s."websiteUrl" IS NOT NULL OR s."behanceUrl" IS NOT NULL)::int
          ) / 7 AS pct FROM "JobSeeker" s) t GROUP BY 1 ORDER BY 1`),
      q<{ score: number; n: number }>(Prisma.sql`
        SELECT LEAST(floor(pct / 25), 3)::int AS score, count(*)::int AS n FROM (
          SELECT 100.0 * ((c."industry" IS NOT NULL)::int + (c."website" IS NOT NULL)::int + (c."location" IS NOT NULL)::int + (c."phone" IS NOT NULL)::int +
            (c."logoUrl" IS NOT NULL)::int + (c."coverImageUrl" IS NOT NULL)::int + (c."aboutUs" IS NOT NULL)::int) / 7 AS pct FROM "Company" c) t GROUP BY 1 ORDER BY 1`),
      q<{ id: string; email: string; role: string; last: Date | null; created: Date }>(Prisma.sql`
        SELECT id, email, "role"::text AS role, "lastLoginAt" AS last, "createdAt" AS created FROM "User"
        WHERE ${people} AND "status" = 'ACTIVE' AND COALESCE("lastLoginAt", "createdAt") < (now() at time zone 'utc') - interval '30 days'
        ORDER BY COALESCE("lastLoginAt", "createdAt") ASC LIMIT 8`),
    ]);
    const bands = ['Under 25%', '25-49%', '50-74%', '75-100%'];
    const band = (rows: { score: number; n: number }[]) => bands.map((label, i) => ({ label, count: rows.find((r) => r.score === i)?.n ?? 0 }));
    return {
      days, activity,
      notifications: { total: notif[0]?.total ?? 0, read: notif[0]?.read ?? 0, readRate: pct(notif[0]?.read ?? 0, notif[0]?.total ?? 0), byType: notifType },
      seekerProfileCompleteness: band(seekerComplete), companyProfileCompleteness: band(companyComplete),
      dormant,
    };
  });
  res.json({ success: true, data });
}));

// ─── system health and admin security ───────────────────────────────────────

const SERVICES: Array<{ name: string; url: string }> = [
  { name: 'Auth service', url: `http://localhost:${process.env.PORT || 3001}/health` },
  { name: 'Job service', url: `${process.env.JOB_SERVICE_URL || 'http://localhost:3002'}/health` },
  { name: 'Application service', url: `${process.env.APPLICATION_SERVICE_URL || 'http://localhost:3003'}/health` },
  { name: 'Notification service', url: `${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004'}/health` },
  { name: 'AI service', url: `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health` },
];

async function ping(s: { name: string; url: string }) {
  const t = Date.now();
  try {
    const r = await axios.get(s.url, { timeout: 2500, validateStatus: () => true });
    // Any answer means the process is alive; a 5xx means it is up but unhealthy.
    return { name: s.name, status: r.status >= 500 ? 'degraded' : 'up', latencyMs: Date.now() - t, httpStatus: r.status };
  } catch {
    return { name: s.name, status: 'down', latencyMs: null, httpStatus: null };
  }
}

router.get('/system', wrap(async (_req, res) => {
  const data = await cached('system', 10000, async () => {
    const d1 = new Date(Date.now() - DAY), d7 = new Date(Date.now() - 7 * DAY);
    const t0 = Date.now();
    const [services, dbOk, dbSize, tables, logins, byAction, perDay, locked, admins] = await Promise.all([
      Promise.all(SERVICES.map(ping)),
      soft(prisma.$queryRaw`SELECT 1`.then(() => Date.now() - t0), null),
      soft(q<{ size: number }>(Prisma.sql`SELECT pg_database_size(current_database())::float8 AS size`), []),
      soft(q<{ name: string; rows: number }>(Prisma.sql`SELECT relname AS name, n_live_tup::int AS rows FROM pg_stat_user_tables WHERE relname <> '_prisma_migrations' ORDER BY n_live_tup DESC LIMIT 12`), []),
      prisma.auditLog.groupBy({ by: ['action'], where: { action: { in: ['admin.login', 'admin.login_failed', 'admin.login_blocked'] }, createdAt: { gte: d1 } }, _count: { _all: true } }),
      q<{ action: string; n: number }>(Prisma.sql`SELECT action, count(*)::int AS n FROM "AuditLog" WHERE "createdAt" >= ${d7}::timestamp AND action NOT LIKE 'admin.login%' AND action <> 'admin.logout' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      daily('AuditLog', Prisma.sql`true`, 14),
      prisma.user.count({ where: { role: 'ADMIN', lockedUntil: { gt: new Date() } } }),
      prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true, adminLevel: true, status: true, lastLoginAt: true, passwordChangedAt: true, mustChangePassword: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    const n = (a: string) => logins.find((l) => l.action === a)?._count._all ?? 0;
    const mem = process.memoryUsage();
    return {
      services,
      database: { ok: dbOk !== null, latencyMs: dbOk, sizeBytes: dbSize[0]?.size ?? null, tables },
      process: { uptimeSeconds: Math.round(process.uptime()), rssMb: Math.round(mem.rss / 1048576), heapMb: Math.round(mem.heapUsed / 1048576), node: process.version },
      security: { logins24: n('admin.login'), failed24: n('admin.login_failed'), blocked24: n('admin.login_blocked'), lockedAdmins: locked, admins },
      auditByAction: byAction, auditPerDay: perDay,
    };
  });
  res.json({ success: true, data });
}));

export default router;
