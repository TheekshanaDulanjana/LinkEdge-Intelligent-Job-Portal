import { PrismaClient } from '@prisma/client';
import { APPLICATION_LIST_SELECT } from '../lib/select';

const prisma = new PrismaClient();

export const applicationRepository = {

  // Check if seeker already applied to this job
  async findExisting(jobId: string, seekerId: string) {
    return prisma.application.findFirst({
      where: { jobId, seekerId },
    });
  },

  async create(jobId: string, seekerId: string, cvUrl: string, coverLetter?: string) {
    return prisma.application.create({
      data: { jobId, seekerId, cvUrl, coverLetter, status: 'PENDING' },
    });
  },

  // All applications submitted by one seeker
  async findBySeeker(seekerId: string) {
    return prisma.application.findMany({
      where: { seekerId },
      select: { ...APPLICATION_LIST_SELECT, job: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  // All applications received for one job (company view)
  async findByJob(jobId: string) {
    return prisma.application.findMany({
      where: { jobId },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.application.update({
      where: { id },
      data: { status: status as 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'INTERVIEW' },
    });
  },
};