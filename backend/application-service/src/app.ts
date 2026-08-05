import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

import applicationRoutes from './routes/application.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import candidatesRoutes from './routes/candidates.routes';
import analyticsRoutes from './routes/analytics.routes';
import calendarRoutes from './routes/calendar.routes';
import jobApplicantsRoutes from './routes/jobApplicants.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware configuration
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Serve uploaded CV files as static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'application-service' });
});

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
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Application service running on http://localhost:${PORT}`);
});

export default app;