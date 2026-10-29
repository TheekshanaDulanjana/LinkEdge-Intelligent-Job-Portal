import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { JwtPayload } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request so TypeScript knows about req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'No token provided',
    });
    return;
  }

  const token = authHeader.split(' ')[1]; // Extract token after "Bearer "

  let payload: JwtPayload;
  try {
    payload = authService.verifyAccessToken(token) as JwtPayload;
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }

  try {
    // The database decides whether the account may still use the system (deleted / disabled by an admin).
    const account = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { status: true, statusReason: true, role: true },
    });
    if (!account) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
    if (account.status === 'DISABLED') {
      res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: `Your account has been disabled by an administrator.${account.statusReason ? ` Reason: ${account.statusReason}` : ''}`,
      });
      return;
    }
    req.user = { ...payload, role: account.role as JwtPayload['role'] };
    next();
  } catch (e) {
    next(e);
  }
}

// Use this on routes that only companies can access
export function requireCompany(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'COMPANY') {
    res.status(403).json({
      success: false,
      message: 'Only companies can access this',
    });
    return;
  }
  next();
}

// Use this on routes that only seekers can access
export function requireSeeker(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'SEEKER') {
    res.status(403).json({
      success: false,
      message: 'Only job seekers can access this',
    });
    return;
  }
  next();
}