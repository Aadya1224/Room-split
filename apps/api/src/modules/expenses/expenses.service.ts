import { prisma } from '../../shared/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import { calculateSplits } from './splits.engine';
import type { Expense, CreateExpenseBody, Category, SplitType } from '@roomsplit/types';

// ─── Type for prisma transaction client ───────────────────────────────────────
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const expenseInclude = {
  paidBy: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
  splits: {
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } } },
  },
} as const;

function formatExpense(e: any): Expense {
  return {
    id: e.id, groupId: e.groupId, paidById: e.paidById,
    amount: e.amount.toString(), description: e.description,
    category: e.category as Category, splitType: e.splitType as SplitType,
    receiptUrl: e.receiptUrl, recurringId: e.recurringId,
    expenseDate: e.expenseDate.toISOString(), isDeleted: e.isDeleted,
    createdAt: e.createdAt.toISOString(),
    paidBy: { ...e.paidBy, createdAt: e.paidBy.createdAt.toISOString() },
    splits: e.splits.map((s: any) => ({
      id: s.id, expenseId: s.expenseId, userId: s.userId,
      amount: s.amount.toString(), percentage: s.percentage.toString(),
      isSettled: s.isSettled,
      user: { ...s.user, createdAt: s.user.createdAt.toISOString() },
    })),
  };
}

async function assertMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!m) throw new ForbiddenError('Not a member of this group');
  return m;
}

// ─── Core - used by API and scheduler ─────────────────────────────────────────
export async function createExpenseInTransaction(
  tx: TxClient,
  params: {
    groupId: string; paidById: string; amount: number;
    description: string; category: string; splitType: string;
    expenseDate?: Date; recurringId?: string;
    memberIds?: string[];
    customSplits?: Array<{ userId: string; amount?: number; percentage?: number; weight?: number }>;
  }
) {
  const { groupId, paidById, amount, description, category, splitType, expenseDate, recurringId, customSplits } = params;

  let memberIds = params.memberIds;
  if (!memberIds) {
    const members = await tx.groupMember.findMany({ where: { groupId } });
    memberIds = members.map((m: { userId: string }) => m.userId);
  }

  const splits = calculateSplits(amount, splitType as SplitType, memberIds, customSplits);

  const expense = await tx.expense.create({
    data: {
      groupId, paidById, amount, description,
      category: category as any, splitType: splitType as any,
      expenseDate: expenseDate ?? new Date(), recurringId,
      splits: {
        create: splits.map((s) => ({ userId: s.userId, amount: s.amount, percentage: s.percentage })),
      },
    },
    include: expenseInclude,
  });

  const ledgerEntries = splits
    .filter((s) => s.userId !== paidById)
    .map((s) => ({
      groupId, fromUserId: s.userId, toUserId: paidById,
      amount: s.amount, description,
      entryType: 'EXPENSE' as const, refExpenseId: expense.id,
    }));

  if (ledgerEntries.length > 0) {
    await tx.ledgerEntry.createMany({ data: ledgerEntries });
  }

  return expense;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export async function createExpense(groupId: string, userId: string, body: CreateExpenseBody): Promise<Expense> {
  await assertMember(groupId, userId);
  const expense = await prisma.$transaction(async (tx) =>
    createExpenseInTransaction(tx, {
      groupId, paidById: userId, amount: body.amount,
      description: body.description, category: body.category, splitType: body.splitType,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
      customSplits: body.splits,
    })
  );
  return formatExpense(expense);
}

export async function getGroupExpenses(
  groupId: string, userId: string,
  filters: { category?: string; from?: string; to?: string; cursor?: string; limit?: number }
): Promise<{ items: Expense[]; nextCursor: string | null }> {
  await assertMember(groupId, userId);
  const limit = Math.min(filters.limit ?? 20, 100);

  const where: any = {
    groupId, isDeleted: false,
    ...(filters.category && { category: filters.category }),
    ...((filters.from || filters.to) && {
      expenseDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to   && { lte: new Date(filters.to) }),
      },
    }),
    ...(filters.cursor && { expenseDate: { lt: new Date(filters.cursor) } }),
  };

  const expenses = await prisma.expense.findMany({
    where, include: expenseInclude,
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
  });

  const hasMore = expenses.length > limit;
  const items   = hasMore ? expenses.slice(0, limit) : expenses;
  return {
    items: items.map(formatExpense),
    nextCursor: hasMore ? items[items.length - 1].expenseDate.toISOString() : null,
  };
}

export async function getExpense(groupId: string, expenseId: string, userId: string): Promise<Expense> {
  await assertMember(groupId, userId);
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, groupId, isDeleted: false }, include: expenseInclude });
  if (!expense) throw new NotFoundError('Expense');
  return formatExpense(expense);
}

export async function updateExpense(
  groupId: string, expenseId: string, userId: string, body: Partial<CreateExpenseBody>
): Promise<Expense> {
  await assertMember(groupId, userId);
  const existing = await prisma.expense.findFirst({ where: { id: expenseId, groupId, isDeleted: false } });
  if (!existing) throw new NotFoundError('Expense');

  if (existing.paidById !== userId) {
    const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (membership?.role !== 'ADMIN') throw new ForbiddenError('Only the payer or an admin can edit this expense');
  }

  const expense = await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.deleteMany({ where: { refExpenseId: expenseId } });
    await tx.expenseSplit.deleteMany({ where: { expenseId } });

    const amount    = body.amount    ?? existing.amount.toNumber();
    const splitType = body.splitType ?? existing.splitType;
    const members   = await tx.groupMember.findMany({ where: { groupId } });
    const memberIds = members.map((m: { userId: string }) => m.userId);
    const splits    = calculateSplits(amount, splitType as SplitType, memberIds, body.splits);

    const updated = await tx.expense.update({
      where: { id: expenseId },
      data: {
        ...(body.description && { description: body.description }),
        ...(body.amount      && { amount:      body.amount }),
        ...(body.category    && { category:    body.category as any }),
        ...(body.splitType   && { splitType:   body.splitType as any }),
        ...(body.expenseDate && { expenseDate: new Date(body.expenseDate) }),
        splits: {
          create: splits.map((s) => ({ userId: s.userId, amount: s.amount, percentage: s.percentage })),
        },
      },
      include: expenseInclude,
    });

    const ledgerEntries = splits
      .filter((s) => s.userId !== updated.paidById)
      .map((s) => ({
        groupId, fromUserId: s.userId, toUserId: updated.paidById,
        amount: s.amount, description: updated.description,
        entryType: 'EXPENSE' as const, refExpenseId: expenseId,
      }));

    if (ledgerEntries.length > 0) await tx.ledgerEntry.createMany({ data: ledgerEntries });
    return updated;
  });

  return formatExpense(expense);
}

export async function deleteExpense(groupId: string, expenseId: string, userId: string): Promise<void> {
  await assertMember(groupId, userId);
  const existing = await prisma.expense.findFirst({ where: { id: expenseId, groupId, isDeleted: false } });
  if (!existing) throw new NotFoundError('Expense');

  if (existing.paidById !== userId) {
    const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (membership?.role !== 'ADMIN') throw new ForbiddenError('Only the payer or an admin can delete this expense');
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({ where: { id: expenseId }, data: { isDeleted: true } });
    await tx.ledgerEntry.deleteMany({ where: { refExpenseId: expenseId } });
  });
}
