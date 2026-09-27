import { Router, Request, Response, NextFunction } from 'express';
import * as service from './notifications.service';
import { authenticate } from '../../middleware/authenticate';
import { z } from 'zod';
import { validate } from '../../lib/validate';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await service.listNotifications(req.user!.sub) }); } catch (e) { next(e); }
});
router.patch('/:id/read', validate(z.object({}), 'body'), async (req: Request, res: Response, next: NextFunction) => {
  try { await service.markRead(req.user!.sub, req.params.id); res.json({ success: true, data: { message: 'Marked as read' } }); } catch (e) { next(e); }
});
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try { await service.markAllRead(req.user!.sub); res.json({ success: true, data: { message: 'All notifications marked as read' } }); } catch (e) { next(e); }
});
export default router;
