import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger/logger';

// Custom application error with HTTP status
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Global error handler — attach as the LAST middleware in app.ts
export function globalErrorHandler(serviceName: string) {
  const logger = createLogger(serviceName);

  return (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
  ) => {
    const requestId = req.headers['x-request-id'] as string;

    // Known application errors — safe to expose message
    if (err instanceof AppError) {
      logger.warn('Application error', {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        requestId,
        path: req.path,
      });

      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code,
        requestId,
      });
    }

    // Prisma unique constraint violation
    if (err.message?.includes('Unique constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A record with this value already exists.',
        requestId,
      });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        requestId,
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
        requestId,
      });
    }

    // Unknown errors — NEVER expose internal details
    logger.error('Unhandled error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      requestId,
      path: req.path,
      method: req.method,
    });

    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
      requestId,
    });
  };
}