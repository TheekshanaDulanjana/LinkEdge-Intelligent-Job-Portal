// src/repositories/user.repository.ts

import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import { PrismaClient } from '@prisma/client';
import { RegisterSeekerInput, RegisterCompanyInput } from '../types';

// Initialize Prisma client safely
// Added optional logging for easier debugging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], 
});

export const userRepository = {
  /**
   * Find a user by their email address
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { seeker: true, company: true },
    });
  },

  /**
   * Find a user by their ID
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { seeker: true, company: true },
    });
  },

  /**
   * Create a new job seeker account (User + JobSeeker)
   */
  async createSeeker(data: RegisterSeekerInput, passwordHash: string) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'SEEKER',
        seeker: {
          create: {
            fullName: data.fullName,
            phone: data.phone,
            location: data.location,
          },
        },
      },
      include: { seeker: true },
    });
  },

  /**
   * Create a new company account (User + Company)
   */
  async createCompany(data: RegisterCompanyInput, passwordHash: string) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'COMPANY',
        company: {
          create: {
            companyName: data.companyName,
            industry: data.industry,
            website: data.website,
          },
        },
      },
      include: { company: true },
    });
  },
};

/**
 * Optional: Gracefully disconnect Prisma on exit
 * Helps prevent "PrismaClient did not disconnect properly" warnings
 */
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});