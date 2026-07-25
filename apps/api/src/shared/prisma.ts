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

export async function connectDB(retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('✅ PostgreSQL connected via Prisma');
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      logger.warn(`⚠️ DB connection failed (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
}
