import { z } from 'zod';

/** Same rules as the backend (auth-service/src/validation/fields.ts). Keep both in sync. */

export const NAME_CHARS = /[^\p{L}\p{M} .'’-]/gu;
export const PLACE_CHARS = /[^\p{L}\p{M}\p{N} &/+#.,()'’\-–]/gu;
export const PHONE_CHARS = /[^\d+ ()-]/g;

export const stripName = (v: string) => v.replace(NAME_CHARS, '');
export const stripPlace = (v: string) => v.replace(PLACE_CHARS, '');
export const stripPhone = (v: string) => v.replace(PHONE_CHARS, '');
export const stripDigits = (v: string) => v.replace(/\D/g, '');

/** Props that block unwanted characters as the user types: <input {...register('x', filter(stripName))} /> */
export const filter = (fn: (v: string) => string) => ({
  onChange: (e: { target: { value: string } }) => { e.target.value = fn(e.target.value); },
});

export const personName = (label = 'Name') =>
  z.string().trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(80, `${label} must be at most 80 characters`)
    .regex(/^\p{L}[\p{L}\p{M} .'’-]*$/u, `${label} can only contain letters, spaces, . ' and -`);

export const businessName = (label: string, max = 100) =>
  z.string().trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .regex(/^[\p{L}\p{M}\p{N} &/+#.,()'’\-–]+$/u, `${label} contains characters that are not allowed`)
    .regex(/\p{L}/u, `${label} must contain letters`);

const phoneRule = z.string().trim()
  .regex(/^\+?[0-9][0-9 ()-]*$/, 'Phone number can only contain digits, spaces, + - ( )')
  .refine((s) => { const n = s.replace(/\D/g, '').length; return n >= 7 && n <= 15; }, 'Phone number must have 7 to 15 digits');

/** Optional field: an empty box is allowed, anything typed must be valid. */
export const optionalPhone = z.union([z.literal(''), phoneRule]).optional();
export const optionalPlace = (label: string, max = 100) => z.union([z.literal(''), businessName(label, max)]).optional();
export const optionalText = (label: string, max: number) => z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();
export const optionalUrl = (label: string) =>
  z.union([
    z.literal(''),
    z.string().trim().max(200, `${label} must be at most 200 characters`)
      .refine((s) => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }, `${label} must be a valid link starting with http:// or https://`),
  ]).optional();

export const emailRule = z.string().trim().toLowerCase().max(254, 'Email is too long').email('Enter a valid email');

export const newPassword = z.string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/\d/, 'Include a number');
