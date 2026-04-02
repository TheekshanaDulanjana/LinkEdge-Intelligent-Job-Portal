import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthUser } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Ask the auth-service to verify the token
    const response = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/api/v1/auth/me`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    req.user = {
      userId: response.data.data.id,
      email: response.data.data.email,
      role: response.data.data.role,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireCompany(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'COMPANY') {
    res.status(403).json({
      success: false,
      message: 'Only companies can do this',
    });
    return;
  }
  next();
}