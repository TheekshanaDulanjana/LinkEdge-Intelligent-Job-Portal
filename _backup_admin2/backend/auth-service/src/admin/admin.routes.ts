import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { adminAuth, requirePasswordChanged, requireOwner } from './adminAuth';
import { audit } from './audit';
import { sendAdminNotice, FRONTEND_URL } from './mailer';
import { adminPassword, generatePassword } from './password';
import { CONTENT_BLOCKS, CONTENT_KEYS, DEFAULTS, isContentKey } from './content';
import { authService } from '../services/auth.service';
import { purgeUser } from '../services/accountPurge';
import { saveImage, MAX_IMAGE_BYTES } from '../services/storage.service';
import { loginLimiter } from '../../../shared/security/rateLimiter';
import { createLogger } from '../../../shared/logger/logger';

const logger = createLogger('auth-service');
const router = Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const MAX_FAILED = 5;
const LOCK_MINUTES = 30;
const DUMMY_HASH = '$2a$12$LCKShjkKqpDHzIJANhlyXuPzRm3VPz4c5Jib5tMjFiMjNAhXxTqnO';

// ─── helpers ────────────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch((e) => {
    if (e instanceof HttpError) { res.status(e.status).json({ success: false, code: e.code, message: e.message }); return; }
    if (e instanceof z.ZodError) { res.status(400).json({ success: false, message: e.issues[0]?.message || 'Validation failed' }); return; }
    next(e);
  });
};

const parse = <T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> => {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    const where = i.path.length ? `${i.path.join('.')}: ` : '';
    throw new HttpError(400, `${where}${i.message}`, 'VALIDATION');
  }
  return r.data;
};

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const reasonSchema = z.string({ message: 'A reason is required' })
  .transform((s) => s.replace(CTRL, '').trim())
  .pipe(z.string().min(10, 'Please give a reason of at least 10 characters').max(500, 'Reason must be at most 500 characters'));
const optionalReason = z.string().transform((s) => s.replace(CTRL, '').trim()).pipe(z.string().max(500)).optional();
const uuid = z.string().uuid('Invalid id');
const pageParams = (q: any, defLimit = 20) => {
  const page = Math.max(1, parseInt(String(q.page ?? '1')) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit ?? defLimit)) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
};
const search = (q: any) => (typeof q === 'string' ? q.replace(CTRL, '').trim().slice(0, 100) : '');
const idParam = (req: Request) => parse(uuid, req.params.id);

/** Stable JSON text (sorted keys): Postgres jsonb does not keep key order. */
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));

const displayName = (u: { email: string; seeker?: { fullName: string } | null; company?: { companyName: string } | null }) =>
  u.seeker?.fullName || u.company?.companyName || u.email;

// ─── public: sign in ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.string().email().max(254)),
  password: z.string().min(1).max(128),
});

