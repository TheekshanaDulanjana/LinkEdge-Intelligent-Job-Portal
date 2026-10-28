import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

export const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

// Letters (any language), digits, spaces and common job-title punctuation. No < > { } $ ^ ~ ` | etc.
const TITLE_CHARS = /^[\p{L}\p{M}\p{N} &/+#.,()'’\-–]+$/u;

export const text = (min: number, max: number, label: string) =>
  z.string({ message: `${label} is required` })
    .transform(clean)
    .pipe(z.string()
      .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
      .max(max, `${label} must be at most ${max} characters`));

export const title = (min: number, max: number, label: string) =>
  text(min, max, label).pipe(
    z.string()
      .regex(TITLE_CHARS, `${label} contains characters that are not allowed`)
      .regex(/\p{L}/u, `${label} must contain letters`)
  );

const cleanList = (maxItems: number, maxLen: number, label: string) =>
  z.array(z.string(), { message: `${label} must be a list` })
    .max(maxItems, `At most ${maxItems} ${label.toLowerCase()} allowed`)
    .transform((arr) => arr.map(clean).filter(Boolean))
    .pipe(z.array(z.string().max(maxLen, `Each item in ${label.toLowerCase()} must be at most ${maxLen} characters`)).max(maxItems));

const skillItem = z.string().transform(clean).pipe(
  z.string().min(1).max(40, 'A skill must be at most 40 characters').regex(/^[\p{L}\p{M}\p{N} .+#/&'\-()]+$/u, 'Skills can only contain letters, numbers and . + # / & - ( )')
);

const salary = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.union([z.number(), z.string().regex(/^\d+$/, 'Salary must be a whole number')]).transform(Number)
    .pipe(z.number().int('Salary must be a whole number').min(0, 'Salary cannot be negative').max(100_000_000, 'Salary is too large')).optional()
);

export const EXPERIENCE_LEVELS = ['Entry Level', 'Mid Level', 'Senior Level'] as const;

export const jobSchema = z.object({
  title: title(3, 100, 'Job title'),
  department: title(2, 60, 'Department').optional(),
  description: text(20, 10000, 'Description'),
  requirements: z.string().transform(clean).pipe(z.string().max(10000)).optional(),
  requirementsList: cleanList(30, 300, 'Requirements').optional(),
  responsibilities: cleanList(30, 300, 'Responsibilities').optional(),
  skills: z.array(skillItem, { message: 'Skills must be a list' }).max(30, 'At most 30 skills allowed').optional(),
  location: title(2, 100, 'Location'),
  locationType: z.enum(['REMOTE', 'ON_SITE', 'HYBRID'], { message: 'Invalid location type' }).optional(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'], { message: 'Invalid job type' }),
  experienceLevel: z.enum(EXPERIENCE_LEVELS, { message: 'Invalid experience level' }).optional(),
  salaryMin: salary,
  salaryMax: salary,
  deadline: z.string({ message: 'Deadline is required' }).refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid deadline date'),
  status: z.enum(['ACTIVE', 'DRAFT'], { message: 'Status must be ACTIVE or DRAFT' }).optional(),
  autoScreen: z.boolean({ message: 'autoScreen must be true or false' }).optional(),
  minMatchScore: z.number({ message: 'Minimum match must be a number' }).int('Minimum match must be a whole number').min(0).max(90, 'Minimum match cannot be above 90').optional(),
}).superRefine((v, ctx) => {
  if (v.salaryMin != null && v.salaryMax != null && v.salaryMin > v.salaryMax) {
    ctx.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Maximum salary must be at least the minimum' });
  }
  const d = new Date(v.deadline);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  if (d.getTime() < startToday.getTime()) ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline cannot be in the past' });
  if (d.getTime() > Date.now() + 2 * 366 * 24 * 3600 * 1000) ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline is too far ahead (max 2 years)' });
  if (!(v.requirementsList?.length) && !(v.requirements && v.requirements.length >= 5)) {
    ctx.addIssue({ code: 'custom', path: ['requirementsList'], message: 'Add at least one requirement so candidates can be matched' });
  }
});

export const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED'], { message: 'Invalid status value' }),
});

export const screeningSchema = z.object({
  autoScreen: z.boolean({ message: 'autoScreen must be true or false' }),
  minMatchScore: z.number({ message: 'Minimum match must be a number' }).int('Minimum match must be a whole number').min(0, 'Minimum match cannot be negative').max(90, 'Minimum match cannot be above 90'),
});

export function validateBody<T extends ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body ?? {});
    if (!r.success) {
      res.status(400).json({
        success: false,
        message: r.error.issues[0]?.message || 'Validation failed',
        errors: r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
      return;
    }
    req.body = r.data;
    next();
  };
}

export const isUuid = (v: unknown): v is string => typeof v === 'string' && z.string().uuid().safeParse(v).success;

export function validateParams(...names: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const n of names) {
      if (!isUuid(req.params[n])) { res.status(400).json({ success: false, message: `Invalid ${n}` }); return; }
    }
    next();
  };
}

export function paging(q: any, defLimit = 10, maxLimit = 50) {
  const page = Math.max(1, Math.min(100000, parseInt(String(q.page ?? '1'), 10) || 1));
  const limit = Math.max(1, Math.min(maxLimit, parseInt(String(q.limit ?? defLimit), 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Free-text search term: trimmed, control chars removed, max 100 chars. */
export const searchTerm = (v: unknown) => (typeof v === 'string' ? clean(v).slice(0, 100) : '');
