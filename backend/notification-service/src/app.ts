import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import { emailService } from './emailService';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(express.json({ limit: '10kb' }));

// Internal key middleware — only services can call this
app.use((req, res, next) => {
  const key = req.headers['x-service-key'];
  if (key !== process.env.INTERNAL_SERVICE_KEY) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
});

app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'notification-service' })
);

app.post('/send/verification', async (req, res) => {
  const { to, name, code } = req.body;
  await emailService.sendVerificationCode(to, name, code);
  res.json({ success: true });
});

app.post('/send/password-reset', async (req, res) => {
  const { to, name, resetLink } = req.body;
  await emailService.sendPasswordReset(to, name, resetLink);
  res.json({ success: true });
});

app.post('/send/interview-invite', async (req, res) => {
  const { to, seekerName, jobTitle, companyName, date, time, venue } = req.body;
  await emailService.sendInterviewInvite(to, seekerName, jobTitle, companyName, date, time, venue);
  res.json({ success: true });
});

app.post('/send/rejection', async (req, res) => {
  const { to, seekerName, jobTitle, companyName, reason, aiMessage } = req.body;
  await emailService.sendRejectionNotice(to, seekerName, jobTitle, companyName, reason, aiMessage);
  res.json({ success: true });
});

app.post('/send/application-received', async (req, res) => {
  const { to, companyName, seekerName, jobTitle } = req.body;
  await emailService.sendApplicationReceived(to, companyName, seekerName, jobTitle);
  res.json({ success: true });
});

app.listen(PORT, () =>
  console.log(`Notification service running on port ${PORT}`)
);