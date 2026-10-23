import rateLimit from 'express-rate-limit';
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

// General API limiter — 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// Auth limiter — 10 attempts per 15 minutes (brute force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Only count failed attempts
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