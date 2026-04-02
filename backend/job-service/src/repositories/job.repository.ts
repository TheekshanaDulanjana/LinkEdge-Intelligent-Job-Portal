import { PrismaClient } from '@prisma/client';
import { CreateJobInput, UpdateJobInput, JobFilters } from '../types';

const prisma = new PrismaClient();

export const jobRepository = {

  async create(companyId: string, data: CreateJobInput) {
    return prisma.jobPosting.create({
      data: {
        companyId,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        location: data.location,
        jobType: data.jobType,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        deadline: new Date(data.deadline),
        status: 'ACTIVE',
      },
    });
  },

  // Get all ACTIVE jobs with optional search/filter — public access
  async findAll(filters: JobFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: 'ACTIVE' };

    // Search by title or description
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.jobType) {
      where.jobType = filters.jobType;
    }

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findById(id: string) {
    return prisma.jobPosting.findUnique({ where: { id } });
  },

  // Get all jobs posted by a specific company
  async findByCompany(companyId: string) {
    return prisma.jobPosting.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async update(id: string, data: UpdateJobInput) {
    return prisma.jobPosting.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        updatedAt: new Date(),
      },
    });
  },

  async delete(id: string) {
    return prisma.jobPosting.delete({ where: { id } });
  },
};