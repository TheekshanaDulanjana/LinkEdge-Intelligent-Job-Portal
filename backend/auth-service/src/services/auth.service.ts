import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import {
  RegisterSeekerInput,
  RegisterCompanyInput,
  LoginInput,
  JwtPayload,
  AuthResponse,
} from '../types';

// Helper: create both tokens for a user
function generateTokens(payload: JwtPayload): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '15m', // Access token expires in 15 minutes
  });

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '7d' } // Refresh token lasts 7 days
  );

  return { accessToken, refreshToken };
}

export const authService = {

  async registerSeeker(data: RegisterSeekerInput): Promise<AuthResponse> {
    // Step 1: Check if email is already taken
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('EMAIL_TAKEN');
    }

    // Step 2: Hash the password (never store plain text)
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Step 3: Create the user in the database
    const user = await userRepository.createSeeker(data, passwordHash);

    // Step 4: Generate JWT tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: 'SEEKER',
    };
    const tokens = generateTokens(payload);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.seeker!,
      },
    };
  },

  async registerCompany(data: RegisterCompanyInput): Promise<AuthResponse> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.createCompany(data, passwordHash);

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: 'COMPANY',
    };
    const tokens = generateTokens(payload);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.company!,
      },
    };
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    // Step 1: Find user by email
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Step 2: Compare the password they typed with the stored hash
    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      throw new Error('INVALID_CREDENTIALS'); // Same error — don't reveal which is wrong
    }

    // Step 3: Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'SEEKER' | 'COMPANY',
    };
    const tokens = generateTokens(payload);

    const profile = user.role === 'SEEKER' ? user.seeker : user.company;

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profile!,
      },
    };
  },

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  },
};