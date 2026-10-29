import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import resumeRoutes from './routes/resume.routes';
import candidateRoutes from './routes/candidate.routes';

dotenv.config();

import { validateEnv, authEnvSchema } from '../../shared/config/envValidator';
import { securityHeaders } from '../../shared/middleware/securityHeaders';
import { requestIdMiddleware, httpLogger } from '../../shared/logger/logger';
import { globalErrorHandler } from '../../shared/middleware/errorHandler';
import { generalLimiter, authLimiter } from '../../shared/security/rateLimiter';
import authRoutes from './routes/auth.routes';
import contentRoutes from './routes/content.routes';
import adminRoutes from './admin/admin.routes';
import { seedContent } from './admin/content';
import { ensureOwnerAccount } from './admin/bootstrap';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { absolutizeStoredUrls } from './services/storage.service';

const env = validateEnv(authEnvSchema);
const app = express();

// -- Security headers --
app.use(securityHeaders());

// -- Request tracking --
app.use(requestIdMiddleware);
app.use(httpLogger('auth-service'));

// -- CORS --
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// -- Static Files --
// Serves uploaded images from the uploads directory
// Files get unique names, so they can be cached for a year. The cross-origin header lets the
// frontend (another port/domain) display them; helmet blocks that by default.
// CVs are private: only the owner and companies (through authenticated endpoints) may read them.
app.use('/uploads/resumes', (_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '365d', immutable: true, index: false }));

// -- Admin back-office --
// Mounted before the global 10kb body parser: content blocks (FAQ, testimonials) are larger than that.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => { res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' }); },
});
app.use('/api/v1/admin', adminLimiter, express.json({ limit: '256kb' }), adminRoutes);

// -- Body parsing --
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// -- Global rate limiter --
app.use(generalLimiter);

// -- Health check --
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// -- Routes --
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/auth/resume', resumeRoutes);
app.use('/api/v1/auth/candidate', candidateRoutes);
// -- 404 handler --
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestId: req.headers['x-request-id'],
  });
});

// -- Global error handler --
app.use(globalErrorHandler('auth-service'));

const PORT = parseInt(env.PORT);
app.listen(PORT, () => {
  // Old rows stored relative paths (/uploads/...). Make them full URLs once.
  absolutizeStoredUrls(new PrismaClient()).catch(() => undefined);
  // Make sure the editable site content exists and that there is an owner admin to sign in with.
  seedContent().catch((e) => console.error('Content seeding failed:', e?.message));
  ensureOwnerAccount().catch((e) => console.error('Owner admin bootstrap failed:', e?.message));
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'auth-service',
      message: `Service started`,
      port: PORT,
      env: env.NODE_ENV,
    })
  );
});

export default app;