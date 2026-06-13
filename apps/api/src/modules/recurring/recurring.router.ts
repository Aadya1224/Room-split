import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as recurringService from './recurring.service';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../lib/validate';

const router = Router({ mergeParams: true });

router.use(authenticate);

const CATEGORIES  = ['RENT','UTILITIES','GROCERIES','SUBSCRIPTION','ONE_TIME','OTHER'] as const;
const SPLIT_TYPES = ['EQUAL','PERCENTAGE','FIXED','WEIGHTED'] as const;
const FREQUENCIES = ['DAILY','WEEKLY','MONTHLY','YEARLY'] as const;

const createSchema = z.object({
  description: z.string().min(1).max(200).trim(),
  amount:      z.number().positive().max(10_000_000),
  category:    z.enum(CATEGORIES),
  splitType:   z.enum(SPLIT_TYPES).default('EQUAL'),
  frequency:   z.enum(FREQUENCIES),
  nextRunDate: z.string().datetime(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// GET /api/groups/:groupId/recurring
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await recurringService.getTemplates(req.params.groupId, req.user!.sub);
      res.json({ success: true, data: templates });
    } catch (err) { next(err); }
  }
);

// POST /api/groups/:groupId/recurring
router.post(
  '/',
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await recurringService.createTemplate(
        req.params.groupId,
        req.user!.sub,
        req.body
      );
      res.status(201).json({ success: true, data: template });
    } catch (err) { next(err); }
  }
);

// PATCH /api/groups/:groupId/recurring/:templateId
router.patch(
  '/:templateId',
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await recurringService.updateTemplate(
        req.params.groupId,
        req.params.templateId,
        req.user!.sub,
        req.body
      );
      res.json({ success: true, data: template });
    } catch (err) { next(err); }
  }
);

// DELETE /api/groups/:groupId/recurring/:templateId
router.delete(
  '/:templateId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await recurringService.deleteTemplate(
        req.params.groupId,
        req.params.templateId,
        req.user!.sub
      );
      res.json({ success: true, data: { message: 'Recurring template deleted' } });
    } catch (err) { next(err); }
  }
);

export default router;
