import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../lib/validate';
import * as service from './feedback.service';

const router = Router();
router.use(authenticate);

router.post('/', validate(z.object({ rating: z.number().int().min(1).max(5).optional(), message: z.string().min(5).max(2000).trim() })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedback = await service.createFeedback(req.user!.sub, req.body.rating, req.body.message);
    res.status(201).json({ success: true, data: feedback });
  } catch (e) { next(e); }
});
export default router;
