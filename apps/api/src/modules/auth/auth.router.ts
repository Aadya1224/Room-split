import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../lib/validate';
import { AppError } from '../../shared/errors';

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name:      z.string().min(2).max(100).trim().optional(),
  avatarUrl: z.string().url().optional(),
});

// ─── Cookie helper ────────────────────────────────────────────────────────────

const COOKIE_NAME = 'rs_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
  path:     '/api/auth',
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken, ...response } = await authService.register(req.body);
      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTS);
      res.status(201).json({ success: true, data: response });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken, ...response } = await authService.login(req.body);
      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTS);
      res.json({ success: true, data: response });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) throw new AppError('No refresh token', 401);
      const tokens = await authService.refresh(token);
      res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTS);
      res.json({ success: true, data: { accessToken: tokens.accessToken } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      if (token) await authService.logout(token);
      res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getMe(req.user!.sub);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/auth/me
router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.updateProfile(req.user!.sub, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