router.post('/auth/login', loginLimiter, wrap(async (req, res) => {
  const generic = new HttpError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw generic;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const isAdmin = !!user && user.role === 'ADMIN';

  if (isAdmin && user!.lockedUntil && user!.lockedUntil > new Date()) {
    const mins = Math.ceil((user!.lockedUntil.getTime() - Date.now()) / 60000);
    await audit(req, 'admin.login_blocked', { actorEmail: email, targetType: 'USER', targetId: user!.id, targetLabel: email, reason: 'Account locked' });
    throw new HttpError(429, `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, 'LOGIN_LOCKED');
  }

  // Always run bcrypt so the response time does not reveal whether the account exists.
  const ok = await bcrypt.compare(password, (isAdmin && user!.passwordHash) || DUMMY_HASH);
  if (!isAdmin || !ok) {
    if (isAdmin) {
      const failed = user!.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED;
      await prisma.user.update({
        where: { id: user!.id },
        data: { failedLoginCount: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null },
      });
      logger.security('Admin login failed', { userId: user!.id, locked: lock });
    }
    await audit(req, 'admin.login_failed', { actorEmail: email.slice(0, 100), targetType: 'USER', targetLabel: email.slice(0, 100) });
    throw generic;
  }
  if (user!.status !== 'ACTIVE') throw new HttpError(403, 'This administrator account is disabled.', 'ACCOUNT_DISABLED');

  await prisma.user.update({ where: { id: user!.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const tokens = authService.issueTokens({ userId: user!.id, email: user!.email, role: 'ADMIN' });
  await audit(req, 'admin.login', { actorEmail: user!.email, actorId: user!.id, targetType: 'USER', targetId: user!.id, targetLabel: user!.email });
  res.json({
    success: true,
    data: {
      ...tokens,
      user: { id: user!.id, email: user!.email, role: 'ADMIN', adminLevel: user!.adminLevel ?? 'ADMIN', mustChangePassword: user!.mustChangePassword },
    },
  });
}));

// ─── everything below needs a valid admin session ───────────────────────────

router.use(adminAuth);

router.get('/auth/me', wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.admin!.id } });
  res.json({
    success: true,
    data: { id: u!.id, email: u!.email, role: 'ADMIN', adminLevel: u!.adminLevel ?? 'ADMIN', mustChangePassword: u!.mustChangePassword, lastLoginAt: u!.lastLoginAt, createdAt: u!.createdAt },
  });
}));

const changePwSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: adminPassword,
});

router.post('/auth/change-password', wrap(async (req, res) => {
  const { currentPassword, newPassword } = parse(changePwSchema, req.body);
  const u = await prisma.user.findUnique({ where: { id: req.admin!.id } });
  if (!u?.passwordHash || !(await bcrypt.compare(currentPassword, u.passwordHash))) {
    await audit(req, 'admin.password_change_failed');
    throw new HttpError(400, 'Current password is incorrect.', 'INVALID_PASSWORD');
  }
  if (await bcrypt.compare(newPassword, u.passwordHash)) throw new HttpError(400, 'New password must be different from the current one.', 'SAME_PASSWORD');
  if (newPassword.toLowerCase().includes(u.email.split('@')[0].toLowerCase()) && u.email.split('@')[0].length >= 4) {
    throw new HttpError(400, 'Password must not contain your email name.', 'WEAK_PASSWORD');
  }
  const now = new Date();
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), mustChangePassword: false, passwordChangedAt: now },
  });
  await audit(req, 'admin.password_changed', { targetType: 'USER', targetId: u.id, targetLabel: u.email });
  // Old tokens stop working (passwordChangedAt); give this session a fresh one.
  const tokens = authService.issueTokens({ userId: u.id, email: u.email, role: 'ADMIN' });
  res.json({ success: true, data: { ...tokens, user: { id: u.id, email: u.email, role: 'ADMIN', adminLevel: u.adminLevel ?? 'ADMIN', mustChangePassword: false } } });
}));

router.post('/auth/logout', wrap(async (req, res) => {
  await audit(req, 'admin.logout');
  res.json({ success: true });
}));

router.use(requirePasswordChanged);

// ─── dashboard ──────────────────────────────────────────────────────────────

router.get('/dashboard', wrap(async (_req, res) => {
  const since7 = new Date(Date.now() - 7 * 86400000);
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [seekers, companies, disabled, unverified, newSeekers7, newCompanies7, jobGroups, applications, apps7, recentAudit, signups] = await Promise.all([
    prisma.user.count({ where: { role: 'SEEKER' } }),
    prisma.user.count({ where: { role: 'COMPANY' } }),
    prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, status: 'DISABLED' } }),
    prisma.user.count({ where: { role: { in: ['SEEKER', 'COMPANY'] }, isEmailVerified: false } }),
    prisma.user.count({ where: { role: 'SEEKER', createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { role: 'COMPANY', createdAt: { gte: since7 } } }),
    prisma.jobPosting.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.application.count(),
    prisma.application.count({ where: { createdAt: { gte: since7 } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.$queryRaw<{ day: Date; role: string; n: number }[]>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS day, "role"::text AS role, count(*)::int AS n
      FROM "User" WHERE "createdAt" >= ${since30} AND "role" IN ('SEEKER','COMPANY')
      GROUP BY 1, 2 ORDER BY 1`),
  ]);
  const jobs: Record<string, number> = { ACTIVE: 0, INACTIVE: 0, CLOSED: 0, DRAFT: 0, HIDDEN: 0 };
  jobGroups.forEach((g) => { jobs[g.status] = g._count._all; });
  res.json({
    success: true,
    data: {
      users: { seekers, companies, disabled, unverified, newSeekers7, newCompanies7 },
      jobs: { ...jobs, total: Object.values(jobs).reduce((a, b) => a + b, 0) },
      applications: { total: applications, last7: apps7 },
      signups: signups.map((s) => ({ day: s.day, role: s.role, count: s.n })),
      recentAudit,
    },
  });
}));

