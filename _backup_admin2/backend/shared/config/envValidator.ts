import { z } from 'zod';

// Validates env vars at startup — crashes with a clear message if anything is wrong
export function validateEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Environment validation failed:\n');
    result.error.issues.forEach((err: z.ZodIssue) => {
      console.error(` ${err.path.join('.')}: ${err.message}`);
    });
    console.error(
      '\nFix your .env file and restart the service.\n'
    );
    process.exit(1);
  }

  return result.data;
}

// Auth service env schema
export const authEnvSchema = z.object({
  DATABASE_URL: z.string().url('Must be a valid PostgreSQL URL'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.string().default('3001'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  INTERNAL_SERVICE_KEY: z
    .string()
    .min(32, 'INTERNAL_SERVICE_KEY must be at least 32 characters'),
  BCRYPT_ROUNDS: z.string().default('12'),
});

// Job service env schema
export const jobEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  PORT: z.string().default('3002'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  INTERNAL_SERVICE_KEY: z.string().min(32),
});

// Application service env schema
export const applicationEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  JOB_SERVICE_URL: z.string().url(),
  PORT: z.string().default('3003'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  INTERNAL_SERVICE_KEY: z.string().min(32),
  MAX_FILE_SIZE_MB: z.string().default('5'),
  UPLOAD_DIR: z.string().default('uploads'),
});