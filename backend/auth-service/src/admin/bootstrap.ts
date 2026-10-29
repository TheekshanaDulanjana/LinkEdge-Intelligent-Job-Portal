import bcrypt from 'bcryptjs';
import { createLogger } from '../../../shared/logger/logger';
import { prisma } from './db';
import { adminPassword, generatePassword } from './password';

const logger = createLogger('auth-service');
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

function banner(lines: string[]) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const bar = '='.repeat(width);
  console.log(['', bar, ...lines.map((l) => `| ${l.padEnd(width - 4)} |`), bar, ''].join('\n'));
}

/**
 * First start: if the system has no administrator yet, create the owner account.
 *  - Email:    ADMIN_BOOTSTRAP_EMAIL, or owner@skillsync.local
 *  - Password: ADMIN_BOOTSTRAP_PASSWORD if it passes the admin policy, otherwise a random one
 *              that is printed ONCE to the service console and never stored in plain text.
 * The account must change its password at first login.
 */
export async function ensureOwnerAccount() {
  const existing = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (existing > 0) return;

  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'owner@skillsync.local').toLowerCase().trim();
  const fromEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const envOk = fromEnv ? adminPassword.safeParse(fromEnv).success : false;
  if (fromEnv && !envOk) logger.warn('ADMIN_BOOTSTRAP_PASSWORD does not meet the admin password policy; a random one is generated instead');
  const password = envOk ? (fromEnv as string) : generatePassword(20);

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) {
    logger.error('Cannot create the owner account: that email already belongs to a normal user. Set ADMIN_BOOTSTRAP_EMAIL to another address.', { email });
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, ROUNDS),
      role: 'ADMIN',
      adminLevel: 'OWNER',
      isEmailVerified: true,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    },
  });
  await prisma.auditLog.create({ data: { actorEmail: 'system', action: 'admin.owner_created', targetType: 'USER', targetLabel: email } });
  logger.security('Owner admin account created', { email });

  if (envOk) {
    banner(['OWNER ADMIN ACCOUNT CREATED', `Email:    ${email}`, 'Password: (taken from ADMIN_BOOTSTRAP_PASSWORD)', 'You must change it at first sign-in.', 'Remove ADMIN_BOOTSTRAP_PASSWORD from your .env now.']);
  } else {
    banner(['OWNER ADMIN ACCOUNT CREATED  (shown only once)', `Email:    ${email}`, `Password: ${password}`, 'Sign in at /admin/login - you must change the password at first sign-in.', 'Lost it? Run: npm run admin:reset']);
  }
}
