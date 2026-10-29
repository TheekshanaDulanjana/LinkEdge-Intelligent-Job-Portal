import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../shared/middleware/errorHandler';
import { createLogger } from '../../../shared/logger/logger';

const prisma = new PrismaClient();
const logger = createLogger('auth-service');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

function generateTokens(payload: { userId: string; email: string; role: string }) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '15m',
    issuer: 'intelligent-job-portal',
    audience: 'job-portal-client',
    jwtid: crypto.randomUUID(),
  });
  const refreshToken = jwt.sign(
    { userId: payload.userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '7d', issuer: 'intelligent-job-portal' }
  );
  return { accessToken, refreshToken };
}

function generateCode(length = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

async function notifyEmail(endpoint: string, data: object) {
  try {
    await axios.post(`${NOTIFICATION_URL}${endpoint}`, data, {
      headers: { 'x-service-key': SERVICE_KEY },
      timeout: 10000,
    });
  } catch (e) {
    logger.error(`Email notification failed: ${endpoint}`, { error: String(e) });
  }
}

export const authService = {

  // ── Registration ──────────────────────────────────────────────

  async registerSeeker(data: {
    email: string; password: string; fullName: string;
    phone?: string; location?: string;
  }) {
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered.', 409, 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const code = generateCode(6);
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'SEEKER',
        isEmailVerified: false,
        verificationCode: code,
        verificationExpiresAt: codeExpiry,
        seeker: {
          create: {
            fullName: data.fullName,
            phone: data.phone,
            location: data.location,
          },
        },
      },
      include: { seeker: true },
    });

    await notifyEmail('/send/verification', {
      to: email, name: data.fullName, code,
    });

    logger.security('Seeker registered', { userId: user.id });
    return { message: 'Registration successful. Check your email for the verification code.', userId: user.id };
  },

  async registerCompany(data: {
    email: string; password: string; companyName: string;
    industry?: string; website?: string; phone?: string; location?: string;
  }) {
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered.', 409, 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const code = generateCode(6);
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'COMPANY',
        isEmailVerified: false,
        verificationCode: code,
        verificationExpiresAt: codeExpiry,
        company: {
          create: {
            companyName: data.companyName,
            industry: data.industry,
            website: data.website,
            phone: data.phone,
            location: data.location,
          },
        },
      },
      include: { company: true },
    });

    await notifyEmail('/send/verification', {
      to: email, name: data.companyName, code,
    });

    logger.security('Company registered', { userId: user.id });
    return { message: 'Registration successful. Check your email for the verification code.', userId: user.id };
  },

  // ── Email Verification ────────────────────────────────────────

  async verifyEmail(email: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) throw new AppError('Invalid verification attempt.', 400, 'INVALID');

    if (user.isEmailVerified) {
      throw new AppError('Email already verified.', 400, 'ALREADY_VERIFIED');
    }

    if (
      !user.verificationCode ||
      !user.verificationExpiresAt ||
      user.verificationCode !== code ||
      new Date() > user.verificationExpiresAt
    ) {
      throw new AppError('Invalid or expired verification code.', 400, 'INVALID_CODE');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    logger.security('Email verified', { userId: user.id });

    const profile = user.role === 'SEEKER'
      ? await prisma.jobSeeker.findUnique({ where: { userId: user.id } })
      : await prisma.company.findUnique({ where: { userId: user.id } });

    const tokens = generateTokens({
      userId: user.id, email: user.email, role: user.role,
    });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role, profile },
    };
  },

  async resendVerificationCode(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { seeker: true, company: true },
    });

    if (!user) throw new AppError('Email not found.', 404, 'NOT_FOUND');
    if (user.isEmailVerified) {
      throw new AppError('Email already verified.', 400, 'ALREADY_VERIFIED');
    }

    const code = generateCode(6);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const name = user.seeker?.fullName || user.company?.companyName || 'User';
    await notifyEmail('/send/verification', { to: email, name, code });

    return { message: 'Verification code resent.' };
  },

  // ── Login ─────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { seeker: true, company: true },
    });

    const dummy = '$2a$12$LCKShjkKqpDHzIJANhlyXuPzRm3VPz4c5Jib5tMjFiMjNAhXxTqnO';
    const hash = user?.passwordHash || dummy;
    const match = await bcrypt.compare(password, hash);

    if (!user || !match) {
      logger.security('Failed login', { email });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
    }

    logger.security('Login success', { userId: user.id });

    const tokens = generateTokens({
      userId: user.id, email: user.email, role: user.role,
    });

    const profile = user.role === 'SEEKER' ? user.seeker : user.company;
    return { ...tokens, user: { id: user.id, email: user.email, role: user.role, profile } };
  },

  // ── Session renewal ───────────────────────────────────────────
  // Gives a fresh 15-minute access token to a user whose current token is still valid.
  async refreshSession(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Account not found.', 401, 'UNAUTHORIZED');
    const { accessToken } = generateTokens({
      userId: user.id, email: user.email, role: user.role,
    });
    return { accessToken };
  },

  // ── Google OAuth ──────────────────────────────────────────────

  async googleAuth(idToken: string, role: 'SEEKER' | 'COMPANY') {
    if (!idToken) throw new AppError('Google sign-in token is missing.', 400, 'NO_TOKEN');
    if (role !== 'SEEKER' && role !== 'COMPANY') role = 'SEEKER';

    // The browser signs in through Firebase, so what arrives here is a Firebase ID token.
    // It must be verified with the Firebase Admin SDK (not Google's userinfo endpoint).
    let decoded: { uid: string; email?: string; name?: string; picture?: string; email_verified?: boolean };
    try {
      const { admin } = await import('../config/firebase');
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err: any) {
      logger.security('Google token verification failed', { reason: err?.code || err?.message });
      throw new AppError('Google sign-in could not be verified. Please try again.', 401, 'INVALID_GOOGLE_TOKEN');
    }

    const googleId = decoded.uid;
    const { email, name, picture } = decoded;
    if (decoded.email_verified === false) {
      throw new AppError('Your Google email address is not verified.', 400, 'EMAIL_NOT_VERIFIED');
    }
    if (!email) throw new AppError('Google account has no email.', 400, 'NO_EMAIL');

    const normalizedEmail = email.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: normalizedEmail }] },
      include: { seeker: true, company: true },
    });

    if (!user) {
      // First time — create account
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          googleId,
          authProvider: 'GOOGLE',
          isEmailVerified: true, // Google accounts are pre-verified
          role,
          ...(role === 'SEEKER'
            ? { seeker: { create: { fullName: name || email.split('@')[0], profileImageUrl: picture ?? null } } }
            : { company: { create: { companyName: name || email.split('@')[0], logoUrl: picture ?? null } } }
          ),
        },
        include: { seeker: true, company: true },
      });
      logger.security('Google OAuth new user', { userId: user.id, role });
    } else {
      // Update Google ID if they sign in with Google for first time on existing account
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId, isEmailVerified: true },
        });
      }
      logger.security('Google OAuth login', { userId: user.id });
    }

    const tokens = generateTokens({
      userId: user.id, email: user.email, role: user.role,
    });

    const profile = user.role === 'SEEKER' ? user.seeker : user.company;
    return { ...tokens, user: { id: user.id, email: user.email, role: user.role, profile } };
  },

  // ── Password Reset ─────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { seeker: true, company: true },
    });

    // Always return success — don't reveal if email exists
    if (!user || user.authProvider !== 'LOCAL') {
      return { message: 'If this email is registered, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiresAt: expiry },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const name = user.seeker?.fullName || user.company?.companyName || 'User';

    await notifyEmail('/send/password-reset', { to: email, name, resetLink });
    logger.security('Password reset requested', { userId: user.id });

    return { message: 'If this email is registered, a reset link has been sent.' };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new AppError('Invalid or expired reset link.', 400, 'INVALID_TOKEN');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
    });

    logger.security('Password reset completed', { userId: user.id });
    return { message: 'Password updated successfully. You can now log in.' };
  },

  verifyAccessToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET as string, {
      issuer: 'intelligent-job-portal',
      audience: 'job-portal-client',
    }) as { userId: string; email: string; role: string };
  },

  // ── Account Deletion ─────────────────────────────────────────────

