import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodIssue } from 'zod';

export function validate(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ success: false, message: 'Validation failed', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}