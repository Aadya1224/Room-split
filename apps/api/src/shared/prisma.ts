import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }]
      : [],
  });

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
  (prisma as any).$on('query', (e: { query: string; duration: number }) => {
    if (process.env.LOG_QUERIES === 'true') {
      logger.debug({ query: e.query, duration: e.duration }, 'DB Query');
    }
  });
}

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ PostgreSQL connected via Prisma');
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
}
