import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

/** Remove control characters (keeps \n and \t) and trim. */
export const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export const text = (min: number, max: number, label: string) =>
  z.string({ message: `${label} is required` })
    .transform(clean)
    .pipe(
      z.string()
        .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`)
    );

export const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && clean(v) === '' ? undefined : v),
    z.string().transform(clean).pipe(z.string().max(max, `${label} must be at most ${max} characters`)).optional()
  );

export const uuid = z.string().uuid('Invalid id');

export const isUuid = (v: unknown): v is string => typeof v === 'string' && z.string().uuid().safeParse(v).success;

const realDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

export const dateString = z.string({ message: 'Date is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(realDate, 'Not a valid date');

export const timeString = z.string({ message: 'Time is required' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');

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

/** Rejects a malformed :id / :jobId before it reaches the database. */
export function validateParams(...names: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const n of names) {
      if (!isUuid(req.params[n])) {
        res.status(400).json({ success: false, message: `Invalid ${n}` });
        return;
      }
    }
    next();
  };
}

/** Safe page/limit parsing. */
export function paging(q: any, defLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Math.min(100000, parseInt(String(q.page ?? '1'), 10) || 1));
  const limit = Math.max(1, Math.min(maxLimit, parseInt(String(q.limit ?? defLimit), 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// ── Schemas ────────────────────────────────────────────────────────────────
export const applySchema = z.object({
  jobId: uuid,
  coverLetter: optionalText(3000, 'Cover letter'),
});

export const scheduleInterviewSchema = z.object({
  interviewDate: dateString,
  interviewTime: timeString,
  interviewVenue: optionalText(200, 'Venue'),
}).superRefine((v, ctx) => {
  const at = new Date(`${v.interviewDate}T${v.interviewTime}:00`);
  const now = Date.now();
  if (at.getTime() < now - 5 * 60 * 1000) ctx.addIssue({ code: 'custom', path: ['interviewDate'], message: 'Interview must be in the future' });
  if (at.getTime() > now + 366 * 24 * 3600 * 1000) ctx.addIssue({ code: 'custom', path: ['interviewDate'], message: 'Interview date is too far ahead (max 1 year)' });
});

export const rejectSchema = z.object({
  reasonTitle: text(3, 200, 'Rejection reason'),
});

export const statusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'], { message: 'Invalid status' }),
});

const isoDateTime = z.string({ message: 'Date/time is required' }).refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid date/time');

const calendarFields = {
  title: text(1, 120, 'Title'),
  description: optionalText(1000, 'Description'),
  eventType: z.enum(['INTERVIEW', 'MEETING', 'DEADLINE', 'REMINDER'], { message: 'Invalid event type' }).optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  location: optionalText(200, 'Location'),
  color: z.string().regex(/^[a-z]{3,20}$/, 'Invalid color').optional(),
};

const endAfterStart = (v: { startTime?: string; endTime?: string }, ctx: z.RefinementCtx) => {
  if (v.startTime && v.endTime) {
    const s = new Date(v.startTime).getTime();
    const e = new Date(v.endTime).getTime();
    if (e < s) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End must be after start' });
    if (e - s > 14 * 24 * 3600 * 1000) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'An event cannot be longer than 14 days' });
  }
};

export const calendarCreateSchema = z.object(calendarFields).superRefine(endAfterStart);
export const calendarUpdateSchema = z.object({
  title: calendarFields.title.optional(),
  description: calendarFields.description,
  eventType: calendarFields.eventType,
  startTime: calendarFields.startTime.optional(),
  endTime: calendarFields.endTime.optional(),
  location: calendarFields.location,
  color: calendarFields.color,
}).superRefine(endAfterStart);

export const rescheduleSchema = z.object({
  interviewDate: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid date'),
  interviewTime: timeString.optional(),
});
