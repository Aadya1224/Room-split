import { prisma } from '../../shared/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import type {
  Balance,
  SettlementSuggestion,
  Settlement,
  LedgerEntry,
  UserPublic,
} from '@roomsplit/types';

const round2 = (n: number) => Math.round(n * 100) / 100;

function toPublicUser(u: {
  id: string; name: string; email: string;
  avatarUrl: string | null; createdAt: Date;
}): UserPublic {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, createdAt: u.createdAt.toISOString() };
}

async function assertMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!m) throw new ForbiddenError('Not a member of this group');
  return m;
}

export async function getGroupBalances(groupId: string, requesterId: string): Promise<Balance[]> {
  await assertMember(groupId, requesterId);

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } } },
  });

  const ledgerCredits = await prisma.ledgerEntry.groupBy({
    by: ['toUserId'], where: { groupId }, _sum: { amount: true },
  });
  const ledgerDebits = await prisma.ledgerEntry.groupBy({
    by: ['fromUserId'], where: { groupId }, _sum: { amount: true },
  });

  const balanceMap = new Map<string, number>();
  members.forEach((m) => balanceMap.set(m.userId, 0));

  for (const credit of ledgerCredits) {
    balanceMap.set(credit.toUserId, (balanceMap.get(credit.toUserId) ?? 0) + (credit._sum.amount?.toNumber() ?? 0));
  }
  for (const debit of ledgerDebits) {
    balanceMap.set(debit.fromUserId, (balanceMap.get(debit.fromUserId) ?? 0) - (debit._sum.amount?.toNumber() ?? 0));
  }

  const userMap = new Map(members.map((m) => [m.userId, m.user]));

  return Array.from(balanceMap.entries()).map(([userId, netBalance]) => ({
    userId,
    user: toPublicUser(userMap.get(userId)!),
    netBalance: round2(netBalance),
  }));
}

export async function getSettlementSuggestions(groupId: string, requesterId: string): Promise<SettlementSuggestion[]> {
  const balances = await getGroupBalances(groupId, requesterId);

  const creditors: Array<{ user: UserPublic; amount: number }> = [];
  const debtors:   Array<{ user: UserPublic; amount: number }> = [];

  for (const b of balances) {
    if (b.netBalance > 0.01)  creditors.push({ user: b.user, amount: b.netBalance });
    if (b.netBalance < -0.01) debtors.push({ user: b.user, amount: -b.netBalance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const suggestions: SettlementSuggestion[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];
    const amount   = Math.min(creditor.amount, debtor.amount);
    suggestions.push({ from: debtor.user, to: creditor.user, amount: round2(amount) });
    creditor.amount = round2(creditor.amount - amount);
    debtor.amount   = round2(debtor.amount   - amount);
    if (creditor.amount < 0.01) ci++;
    if (debtor.amount   < 0.01) di++;
  }
  return suggestions;
}

export async function getLedger(
  groupId: string, requesterId: string, cursor?: string, limit = 30
): Promise<{ items: LedgerEntry[]; nextCursor: string | null }> {
  await assertMember(groupId, requesterId);
  const take = Math.min(limit, 100);

  const entries = await prisma.ledgerEntry.findMany({
    where: { groupId, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    include: {
      fromUser: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
      toUser:   { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });

  const hasMore = entries.length > take;
  const items   = hasMore ? entries.slice(0, take) : entries;

  return {
    items: items.map((e) => ({
      id: e.id, groupId: e.groupId, fromUserId: e.fromUserId, toUserId: e.toUserId,
      amount: e.amount.toString(), description: e.description, entryType: e.entryType,
      refExpenseId: e.refExpenseId, createdAt: e.createdAt.toISOString(),
      fromUser: toPublicUser(e.fromUser), toUser: toPublicUser(e.toUser),
    })),
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
  };
}

export async function createSettlement(
  groupId: string, payerId: string, payeeId: string, amount: number
): Promise<Settlement> {
  await assertMember(groupId, payerId);
  const payee = await prisma.user.findUnique({ where: { id: payeeId } });
  if (!payee) throw new NotFoundError('Payee user');
  await assertMember(groupId, payeeId);

  const settlement = await prisma.$transaction(async (tx) => {
    const s = await tx.settlement.create({
      data: { groupId, payerId, payeeId, amount, status: 'COMPLETED', settledAt: new Date() },
      include: {
        payer: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
        payee: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
      },
    });
    // Settlement reverses the debt: payee was creditor, payer was debtor.
    // Add ledger entry: from payee → to payer (reverses the IOU)
    await tx.ledgerEntry.create({
      data: { groupId, fromUserId: payeeId, toUserId: payerId, amount,
              description: 'Settlement payment', entryType: 'SETTLEMENT' },
    });
    return s;
  });

  return {
    id: settlement.id, groupId: settlement.groupId,
    payerId: settlement.payerId, payeeId: settlement.payeeId,
    amount: settlement.amount.toString(), status: settlement.status,
    settledAt: settlement.settledAt?.toISOString() ?? null,
    createdAt: settlement.createdAt.toISOString(),
    payer: toPublicUser(settlement.payer), payee: toPublicUser(settlement.payee),
  };
}

export async function getSettlements(groupId: string, requesterId: string): Promise<Settlement[]> {
  await assertMember(groupId, requesterId);
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: {
      payer: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
      payee: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return settlements.map((s) => ({
    id: s.id, groupId: s.groupId, payerId: s.payerId, payeeId: s.payeeId,
    amount: s.amount.toString(), status: s.status,
    settledAt: s.settledAt?.toISOString() ?? null, createdAt: s.createdAt.toISOString(),
    payer: toPublicUser(s.payer), payee: toPublicUser(s.payee),
  }));
}

export async function getGroupAnalytics(
  groupId: string, requesterId: string, months = 6
): Promise<{ month: string; total: number; byCategory: Record<string, number> }[]> {
  await assertMember(groupId, requesterId);
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const expenses = await prisma.expense.findMany({
    where:   { groupId, isDeleted: false, expenseDate: { gte: since } },
    select:  { amount: true, category: true, expenseDate: true },
    orderBy: { expenseDate: 'asc' },
  });

  const monthMap = new Map<string, { total: number; byCategory: Record<string, number> }>();
  for (const e of expenses) {
    const key = `${e.expenseDate.getFullYear()}-${String(e.expenseDate.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, { total: 0, byCategory: {} });
    const entry = monthMap.get(key)!;
    const amt   = e.amount.toNumber();
    entry.total = round2(entry.total + amt);
    entry.byCategory[e.category] = round2((entry.byCategory[e.category] ?? 0) + amt);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
