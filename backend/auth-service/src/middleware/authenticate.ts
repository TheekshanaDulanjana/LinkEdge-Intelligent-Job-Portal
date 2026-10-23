import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { JwtPayload } from '../types';

// Extend Express Request so TypeScript knows about req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
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

  try {
    const payload = authService.verifyAccessToken(token) as JwtPayload; 
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
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