import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

// Standard response when rate limit is exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
    retryAfter: Math.ceil(
      parseInt(res.getHeader('Retry-After') as string) / 60
    ),
  });
};

// General API limiter — 300 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // keyGenerator: (req) => {
  //   // Trust proxy headers for real IP
  //   return (
  //     (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
  //     req.ip ||
  //     'unknown'
  //   );
  // },
});

// Login limiter — 5 failed sign-ins per email and IP, then the login is blocked for 30 minutes.
// Successful logins are not counted, so a correct password always works until the block starts.
const LOGIN_LOCK_MINUTES = 30;
export const loginLimiter = rateLimit({
  windowMs: LOGIN_LOCK_MINUTES * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts (HTTP 4xx/5xx) count
  keyGenerator: (req: Request) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    return `${ipKeyGenerator(req.ip || '')}|${email}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      code: 'LOGIN_LOCKED',
      message: `Too many failed login attempts. Please try again in ${LOGIN_LOCK_MINUTES} minutes.`,
      retryAfter: LOGIN_LOCK_MINUTES,
    });
  },
});

// Auth limiter — protects register, verification and password-reset routes from abuse.
// Login has its own limiter above; session checks and token renewal are never limited here.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true,
  skip: (req: Request) => ['/login', '/me', '/refresh-token'].includes(req.path),
});

// AI service limiter — 20 requests per hour (expensive operations)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// File upload limiter — 10 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});