import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as expensesService from './expenses.service';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../lib/validate';

const router = Router({ mergeParams: true }); // inherit :groupId from parent router

router.use(authenticate);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['RENT','UTILITIES','GROCERIES','SUBSCRIPTION','ONE_TIME','OTHER'] as const;
const SPLIT_TYPES = ['EQUAL','PERCENTAGE','FIXED','WEIGHTED'] as const;

const splitInputSchema = z.object({
  userId:     z.string().uuid(),
  amount:     z.number().positive().optional(),
  percentage: z.number().positive().max(100).optional(),
  weight:     z.number().positive().optional(),
});

const createExpenseSchema = z.object({
  description: z.string().min(1).max(200).trim(),
  amount:      z.number().positive().max(10_000_000),
  category:    z.enum(CATEGORIES),
  splitType:   z.enum(SPLIT_TYPES),
  expenseDate: z.string().datetime().optional(),
  splits:      z.array(splitInputSchema).optional(),
});

const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  from:     z.string().optional(),
  to:       z.string().optional(),
  cursor:   z.string().optional(),
  limit:    z.coerce.number().int().min(1).max(100).optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/groups/:groupId/expenses
router.post(
  '/',
  validate(createExpenseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expense = await expensesService.createExpense(
        req.params.groupId,
        req.user!.sub,
        req.body
      );
      res.status(201).json({ success: true, data: expense });
    } catch (err) { next(err); }
  }
);

// GET /api/groups/:groupId/expenses
router.get(
  '/',
  validate(listQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await expensesService.getGroupExpenses(
        req.params.groupId,
        req.user!.sub,
        req.query as any
      );
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// GET /api/groups/:groupId/expenses/:expenseId
router.get(
  '/:expenseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expense = await expensesService.getExpense(
        req.params.groupId,
        req.params.expenseId,
        req.user!.sub
      );
      res.json({ success: true, data: expense });
    } catch (err) { next(err); }
  }
);

// PATCH /api/groups/:groupId/expenses/:expenseId
router.patch(
  '/:expenseId',
  validate(createExpenseSchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expense = await expensesService.updateExpense(
        req.params.groupId,
        req.params.expenseId,
        req.user!.sub,
        req.body
      );
      res.json({ success: true, data: expense });
    } catch (err) { next(err); }
  }
);

// DELETE /api/groups/:groupId/expenses/:expenseId
router.delete(
  '/:expenseId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await expensesService.deleteExpense(
        req.params.groupId,
        req.params.expenseId,
        req.user!.sub
      );
      res.json({ success: true, data: { message: 'Expense deleted' } });
    } catch (err) { next(err); }
  }
);

export default router;