async deleteAccount(userId: string, password?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  if (user.passwordHash) {
    if (!password) {
      throw new AppError('Password is required to delete your account.', 400, 'PASSWORD_REQUIRED');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      logger.security('Failed account deletion attempt — wrong password', { userId });
      throw new AppError('Incorrect password.', 401, 'INVALID_PASSWORD');
    }
  }

  if (user.role === 'COMPANY') {
    const company = await prisma.company.findUnique({ where: { userId } });
    if (company) {
      // Applications reference JobPosting, JobPosting references Company —
      // must delete bottom-up before the User row can be removed.
      const jobs = await prisma.jobPosting.findMany({
        where: { companyId: company.id },
        select: { id: true },
      });
      const jobIds = jobs.map(j => j.id);

      await prisma.$transaction([
        prisma.application.deleteMany({ where: { jobId: { in: jobIds } } }),
        prisma.jobPosting.deleteMany({ where: { companyId: company.id } }),
      ]);
    }
  }

  // Cascading deletes (Company/JobSeeker/CandidateResume/Notification rows
  // tied directly to User) are handled by onDelete: Cascade in schema.prisma.
  await prisma.user.delete({ where: { id: userId } });

  logger.security('Account deleted', { userId });
  return { message: 'Account deleted successfully.' };
},
};