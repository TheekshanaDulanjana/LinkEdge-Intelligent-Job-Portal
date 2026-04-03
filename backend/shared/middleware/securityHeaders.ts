import helmet from 'helmet';
import { RequestHandler } from 'express';

// Production-grade security headers
export function securityHeaders(): RequestHandler[] {
  return [
    helmet({
      // Prevent browsers from sniffing MIME types
      xContentTypeOptions: true,

      // Prevent clickjacking
      frameguard: { action: 'deny' },

      // Enable browser XSS filter
      xssFilter: true,

      // Control referrer information
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // HTTP Strict Transport Security — force HTTPS
      hsts: {
        maxAge: 31536000,       // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // Disable X-Powered-By (don't reveal Express)
      hidePoweredBy: true,
    }),

    // Additional header to disable DNS prefetching
    (req, res, next) => {
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      next();
    },
  ];
}