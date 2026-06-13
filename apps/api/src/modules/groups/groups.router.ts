import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as groupsService from './groups.service';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../lib/validate';

const router = Router();

// All group routes require auth
router.use(authenticate);

const createGroupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
});

const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
});

// POST /api/groups
router.post(
  '/',
  validate(createGroupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupsService.createGroup(req.user!.sub, req.body.name);
      res.status(201).json({ success: true, data: group });
    } catch (err) { next(err); }
  }
);

// GET /api/groups
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await groupsService.getUserGroups(req.user!.sub);
      res.json({ success: true, data: groups });
    } catch (err) { next(err); }
  }
);

// GET /api/groups/:groupId
router.get(
  '/:groupId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupsService.getGroup(req.params.groupId, req.user!.sub);
      res.json({ success: true, data: group });
    } catch (err) { next(err); }
  }
);

// PATCH /api/groups/:groupId
router.patch(
  '/:groupId',
  validate(updateGroupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupsService.updateGroup(req.params.groupId, req.user!.sub, req.body);
      res.json({ success: true, data: group });
    } catch (err) { next(err); }
  }
);

// DELETE /api/groups/:groupId
router.delete(
  '/:groupId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupsService.deleteGroup(req.params.groupId, req.user!.sub);
      res.json({ success: true, data: { message: 'Group deleted' } });
    } catch (err) { next(err); }
  }
);

// POST /api/groups/join/:inviteCode
router.post(
  '/join/:inviteCode',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupsService.joinByInviteCode(req.user!.sub, req.params.inviteCode);
      res.json({ success: true, data: group });
    } catch (err) { next(err); }
  }
);

// POST /api/groups/:groupId/invite/regenerate
router.post(
  '/:groupId/invite/regenerate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = await groupsService.regenerateInviteCode(req.params.groupId, req.user!.sub);
      res.json({ success: true, data: { inviteCode: code } });
    } catch (err) { next(err); }
  }
);

// DELETE /api/groups/:groupId/members/:userId
router.delete(
  '/:groupId/members/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupsService.removeMember(req.params.groupId, req.user!.sub, req.params.userId);
      res.json({ success: true, data: { message: 'Member removed' } });
    } catch (err) { next(err); }
  }
);

// PATCH /api/groups/:groupId/members/:userId/promote
router.patch(
  '/:groupId/members/:userId/promote',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupsService.promoteMember(req.params.groupId, req.user!.sub, req.params.userId);
      res.json({ success: true, data: { message: 'Member promoted to admin' } });
    } catch (err) { next(err); }
  }
);

export default router;
