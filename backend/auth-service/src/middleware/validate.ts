// src/middleware/validate.ts

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodIssue } from 'zod';

/**
 * Reusable validator middleware.
 * @param schema - any Zod schema
 * @returns Express middleware that validates req.body
 */
export function validate(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Format the Zod issues into readable messages
      const errors = result.error.issues.map((e: ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Attach validated data to request body
    req.body = result.data;
    next();
  };
}

/**
 * Zod schema for registering a job seeker
 */
export const registerSeekerSchema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  location: z.string().optional(),
});

/**
 * Zod schema for registering a company
 */
export const registerCompanySchema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().optional(),
  website: z.string().url('Must be a valid URL').optional(),
});

/**
 * Zod schema for login
 */
export const loginSchema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(1, 'Password is required'),
});