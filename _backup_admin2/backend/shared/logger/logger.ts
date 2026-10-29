import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'security';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  requestId?: string;
  message: string;
  meta?: Record<string, unknown>;
}

// Structured JSON logger — in production pipe this to a log aggregator
export function createLogger(serviceName: string) {
  function log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...(meta && { meta }),
    };

    // In production replace console.log with a proper log shipper
    const output = JSON.stringify(entry);

    if (level === 'error' || level === 'security') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  return {
    info: (msg: string, meta?: Record<string, unknown>) =>
      log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) =>
      log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) =>
      log('error', msg, meta),
    debug: (msg: string, meta?: Record<string, unknown>) =>
      log('debug', msg, meta),
    // Special level for auth and access events
    security: (msg: string, meta?: Record<string, unknown>) =>
      log('security', msg, meta),
  };
}

// Middleware that attaches a unique request ID to every request
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

// HTTP request logger middleware
export function httpLogger(serviceName: string) {
  const logger = createLogger(serviceName);

  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500
        ? 'error'
        : res.statusCode >= 400
        ? 'warn'
        : 'info';

      logger[level]('HTTP request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        requestId: req.headers['x-request-id'],
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    });

    next();
  };
}