// ─── users (job seekers + companies) ────────────────────────────────────────

const roleFilter = z.enum(['SEEKER', 'COMPANY']);

router.get('/users', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = search(req.query.q);
  const role = roleFilter.safeParse(req.query.role);
  const status = z.enum(['ACTIVE', 'DISABLED']).safeParse(req.query.status);
  const where: Prisma.UserWhereInput = {
    role: role.success ? role.data : { in: ['SEEKER', 'COMPANY'] },
    ...(status.success ? { status: status.data } : {}),
    ...(q ? { OR: [
      { email: { contains: q, mode: 'insensitive' } },
      { seeker: { fullName: { contains: q, mode: 'insensitive' } } },
      { company: { companyName: { contains: q, mode: 'insensitive' } } },
    ] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, role: true, status: true, isEmailVerified: true, authProvider: true, createdAt: true, lastLoginAt: true,
        seeker: { select: { fullName: true, profileImageUrl: true, location: true } },
        company: { select: { companyName: true, logoUrl: true, location: true, industry: true } },
      },
    }),
  ]);
  res.json({
    success: true,
    data: {
      total, page, totalPages: Math.max(1, Math.ceil(total / limit)),
      users: rows.map((u) => ({
        id: u.id, email: u.email, role: u.role, status: u.status, isEmailVerified: u.isEmailVerified, authProvider: u.authProvider,
        createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
        name: u.seeker?.fullName || u.company?.companyName || u.email,
        image: u.seeker?.profileImageUrl || u.company?.logoUrl || null,
        location: u.seeker?.location || u.company?.location || null,
        industry: u.company?.industry || null,
      })),
    },
  });
}));

router.get('/users/:id', wrap(async (req, res) => {
  const id = idParam(req);
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, role: true, status: true, statusReason: true, statusChangedAt: true, isEmailVerified: true,
      authProvider: true, createdAt: true, lastLoginAt: true, seeker: true, company: true,
    },
  });
  if (!u || u.role === 'ADMIN') throw new HttpError(404, 'User not found', 'NOT_FOUND');

  let stats: Record<string, unknown> = {};
  if (u.company) {
    const [jobGroups, applicationsReceived] = await Promise.all([
      prisma.jobPosting.groupBy({ by: ['status'], where: { companyId: u.company.id }, _count: { _all: true } }),
      prisma.application.count({ where: { job: { companyId: u.company.id } } }),
    ]);
    const jobs: Record<string, number> = {};
    jobGroups.forEach((g) => { jobs[g.status] = g._count._all; });
    stats = { jobs, applicationsReceived };
  } else if (u.seeker) {
    const [applications, resume] = await Promise.all([
      prisma.application.count({ where: { seekerId: u.seeker.id } }),
      prisma.candidateResume.findUnique({ where: { candidateId: u.id }, select: { originalName: true, isParsed: true, uploadedDate: true } }),
    ]);
    stats = { applications, resume };
  }
  const history = await prisma.auditLog.findMany({ where: { targetId: id }, orderBy: { createdAt: 'desc' }, take: 10 });
  res.json({ success: true, data: { ...u, stats, history } });
}));

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'DISABLED']), reason: reasonSchema });

