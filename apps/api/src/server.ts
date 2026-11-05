import 'dotenv/config';
import app from './app';
import { connectDB, disconnectDB } from './shared/prisma';
import { logger } from './shared/logger';
import { startScheduler } from './modules/recurring/scheduler';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

async function start(): Promise<void> {
  await connectDB();
  const server = app.listen(PORT, () => {
    logger.info(`API server listening on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
  if (process.env.DISABLE_SCHEDULER !== 'true') startScheduler();
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}; shutting down gracefully`);
    server.close(async () => { await disconnectDB(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});