import { PrismaClient } from '@prisma/client';

/** One Prisma client shared by the whole admin module. */
export const prisma = new PrismaClient();