router.patch('/users/:id/status', wrap(async (req, res) => {
  const id = idParam(req);
  const { status, reason } = parse(statusSchema, req.body);
  const u = await prisma.user.findUnique({ where: { id }, include: { seeker: true, company: true } });
  if (!u || u.role === 'ADMIN') throw new HttpError(404, 'User not found', 'NOT_FOUND');
  if (u.status === status) throw new HttpError(400, `Account is already ${status === 'ACTIVE' ? 'active' : 'disabled'}.`, 'NO_CHANGE');

  await prisma.user.update({
    where: { id },
    data: { status, statusReason: status === 'DISABLED' ? reason : null, statusChangedAt: new Date() },
  });
  const disabling = status === 'DISABLED';
  const emailSent = await sendAdminNotice({
    to: u.email, name: displayName(u),
    heading: disabling ? 'Your account has been disabled' : 'Your account has been re-enabled',
    message: disabling
      ? 'A SkillSync administrator has disabled your account. You will not be able to sign in until it is re-enabled.'
      : 'A SkillSync administrator has re-enabled your account. You can sign in again.',
    reason,
    ...(disabling ? {} : { ctaLabel: 'Sign in', ctaUrl: `${FRONTEND_URL}/login` }),
  });
  await audit(req, disabling ? 'user.disabled' : 'user.enabled', { targetType: u.role, targetId: id, targetLabel: `${displayName(u)} <${u.email}>`, reason, metadata: { emailSent } });
  res.json({ success: true, data: { status, emailSent } });
}));

const deleteUserSchema = z.object({ reason: reasonSchema, confirmEmail: z.string().min(1, 'Type the account email to confirm') });

router.delete('/users/:id', wrap(async (req, res) => {
  const id = idParam(req);
  const { reason, confirmEmail } = parse(deleteUserSchema, req.body);
  const u = await prisma.user.findUnique({ where: { id }, include: { seeker: true, company: true } });
  if (!u || u.role === 'ADMIN') throw new HttpError(404, 'User not found', 'NOT_FOUND');
  if (confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()) throw new HttpError(400, 'The confirmation email does not match this account.', 'CONFIRM_MISMATCH');

  const name = displayName(u);
  // The user must hear about it with the reason before the data disappears.
  const emailSent = await sendAdminNotice({
    to: u.email, name,
    heading: 'Your account has been deleted',
    message: 'A SkillSync administrator has permanently deleted your account and the data linked to it.',
    reason,
    footer: 'If you believe this was a mistake, please contact the SkillSync support team.',
  });
  await purgeUser(prisma, id);
  await audit(req, 'user.deleted', { targetType: u.role, targetId: id, targetLabel: `${name} <${u.email}>`, reason, metadata: { emailSent } });
  res.json({ success: true, data: { emailSent } });
}));

// ─── job moderation ─────────────────────────────────────────────────────────

const jobStatus = z.enum(['ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT', 'HIDDEN']);

async function companyOwners(companyIds: string[]) {
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, companyName: true, logoUrl: true, userId: true, user: { select: { email: true } } },
  });
  return new Map(companies.map((c) => [c.id, c]));
}

router.get('/jobs', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const q = search(req.query.q);
  const status = jobStatus.safeParse(req.query.status);
  let companyIds: string[] = [];
  if (q) {
    const cs = await prisma.company.findMany({ where: { companyName: { contains: q, mode: 'insensitive' } }, select: { id: true }, take: 100 });
    companyIds = cs.map((c) => c.id);
  }
  const where: Prisma.JobPostingWhereInput = {
    ...(status.success ? { status: status.data } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { companyId: { in: companyIds } }] } : {}),
  };
  const [total, jobs] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, location: true, jobType: true, deadline: true, createdAt: true, companyId: true,
        moderationReason: true, moderatedAt: true, _count: { select: { applications: true } },
      },
    }),
  ]);
  const owners = await companyOwners([...new Set(jobs.map((j) => j.companyId))]);
  res.json({
    success: true,
    data: {
      total, page, totalPages: Math.max(1, Math.ceil(total / limit)),
      jobs: jobs.map((j) => ({
        ...j, applicationCount: j._count.applications, _count: undefined,
        companyName: owners.get(j.companyId)?.companyName ?? 'Unknown company',
        companyLogo: owners.get(j.companyId)?.logoUrl ?? null,
        companyUserId: owners.get(j.companyId)?.userId ?? null,
      })),
    },
  });
}));

