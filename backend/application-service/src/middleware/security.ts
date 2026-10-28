import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const handler = (_req: Request, res: Response) => {
  res.status(429).json({ success: false, message: 'Too many requests. Please slow down and try again shortly.' });
};

const base = { standardHeaders: true, legacyHeaders: false, handler } as const;

/** Every request, per IP. */
export const generalLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 600 });

/** Applying to jobs: per signed-in user (falls back to IP). */
export const applyLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req: Request) => (req as any).user?.userId || req.ip || 'unknown',
});

/** Company actions that send email or run scoring. */
export const heavyActionLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req: Request) => (req as any).user?.userId || req.ip || 'unknown',
});

/** Last middleware: turns upload / parse errors into clean JSON instead of a stack trace. */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err?.code === 'LIMIT_FILE_SIZE') { res.status(413).json({ success: false, message: 'CV must be under 5 MB.' }); return; }
  if (err?.name === 'MulterError') { res.status(400).json({ success: false, message: 'Invalid upload.' }); return; }
  if (err?.type === 'entity.parse.failed') { res.status(400).json({ success: false, message: 'Malformed JSON body.' }); return; }
  if (err?.type === 'entity.too.large') { res.status(413).json({ success: false, message: 'Request body too large.' }); return; }
  if (err?.message === 'Only PDF and Word files allowed') { res.status(400).json({ success: false, message: err.message }); return; }
  console.error('[application-service]', err);
  res.status(500).json({ success: false, message: 'Server error' });
}
