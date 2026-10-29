import { PrismaClient } from '@prisma/client';
import { deleteImage } from './storage.service';

/**
 * Permanently remove a user and everything that depends on it, bottom-up, in one transaction.
 * Several foreign keys are RESTRICT (applications, job postings, notifications), so a plain
 * user.delete would fail for any account that has activity.
 */
export async function purgeUser(prisma: PrismaClient, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { seeker: true, company: true },
  });
  if (!user) return;

  const images = [user.seeker?.profileImageUrl, user.company?.logoUrl, user.company?.coverImageUrl];

  await prisma.$transaction(async (tx) => {
    if (user.company) {
      const jobs = await tx.jobPosting.findMany({ where: { companyId: user.company.id }, select: { id: true } });
      const jobIds = jobs.map((j) => j.id);
      await tx.application.deleteMany({ where: { jobId: { in: jobIds } } });
      await tx.calendarEvent.deleteMany({ where: { companyId: user.company.id } });
      await tx.jobPosting.deleteMany({ where: { companyId: user.company.id } });
    }
    if (user.seeker) {
      await tx.application.deleteMany({ where: { seekerId: user.seeker.id } });
    }
    await tx.notification.deleteMany({ where: { receiverId: userId } });
    await tx.user.delete({ where: { id: userId } }); // profile, resume and scores cascade
  });

  await Promise.all(images.filter(Boolean).map((u) => deleteImage(u as string).catch(() => undefined)));
}