router.get('/jobs/:id', wrap(async (req, res) => {
  const job = await prisma.jobPosting.findUnique({ where: { id: idParam(req) }, include: { _count: { select: { applications: true } } } });
  if (!job) throw new HttpError(404, 'Job not found', 'NOT_FOUND');
  const company = (await companyOwners([job.companyId])).get(job.companyId) ?? null;
  const history = await prisma.auditLog.findMany({ where: { targetId: job.id }, orderBy: { createdAt: 'desc' }, take: 10 });
  res.json({ success: true, data: { ...job, applicationCount: job._count.applications, company, history } });
}));

async function notifyCompany(
  job: { id: string; title: string; companyId: string },
  action: 'JOB_HIDDEN' | 'JOB_RESTORED' | 'JOB_DELETED',
  reason: string,
) {
  const company = (await companyOwners([job.companyId])).get(job.companyId);
  if (!company) return { inApp: false, emailSent: false };
  const copy = {
    JOB_HIDDEN: { title: 'Job post hidden by admin', body: `Your job post "${job.title}" was hidden by the SkillSync admin team and is no longer visible to job seekers.` },
    JOB_RESTORED: { title: 'Job post restored', body: `Your job post "${job.title}" was reviewed and restored by the SkillSync admin team.` },
    JOB_DELETED: { title: 'Job post removed by admin', body: `Your job post "${job.title}" was removed by the SkillSync admin team.` },
  }[action];
  await prisma.notification.create({
    data: {
      receiverId: company.userId, type: 'SYSTEM', title: copy.title,
      message: `${copy.body} Reason: ${reason}`,
      metadata: { action, jobId: job.id, jobTitle: job.title, reason },
    },
  });
  const emailSent = await sendAdminNotice({
    to: company.user.email, name: company.companyName, heading: copy.title, message: copy.body, reason,
    ...(action === 'JOB_DELETED' ? {} : { ctaLabel: 'Open my jobs', ctaUrl: `${FRONTEND_URL}/company/jobs` }),
  });
  return { inApp: true, emailSent };
}

router.post('/jobs/:id/hide', wrap(async (req, res) => {
  const id = idParam(req);
  const { reason } = parse(z.object({ reason: reasonSchema }), req.body);
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job) throw new HttpError(404, 'Job not found', 'NOT_FOUND');
  if (job.status === 'HIDDEN') throw new HttpError(400, 'This job is already hidden.', 'NO_CHANGE');
  await prisma.jobPosting.update({
    where: { id },
    data: { status: 'HIDDEN', statusBeforeHide: job.status, moderationReason: reason, moderatedAt: new Date(), moderatedBy: req.admin!.id },
  });
  const sent = await notifyCompany(job, 'JOB_HIDDEN', reason);
  await audit(req, 'job.hidden', { targetType: 'JOB', targetId: id, targetLabel: job.title, reason, metadata: sent });
  res.json({ success: true, data: sent });
}));

router.post('/jobs/:id/restore', wrap(async (req, res) => {
  const id = idParam(req);
  const body = parse(z.object({ reason: optionalReason }), req.body ?? {});
  const reason = body.reason || 'Reviewed and approved by the admin team.';
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job) throw new HttpError(404, 'Job not found', 'NOT_FOUND');
  if (job.status !== 'HIDDEN') throw new HttpError(400, 'This job is not hidden.', 'NO_CHANGE');
  await prisma.jobPosting.update({
    where: { id },
    data: { status: job.statusBeforeHide ?? 'INACTIVE', statusBeforeHide: null, moderationReason: null, moderatedAt: null, moderatedBy: null },
  });
  const sent = await notifyCompany(job, 'JOB_RESTORED', reason);
  await audit(req, 'job.restored', { targetType: 'JOB', targetId: id, targetLabel: job.title, reason, metadata: sent });
  res.json({ success: true, data: sent });
}));

