import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import { emailService } from './emailService';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : false }));
app.use(express.json({ limit: '20kb' }));

// Internal key middleware - only services can call this
app.use((req, res, next) => {
  const key = req.headers['x-service-key'];
  if (!process.env.INTERNAL_SERVICE_KEY || key !== process.env.INTERNAL_SERVICE_KEY) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
});

// ── Input hygiene: every value that reaches an email is checked, length-limited and HTML-escaped ──
class BadInput extends Error {}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Required text: control characters removed, line breaks collapsed (no header injection), HTML-escaped. */
function text(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') throw new BadInput(`${field} is required`);
  const s = v.replace(CONTROL, '').replace(/[\r\n]+/g, ' ').trim();
  if (!s) throw new BadInput(`${field} is required`);
  if (s.length > max) throw new BadInput(`${field} must be at most ${max} characters`);
  return escapeHtml(s);
}

/** Long free text (e.g. rejection explanation): keeps paragraphs, still escaped. */
function longText(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') return '';
  const s = v.replace(CONTROL, '').trim();
  if (s.length > max) throw new BadInput(`${field} must be at most ${max} characters`);
  return escapeHtml(s);
}

function emailAddress(v: unknown): string {
  if (typeof v !== 'string') throw new BadInput('Recipient email is required');
  const s = v.trim().toLowerCase();
  if (s.length > 254 || !/^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/.test(s)) throw new BadInput('Recipient email is invalid');
  return s;
}

function httpUrl(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length > 2000) throw new BadInput(`${field} is invalid`);
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    return escapeHtml(u.toString());
  } catch {
    throw new BadInput(`${field} must be a valid http(s) link`);
  }
}

const handler = (fn: (body: any) => Promise<void>) => async (req: Request, res: Response) => {
  try {
    await fn(req.body ?? {});
    res.json({ success: true });
  } catch (e: any) {
    if (e instanceof BadInput) { res.status(400).json({ success: false, message: e.message }); return; }
    console.error('[notification-service] send failed:', e?.message);
    res.status(502).json({ success: false, message: 'Email could not be sent' });
  }
};

app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'notification-service' })
);

app.post('/send/verification', handler(async (b) => {
  const code = String(b.code ?? '');
  if (!/^\d{6}$/.test(code)) throw new BadInput('Verification code must be 6 digits');
  await emailService.sendVerificationCode(emailAddress(b.to), text(b.name, 'name', 80), code);
}));

app.post('/send/password-reset', handler(async (b) => {
  await emailService.sendPasswordReset(emailAddress(b.to), text(b.name, 'name', 80), httpUrl(b.resetLink, 'resetLink'));
}));

app.post('/send/interview-invite', handler(async (b) => {
  await emailService.sendInterviewInvite(
    emailAddress(b.to), text(b.seekerName, 'seekerName', 80), text(b.jobTitle, 'jobTitle', 100),
    text(b.companyName, 'companyName', 100), text(b.date, 'date', 60), text(b.time, 'time', 20), text(b.venue, 'venue', 200)
  );
}));

app.post('/send/shortlisted', handler(async (b) => {
  await emailService.sendShortlisted(emailAddress(b.to), text(b.seekerName, 'seekerName', 80), text(b.jobTitle, 'jobTitle', 100), text(b.companyName, 'companyName', 100));
}));

app.post('/send/rejection', handler(async (b) => {
  await emailService.sendRejectionNotice(
    emailAddress(b.to), text(b.seekerName, 'seekerName', 80), text(b.jobTitle, 'jobTitle', 100),
    text(b.companyName, 'companyName', 100), text(b.reason, 'reason', 200), longText(b.aiMessage, 'aiMessage', 3000)
  );
}));

app.post('/send/application-received', handler(async (b) => {
  await emailService.sendApplicationReceived(emailAddress(b.to), text(b.companyName, 'companyName', 100), text(b.seekerName, 'seekerName', 80), text(b.jobTitle, 'jobTitle', 100));
}));

// Where replies to admin notices should land: SUPPORT_EMAIL, otherwise the address the mail is sent from.
function supportAddress(): string {
  const raw = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || '';
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim();
}

app.post('/send/admin-notice', handler(async (b) => {
  const ctaUrl = b.ctaUrl ? httpUrl(b.ctaUrl, 'ctaUrl') : undefined;
  await emailService.sendAdminNotice(emailAddress(b.to), {
    name: text(b.name, 'name', 100),
    heading: text(b.heading, 'heading', 120),
    message: longText(b.message, 'message', 2000),
    reason: longText(b.reason, 'reason', 1000),
    code: b.code ? text(b.code, 'code', 12) : undefined,
    ctaLabel: ctaUrl ? text(b.ctaLabel, 'ctaLabel', 40) : undefined,
    ctaUrl,
    footer: b.footer ? longText(b.footer, 'footer', 300) : undefined,
    discuss: b.discuss === true ? { email: supportAddress(), subject: String(b.discussSubject || 'Re: your SkillSync notice').replace(CONTROL, '').replace(/[\r\n]+/g, ' ').trim().slice(0, 150) } : undefined,
  });
}));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') { res.status(400).json({ success: false, message: 'Malformed JSON body.' }); return; }
  if (err?.type === 'entity.too.large') { res.status(413).json({ success: false, message: 'Request body too large.' }); return; }
  console.error('[notification-service]', err);
  res.status(500).json({ success: false, message: 'Server error' });
});

app.listen(PORT, () =>
  console.log(`Notification service running on port ${PORT}`)
);
