import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Internal service-to-service authentication
// Each service includes this key when calling another service
export function requireServiceKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const serviceKey = req.headers['x-service-key'];
  const expectedKey = process.env.INTERNAL_SERVICE_KEY;

  if (!expectedKey) {
    console.error('INTERNAL_SERVICE_KEY not set in environment');
    return res.status(500).json({ success: false, message: 'Service misconfigured' });
  }

  if (!serviceKey) {
    return res.status(401).json({
      success: false,
      message: 'Service authentication required',
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(serviceKey as string),
    Buffer.from(expectedKey)
  );

  if (!isValid) {
    return res.status(403).json({
      success: false,
      message: 'Invalid service key',
    });
  }

  next();
}