router.delete('/jobs/:id', wrap(async (req, res) => {
  const id = idParam(req);
  const { reason } = parse(z.object({ reason: reasonSchema }), req.body);
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job) throw new HttpError(404, 'Job not found', 'NOT_FOUND');
  const sent = await notifyCompany(job, 'JOB_DELETED', reason);
  await prisma.$transaction([
    prisma.application.deleteMany({ where: { jobId: id } }),
    prisma.jobPosting.delete({ where: { id } }),
  ]);
  await audit(req, 'job.deleted', { targetType: 'JOB', targetId: id, targetLabel: job.title, reason, metadata: sent });
  res.json({ success: true, data: sent });
}));

// ─── site content (CMS) ─────────────────────────────────────────────────────

const contentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

router.post('/content/upload-image', contentUpload.single('image'), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose an image to upload.', 'NO_FILE');
  try {
    const url = await saveImage(req.file.buffer, 'site');
    await audit(req, 'content.image_uploaded', { targetType: 'CONTENT', targetLabel: url });
    res.json({ success: true, data: { url } });
  } catch (e: any) {
    if (e?.status === 400) throw new HttpError(400, e.message, 'BAD_IMAGE');
    throw e;
  }
}));

router.get('/content', wrap(async (_req, res) => {
  const rows = await prisma.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  res.json({
    success: true,
    data: CONTENT_KEYS.map((key) => {
      const row = byKey.get(key);
      return {
        key, label: CONTENT_BLOCKS[key].label, description: CONTENT_BLOCKS[key].description,
        value: row?.value ?? DEFAULTS[key],
        isDefault: canonical(row?.value ?? DEFAULTS[key]) === canonical(DEFAULTS[key]),
        updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null,
      };
    }),
  });
}));

router.get('/content/:key', wrap(async (req, res) => {
  const key = req.params.key as string;
  if (!isContentKey(key)) throw new HttpError(404, 'Unknown content block', 'NOT_FOUND');
  const row = await prisma.siteContent.findUnique({ where: { key } });
  res.json({ success: true, data: { key, label: CONTENT_BLOCKS[key].label, value: row?.value ?? DEFAULTS[key], defaults: DEFAULTS[key], updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null } });
}));

router.put('/content/:key', wrap(async (req, res) => {
  const key = req.params.key as string;
  if (!isContentKey(key)) throw new HttpError(404, 'Unknown content block', 'NOT_FOUND');
  const value = parse(CONTENT_BLOCKS[key].schema, req.body?.value);
  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value: value as any, updatedBy: req.admin!.email },
    update: { value: value as any, updatedBy: req.admin!.email },
  });
  await audit(req, 'content.updated', { targetType: 'CONTENT', targetId: key, targetLabel: CONTENT_BLOCKS[key].label });
  res.json({ success: true, data: { key, value } });
}));

router.post('/content/:key/reset', wrap(async (req, res) => {
  const key = req.params.key as string;
  if (!isContentKey(key)) throw new HttpError(404, 'Unknown content block', 'NOT_FOUND');
  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value: DEFAULTS[key] as any, updatedBy: req.admin!.email },
    update: { value: DEFAULTS[key] as any, updatedBy: req.admin!.email },
  });
  await audit(req, 'content.reset', { targetType: 'CONTENT', targetId: key, targetLabel: CONTENT_BLOCKS[key].label });
  res.json({ success: true, data: { key, value: DEFAULTS[key] } });
}));

// ─── audit log ──────────────────────────────────────────────────────────────

router.get('/audit', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 25);
  const q = search(req.query.q);
  const action = typeof req.query.action === 'string' ? req.query.action.slice(0, 60) : '';
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(q ? { OR: [
      { actorEmail: { contains: q, mode: 'insensitive' } },
      { targetLabel: { contains: q, mode: 'insensitive' } },
      { reason: { contains: q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [total, logs, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
  ]);
  res.json({ success: true, data: { total, page, totalPages: Math.max(1, Math.ceil(total / limit)), logs, actions: actions.map((a) => a.action) } });
}));

// ─── administrators (owner only) ────────────────────────────────────────────

router.get('/admins', requireOwner, wrap(async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, adminLevel: true, status: true, statusReason: true, lastLoginAt: true, createdAt: true, mustChangePassword: true },
  });
  res.json({ success: true, data: admins });
}));

