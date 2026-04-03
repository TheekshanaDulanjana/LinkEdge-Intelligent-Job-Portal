import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import {
  RegisterSeekerInput,
  RegisterCompanyInput,
  LoginInput,
  JwtPayload,
  AuthResponse,
} from '../types';
import { AppError } from '../../../shared/middleware/errorHandler';
import { createLogger } from '../../../shared/logger/logger';

const logger = createLogger('auth-service');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET as string,
    {
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
      issuer: 'intelligent-job-portal',
      audience: 'job-portal-client',
      jwtid: crypto.randomUUID(), // Unique token ID — enables revocation
    }
  );

  const refreshToken = jwt.sign(
    { userId: payload.userId }, // Minimal payload in refresh token
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
      issuer: 'intelligent-job-portal',
      jwtid: crypto.randomUUID(),
    }
  );

  return { accessToken, refreshToken };
}

export const authService = {

  async registerSeeker(data: RegisterSeekerInput): Promise<AuthResponse> {
    const existing = await userRepository.findByEmail(
      data.email.toLowerCase().trim()
    );

    if (existing) {
      // Log failed attempt — don't reveal which field is taken
      logger.security('Registration attempt with existing email', {
        email: data.email,
      });
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await userRepository.createSeeker(
      { ...data, email: data.email.toLowerCase().trim() },
      passwordHash
    );

    logger.security('New seeker registered', { userId: user.id });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: 'SEEKER',
    };

    return { ...generateTokens(payload), user: { id: user.id, email: user.email, role: user.role, profile: user.seeker! } };
  },

  async registerCompany(data: RegisterCompanyInput): Promise<AuthResponse> {
    const existing = await userRepository.findByEmail(
      data.email.toLowerCase().trim()
    );

    if (existing) {
      logger.security('Registration attempt with existing email', { email: data.email });
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await userRepository.createCompany(
      { ...data, email: data.email.toLowerCase().trim() },
      passwordHash
    );

    logger.security('New company registered', { userId: user.id });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: 'COMPANY',
    };

    return { ...generateTokens(payload), user: { id: user.id, email: user.email, role: user.role, profile: user.company! } };
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(
      data.email.toLowerCase().trim()
    );

    // Constant-time check — always hash even when user not found
    // This prevents timing attacks that reveal whether email exists
    const dummyHash =
      '$2a$12$LCKShjkKqpDHzIJANhlyXuPzRm3VPz4c5Jib5tMjFiMjNAhXxTqnO';
    const passwordToCheck = user ? user.passwordHash : dummyHash;
    const passwordMatch = await bcrypt.compare(data.password, passwordToCheck);

    if (!user || !passwordMatch) {
      logger.security('Failed login attempt', {
        email: data.email,
        reason: !user ? 'user_not_found' : 'wrong_password',
      });
      // Same error for both cases — never reveal which is wrong
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    logger.security('Successful login', { userId: user.id, role: user.role });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'SEEKER' | 'COMPANY',
    };

    const profile = user.role === 'SEEKER' ? user.seeker : user.company;
    return { ...generateTokens(payload), user: { id: user.id, email: user.email, role: user.role, profile: profile! } };
  },

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET as string, {
      issuer: 'intelligent-job-portal',
      audience: 'job-portal-client',
    }) as JwtPayload;
  },
};