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

  // ── Google OAuth ──────────────────────────────────────────────

  async googleAuth(googleToken: string, role: 'SEEKER' | 'COMPANY') {
    // Verify the Google token with Google's API
    const googleRes = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${googleToken}` } }
    );

    const { sub: googleId, email, name, picture } = googleRes.data;

    if (!email) throw new AppError('Google account has no email.', 400, 'NO_EMAIL');

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { seeker: true, company: true },
    });

    if (!user) {
      // First time — create account
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          authProvider: 'GOOGLE',
          isEmailVerified: true, // Google accounts are pre-verified
          role,
          ...(role === 'SEEKER'
            ? { seeker: { create: { fullName: name || email.split('@')[0], profileImageUrl: picture } } }
            : { company: { create: { companyName: name || email.split('@')[0], logoUrl: picture } } }
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
};