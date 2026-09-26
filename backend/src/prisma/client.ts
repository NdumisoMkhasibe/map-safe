// Prisma Client Singleton
import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Errors are sanitized by the HTTP boundary rather than logging raw query context.
    log: [],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
