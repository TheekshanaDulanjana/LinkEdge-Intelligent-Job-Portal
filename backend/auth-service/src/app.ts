import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { validateEnv, authEnvSchema } from '../../shared/config/envValidator';
import { securityHeaders } from '../../shared/middleware/securityHeaders';
import { requestIdMiddleware, httpLogger } from '../../shared/logger/logger';
import { globalErrorHandler } from '../../shared/middleware/errorHandler';
import { generalLimiter, authLimiter } from '../../shared/security/rateLimiter';
import authRoutes from './routes/auth.routes';

// Validate all env vars before anything else runs
const env = validateEnv(authEnvSchema);

const app = express();

// ── Security headers (must come first) ──
app.use(securityHeaders());

// ── Request tracking ──
app.use(requestIdMiddleware);
app.use(httpLogger('auth-service'));

// ── CORS — locked to specific origins only ──
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (health checks, same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// ── Body parsing — limit size to prevent large payload attacks ──
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Global rate limiter ──
app.use(generalLimiter);

// ── Health check (no auth, no rate limit) ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ──
// Apply strict auth rate limiter only to auth endpoints
app.use('/api/v1/auth', authLimiter, authRoutes);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestId: req.headers['x-request-id'],
  });
});

// ── Global error handler (must be last) ──
app.use(globalErrorHandler('auth-service'));

const PORT = parseInt(env.PORT);
app.listen(PORT, () => {
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