router.post('/admins', requireOwner, wrap(async (req, res) => {
  const { email, name } = parse(z.object({
    email: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.string().email('Enter a valid email').max(254)),
    name: z.string().transform((s) => s.replace(CTRL, '').trim()).pipe(z.string().min(2, 'Name is required').max(80)),
  }), req.body);
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'That email is already registered.', 'EMAIL_TAKEN');
  const password = generatePassword(20);
  const admin = await prisma.user.create({
    data: {
      email, role: 'ADMIN', adminLevel: 'ADMIN', isEmailVerified: true, mustChangePassword: true, passwordChangedAt: new Date(),
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    },
  });
  const emailSent = await sendAdminNotice({
    to: email, name, heading: 'Your SkillSync admin account',
    message: `An administrator account was created for you.\n\nEmail: ${email}\nTemporary password: ${password}\n\nYou must change this password when you sign in for the first time.`,
    ctaLabel: 'Open admin sign-in', ctaUrl: `${FRONTEND_URL}/admin/login`,
    footer: 'Never share this password. Delete this email after you have changed it.',
  });
  if (!emailSent) {
    // The password was never delivered, so the account would be unusable and unrecoverable by the invitee.
    await prisma.user.delete({ where: { id: admin.id } });
    throw new HttpError(502, 'The invitation email could not be sent, so the admin was not created. Check the email service and try again.', 'EMAIL_FAILED');
  }
  await audit(req, 'admin.created', { targetType: 'ADMIN', targetId: admin.id, targetLabel: email });
  res.status(201).json({ success: true, data: { id: admin.id, email } });
}));

async function targetAdmin(req: Request) {
  const t = await prisma.user.findUnique({ where: { id: idParam(req) } });
  if (!t || t.role !== 'ADMIN') throw new HttpError(404, 'Admin not found', 'NOT_FOUND');
  if (t.id === req.admin!.id) throw new HttpError(400, 'You cannot do this to your own account.', 'SELF_ACTION');
  if (t.adminLevel === 'OWNER') throw new HttpError(403, 'The owner account cannot be changed.', 'OWNER_PROTECTED');
  return t;
}

router.patch('/admins/:id/status', requireOwner, wrap(async (req, res) => {
  const t = await targetAdmin(req);
  const { status, reason } = parse(statusSchema, req.body);
  await prisma.user.update({ where: { id: t.id }, data: { status, statusReason: status === 'DISABLED' ? reason : null, statusChangedAt: new Date() } });
  await audit(req, status === 'DISABLED' ? 'admin.disabled' : 'admin.enabled', { targetType: 'ADMIN', targetId: t.id, targetLabel: t.email, reason });
  res.json({ success: true });
}));

router.post('/admins/:id/reset-password', requireOwner, wrap(async (req, res) => {
  const t = await targetAdmin(req);
  const password = generatePassword(20);
  await prisma.user.update({
    where: { id: t.id },
    data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), mustChangePassword: true, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });
  const emailSent = await sendAdminNotice({
    to: t.email, name: t.email.split('@')[0], heading: 'Your admin password was reset',
    message: `The owner reset your admin password.\n\nTemporary password: ${password}\n\nYou must change it when you sign in.`,
    ctaLabel: 'Open admin sign-in', ctaUrl: `${FRONTEND_URL}/admin/login`,
  });
  await audit(req, 'admin.password_reset', { targetType: 'ADMIN', targetId: t.id, targetLabel: t.email, metadata: { emailSent } });
  if (!emailSent) throw new HttpError(502, 'Password was reset but the email could not be sent. Reset it again once email works.', 'EMAIL_FAILED');
  res.json({ success: true });
}));

export default router;
