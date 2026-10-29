import { z } from 'zod';

export const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

const blankToUndefined = (v: unknown) => (typeof v === 'string' && clean(v) === '' ? undefined : v);

/** Person name: letters (any language), spaces, . ' - only. No digits or symbols. */
export const personName = (label = 'Name') =>
  z.string({ message: `${label} is required` }).transform(clean).pipe(
    z.string()
      .min(2, `${label} must be at least 2 characters`)
      .max(80, `${label} must be at most 80 characters`)
      .regex(/^\p{L}[\p{L}\p{M} .'’\-]*$/u, `${label} can only contain letters, spaces, . ' and -`)
  );

/** Business / place names: letters, digits, spaces and common punctuation. */
export const businessName = (label: string, min = 2, max = 100) =>
  z.string({ message: `${label} is required` }).transform(clean).pipe(
    z.string()
      .min(min, `${label} must be at least ${min} characters`)
      .max(max, `${label} must be at most ${max} characters`)
      .regex(/^[\p{L}\p{M}\p{N} &/+#.,()'’\-–]+$/u, `${label} contains characters that are not allowed`)
      .regex(/\p{L}/u, `${label} must contain letters`)
  );

export const email = z.string({ message: 'Email is required' })
  .transform((s) => clean(s).toLowerCase())
  .pipe(z.string().max(254, 'Email is too long').email('Enter a valid email address'));

/** New password: 8-72 chars (bcrypt ignores anything past 72 bytes), letter + number. */
export const newPassword = z.string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

/** Phone: digits with optional leading +, spaces, dashes, brackets. 7-15 digits. */
export const phone = z.string().transform(clean).pipe(
  z.string()
    .regex(/^\+?[0-9][0-9 \-()]*$/, 'Phone number can only contain digits, spaces, + - ( )')
    .refine((s) => { const n = s.replace(/\D/g, '').length; return n >= 7 && n <= 15; }, 'Phone number must have 7 to 15 digits')
);

export const optionalPhone = z.preprocess(blankToUndefined, phone.optional());

/** Optional free text; blank means "not provided". */
export const optionalText = (max: number, label: string) =>
  z.preprocess(blankToUndefined, z.string().transform(clean).pipe(z.string().max(max, `${label} must be at most ${max} characters`)).optional());

export const optionalPlace = (label: string, max = 100) =>
  z.preprocess(blankToUndefined, businessName(label, 2, max).optional());

export const optionalUrl = (label: string) =>
  z.preprocess(
    blankToUndefined,
    z.string().transform(clean).pipe(
      z.string().max(200, `${label} must be at most 200 characters`)
        .refine((s) => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }, `${label} must be a valid http(s) link`)
    ).optional()
  );

export const code6 = z.string({ message: 'Verification code is required' }).transform(clean).pipe(z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'));
export const tokenString = z.string({ message: 'Token is required' }).min(10, 'Invalid token').max(2048, 'Invalid token');
