import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import { UPLOAD_DIR } from './config';
import { generalLimiter, errorHandler } from './middleware/security';
import applicationRoutes from './routes/application.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import candidatesRoutes from './routes/candidates.routes';
import analyticsRoutes from './routes/analytics.routes';
import calendarRoutes from './routes/calendar.routes';
import jobApplicantsRoutes from './routes/jobApplicants.routes';

const app = express();
const PORT = process.env.PORT || 3003;

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// Security headers; CVs/images are opened from the frontend origin
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error(`CORS: origin ${origin} not allowed`))),
  credentials: true,
}));

// Small JSON bodies only; CV uploads are multipart and capped by multer (5 MB)
app.use(express.json({ limit: '50kb' }));
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'application-service' });
});

// Uploaded CVs (opened by companies from the applicants list)
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny' }));

// Route registrations
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/applications', candidatesRoutes);
app.use('/api/v1/applications', analyticsRoutes);
app.use('/api/v1/applications', calendarRoutes);
app.use('/api/v1/applications', jobApplicantsRoutes);

// Dashboard routes mounted under /api/v1/applications/company
app.use('/api/v1/applications/company', dashboardRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Application service running on http://localhost:${PORT}`);
});

export default app;
