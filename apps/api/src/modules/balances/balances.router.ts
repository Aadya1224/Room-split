import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as balancesService from './balances.service';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../lib/validate';

const router = Router({ mergeParams: true });

router.use(authenticate);

// ─── GET /api/groups/:groupId/balances
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balances = await balancesService.getGroupBalances(
        req.params.groupId,
        req.user!.sub
      );
      res.json({ success: true, data: balances });
    } catch (err) { next(err); }
  }
);

// ─── GET /api/groups/:groupId/balances/optimized
router.get(
  '/optimized',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suggestions = await balancesService.getSettlementSuggestions(
        req.params.groupId,
        req.user!.sub
      );
      res.json({ success: true, data: suggestions });
    } catch (err) { next(err); }
  }
);

// ─── GET /api/groups/:groupId/balances/ledger
router.get(
  '/ledger',
  validate(
    z.object({
      cursor: z.string().optional(),
      limit:  z.coerce.number().int().min(1).max(100).optional(),
    }),
    'query'
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit } = req.query as { cursor?: string; limit?: string };
      const result = await balancesService.getLedger(
        req.params.groupId,
        req.user!.sub,
        cursor,
        limit ? parseInt(limit, 10) : 30
      );
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// ─── POST /api/groups/:groupId/balances/settlements
router.post(
  '/settlements',
  validate(
    z.object({
      payeeId: z.string().uuid(),
      amount:  z.number().positive().max(10_000_000),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settlement = await balancesService.createSettlement(
        req.params.groupId,
        req.user!.sub,
        req.body.payeeId,
        req.body.amount
      );
      res.status(201).json({ success: true, data: settlement });
    } catch (err) { next(err); }
  }
);

// ─── GET /api/groups/:groupId/balances/settlements
router.get(
  '/settlements',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settlements = await balancesService.getSettlements(
        req.params.groupId,
        req.user!.sub
      );
      res.json({ success: true, data: settlements });
    } catch (err) { next(err); }
  }
);

// ─── GET /api/groups/:groupId/balances/analytics
router.get(
  '/analytics',
  validate(
    z.object({ months: z.coerce.number().int().min(1).max(24).optional() }),
    'query'
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const data = await balancesService.getGroupAnalytics(
        req.params.groupId,
        req.user!.sub,
        months
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default router;
