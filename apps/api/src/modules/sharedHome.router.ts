import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../shared/prisma';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import { createExpenseInTransaction } from './expenses/expenses.service';

const router = Router({ mergeParams: true });
router.use(authenticate);
const groupId = (req: Request) => req.params.groupId;
async function member(id: string, userId: string) {
  const found = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: id, userId } } });
  if (!found) throw new ForbiddenError('You are not a member of this group');
}
const wrap = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

router.get('/items', wrap(async (req, res) => {
  const id = groupId(req); await member(id, req.user!.sub);
  const items = await prisma.sharedItem.findMany({ where: { groupId: id }, include: { purchases: { orderBy: { purchasedAt: 'asc' }, select: { quantity: true, purchasedAt: true } } }, orderBy: { name: 'asc' } });
  const data = items.map((item) => {
    const history = item.purchases;
    let daysUntilEmpty: number | null = null;
    if (history.length >= 2) {
      const days = (history[history.length - 1].purchasedAt.getTime() - history[0].purchasedAt.getTime()) / 86400000;
      const dailyUse = history.reduce((sum, purchase) => sum + purchase.quantity, 0) / Math.max(days, 1);
      if (dailyUse > 0) daysUntilEmpty = Math.ceil(item.quantityOnHand / dailyUse);
    }
    const { purchases, ...rest } = item;
    return { ...rest, isLow: item.isLow || item.quantityOnHand <= item.lowThreshold, estimatedDaysUntilEmpty: daysUntilEmpty };
  });
  res.json({ success: true, data });
}));

router.post('/items', wrap(async (req, res) => {
  const body = z.object({ name: z.string().min(2).max(80), quantityOnHand: z.number().min(0).default(1), lowThreshold: z.number().min(0).default(1) }).parse(req.body);
  const id = groupId(req); await member(id, req.user!.sub);
  const item = await prisma.sharedItem.create({ data: { name: body.name, quantityOnHand: body.quantityOnHand ?? 1, lowThreshold: body.lowThreshold ?? 1, group: { connect: { id } } } });
  res.status(201).json({ success: true, data: { ...item, isLow: item.quantityOnHand <= item.lowThreshold, estimatedDaysUntilEmpty: null } });
}));

router.patch('/items/:itemId/low', wrap(async (req, res) => {
  const id = groupId(req); await member(id, req.user!.sub);
  const item = await prisma.sharedItem.findFirst({ where: { id: req.params.itemId, groupId: id } });
  if (!item) throw new NotFoundError('Shared item');
  const updated = await prisma.sharedItem.update({ where: { id: item.id }, data: { isLow: !item.isLow, onShoppingList: !item.isLow } });
  res.json({ success: true, data: updated });
}));

router.post('/items/:itemId/purchase', wrap(async (req, res) => {
  const body = z.object({ quantity: z.number().positive(), amount: z.number().positive() }).parse(req.body);
  const id = groupId(req); await member(id, req.user!.sub);
  const item = await prisma.sharedItem.findFirst({ where: { id: req.params.itemId, groupId: id } });
  if (!item) throw new NotFoundError('Shared item');
  const members = await prisma.groupMember.findMany({ where: { groupId: id }, select: { userId: true } });
  const result = await prisma.$transaction(async (tx) => {
    const expense = await createExpenseInTransaction(tx, { groupId: id, paidById: req.user!.sub, amount: body.amount, description: `Shared supply: ${item.name}`, category: 'OTHER', splitType: 'EQUAL', memberIds: members.map((m) => m.userId) });
    const updated = await tx.sharedItem.update({ where: { id: item.id }, data: { quantityOnHand: item.quantityOnHand + body.quantity, isLow: false, onShoppingList: false } });
    await tx.sharedPurchase.create({ data: { groupId: id, itemId: item.id, expenseId: expense.id, purchasedById: req.user!.sub, quantity: body.quantity, amount: body.amount } });
    return { expenseId: expense.id, item: updated };
  });
  res.status(201).json({ success: true, data: result });
}));

router.get('/chores', wrap(async (req, res) => {
  const id = groupId(req); await member(id, req.user!.sub);
  const chores = await prisma.chore.findMany({ where: { groupId: id }, include: { assignedTo: { select: { id: true, name: true } } }, orderBy: [{ completedAt: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }] });
  res.json({ success: true, data: chores });
}));
router.post('/chores', wrap(async (req, res) => {
  const body = z.object({ title: z.string().min(2).max(120), dueDate: z.string().optional() }).parse(req.body);
  const id = groupId(req); await member(id, req.user!.sub);
  const members = await prisma.groupMember.findMany({ where: { groupId: id }, select: { userId: true, joinedAt: true } });
  const counts = await prisma.chore.groupBy({ by: ['assignedToUserId'], where: { groupId: id }, _count: { id: true } });
  const load = new Map(counts.map((row) => [row.assignedToUserId, row._count.id]));
  members.sort((a, b) => Number(load.get(a.userId) ?? 0) - Number(load.get(b.userId) ?? 0) || a.joinedAt.getTime() - b.joinedAt.getTime());
  const chore = await prisma.chore.create({ data: { groupId: id, title: body.title, assignedToUserId: members[0].userId, dueDate: body.dueDate ? new Date(body.dueDate) : undefined }, include: { assignedTo: { select: { id: true, name: true } } } });
  res.status(201).json({ success: true, data: chore });
}));
router.patch('/chores/:choreId/toggle', wrap(async (req, res) => {
  const id = groupId(req); await member(id, req.user!.sub);
  const chore = await prisma.chore.findFirst({ where: { id: req.params.choreId, groupId: id } });
  if (!chore) throw new NotFoundError('Chore');
  const updated = await prisma.chore.update({ where: { id: chore.id }, data: { completedAt: chore.completedAt ? null : new Date() }, include: { assignedTo: { select: { id: true, name: true } } } });
  res.json({ success: true, data: updated });
}));

router.get('/chat', wrap(async (req, res) => {
  const id = groupId(req); await member(id, req.user!.sub);
  const messages = await prisma.groupChatMessage.findMany({ where: { groupId: id }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data: messages.reverse() });
}));
router.post('/chat', wrap(async (req, res) => {
  const body = z.object({ message: z.string().trim().min(1).max(1000) }).parse(req.body);
  const id = groupId(req); await member(id, req.user!.sub);
  const message = await prisma.groupChatMessage.create({ data: { groupId: id, userId: req.user!.sub, message: body.message }, include: { user: { select: { id: true, name: true } } } });
  res.status(201).json({ success: true, data: message });
}));

export default router;