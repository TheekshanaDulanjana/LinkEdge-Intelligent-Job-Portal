/**
 * Recovery tool: sets a new random password on the owner admin account (or the admin given as
 * the first argument), unlocks it and forces a password change at next sign-in.
 *   npm run admin:reset
 *   npm run admin:reset -- someone@example.com
 */
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { prisma } from '../admin/db';
import { generatePassword } from '../admin/password';

(async () => {
  const arg = process.argv[2]?.toLowerCase().trim();
  const admin = arg
    ? await prisma.user.findFirst({ where: { email: arg, role: 'ADMIN' } })
    : await prisma.user.findFirst({ where: { role: 'ADMIN', adminLevel: 'OWNER' }, orderBy: { createdAt: 'asc' } });
  if (!admin) {
    console.error('No matching admin account found.');
    process.exit(1);
  }
  const password = generatePassword(20);
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12')),
      mustChangePassword: true,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
      status: 'ACTIVE',
      statusReason: null,
    },
  });
  await prisma.auditLog.create({ data: { actorEmail: 'system', action: 'admin.password_reset_cli', targetType: 'USER', targetId: admin.id, targetLabel: admin.email } });
  console.log(`\nNew temporary password for ${admin.email}:\n\n  ${password}\n\nIt must be changed at the next sign-in.\n`);
  await prisma.$disconnect();
})();
