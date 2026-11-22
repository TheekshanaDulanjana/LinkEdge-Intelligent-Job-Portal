import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

export interface AdminContext {
  id: string;
  email: string;
  adminLevel: 'OWNER' | 'ADMIN';
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminContext;
    }
  }
}

const deny = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, code, message });

/**
 * Admin-only gate. Unlike the public routes it checks the database on every request, so a
 * disabled admin, a deleted admin or a changed password takes effect immediately.
 */
export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return deny(res, 401, 'NO_TOKEN', 'No token provided');

  let payload: any;
  try {
    payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET as string, {
      issuer: 'intelligent-job-portal',
      audience: 'job-portal-client',
    });
  } catch {
    return deny(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
  if (payload?.role !== 'ADMIN') return deny(res, 403, 'FORBIDDEN', 'Administrator access required');

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true, adminLevel: true, mustChangePassword: true, passwordChangedAt: true },
    });
    if (!user || user.role !== 'ADMIN') return deny(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
    if (user.status !== 'ACTIVE') return deny(res, 403, 'ACCOUNT_DISABLED', 'This administrator account is disabled');
    // A token issued before the last password change is no longer valid.
    if (user.passwordChangedAt && typeof payload.iat === 'number' && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return deny(res, 401, 'SESSION_REVOKED', 'Your password was changed. Please sign in again.');
    }
    req.admin = {
      id: user.id,
      email: user.email,
      adminLevel: user.adminLevel === 'OWNER' ? 'OWNER' : 'ADMIN',
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (e) {
    next(e);
  }
}

/** Everything except "change password" is locked until the temporary password has been replaced. */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.mustChangePassword) {
    return deny(res, 403, 'PASSWORD_CHANGE_REQUIRED', 'You must change your temporary password first');
  }
  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.adminLevel !== 'OWNER') return deny(res, 403, 'OWNER_ONLY', 'Only the owner can do this');
  next();
}
