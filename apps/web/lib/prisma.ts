/**
 * Prisma Client Singleton
 *
 * Prevents connection pool exhaustion by reusing a single PrismaClient instance
 * across all API routes. In development, uses global object to preserve instance
 * across hot reloads.
 *
 * Usage:
 * import { prisma } from '@/lib/prisma';
 *
 * const users = await prisma.user.findMany();
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting database connections due to hot reloading in Next.js
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown helper
 * Call this in your application shutdown handler
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
