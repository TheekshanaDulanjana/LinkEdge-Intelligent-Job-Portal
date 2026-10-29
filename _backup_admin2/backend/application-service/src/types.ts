export interface AuthUser {
  userId: string;
  email: string;
  role: 'SEEKER' | 'COMPANY';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}