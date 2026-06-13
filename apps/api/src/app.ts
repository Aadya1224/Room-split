import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { logger } from './shared/logger';
import { connectDB, disconnectDB } from './shared/prisma';
import { errorHandler } from './middleware/errorHandler';
import { defaultLimiter } from './middleware/rateLimiter';
import { startScheduler } from './modules/recurring/scheduler';

// ── Routers
import authRouter      from './modules/auth/auth.router';
import groupsRouter    from './modules/groups/groups.router';
import expensesRouter  from './modules/expenses/expenses.router';
import balancesRouter  from './modules/balances/balances.router';
import recurringRouter from './modules/recurring/recurring.router';

// ─── Validate required env vars ───────────────────────────────────────────────

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.fatal(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ─── App setup ────────────────────────────────────────────────────────────────

const app  = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// Security
app.use(helmet());
app.use(
  cors({
    origin:      process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.set('trust proxy', 1);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip:   (req) => req.url === '/health',
  })
);

// Rate limiting (global)
app.use('/api', defaultLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check (no auth, no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',    authRouter);
app.use('/api/groups',  groupsRouter);

// Nested group resource routers (inherit :groupId via mergeParams)
app.use('/api/groups/:groupId/expenses',  expensesRouter);
app.use('/api/groups/:groupId/balances',  balancesRouter);
app.use('/api/groups/:groupId/recurring', recurringRouter);

// 404 for unmatched routes
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── Server start ─────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 API server listening on http://localhost:${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });

  // Start recurring expense scheduler
  if (process.env.DISABLE_SCHEDULER !== 'true') {
    startScheduler();
  }

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      logger.info('Server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise rejection');
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});

export default app;
