import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── Prisma known errors (checked by code property) ─────────────────────────
  const prismaErr = err as any;
  if (prismaErr?.code === 'P2002') {
    res.status(409).json({ success: false, error: 'A record with this value already exists' });
    return;
  }
  if (prismaErr?.code === 'P2025') {
    res.status(404).json({ success: false, error: 'Record not found' });
    return;
  }

  // ── Operational errors ─────────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Operational 5xx error');
    }
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // ── Unexpected errors ──────────────────────────────────────────────────────
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
