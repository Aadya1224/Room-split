import { prisma } from '../../shared/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import type { RecurringTemplate, Frequency, Category, SplitType } from '@roomsplit/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTemplate(t: any): RecurringTemplate {
  return {
    id:          t.id,
    groupId:     t.groupId,
    description: t.description,
    amount:      t.amount.toString(),
    category:    t.category as Category,
    splitType:   t.splitType as SplitType,
    frequency:   t.frequency as Frequency,
    nextRunDate: t.nextRunDate.toISOString(),
    isActive:    t.isActive,
    createdAt:   t.createdAt.toISOString(),
  };
}

async function assertAdmin(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!m) throw new ForbiddenError('Not a member of this group');
  if (m.role !== 'ADMIN') throw new ForbiddenError('Only admins can manage recurring expenses');
  return m;
}

async function assertMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!m) throw new ForbiddenError('Not a member of this group');
  return m;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createTemplate(
  groupId:  string,
  userId:   string,
  data: {
    description: string;
    amount:      number;
    category:    string;
    splitType:   string;
    frequency:   string;
    nextRunDate: string;
  }
): Promise<RecurringTemplate> {
  await assertAdmin(groupId, userId);

  const template = await prisma.recurringTemplate.create({
    data: {
      groupId,
      description: data.description,
      amount:      data.amount,
      category:    data.category as any,
      splitType:   data.splitType as any,
      frequency:   data.frequency as any,
      nextRunDate: new Date(data.nextRunDate),
    },
  });

  return formatTemplate(template);
}

export async function getTemplates(
  groupId:  string,
  userId:   string
): Promise<RecurringTemplate[]> {
  await assertMember(groupId, userId);

  const templates = await prisma.recurringTemplate.findMany({
    where:   { groupId },
    orderBy: { nextRunDate: 'asc' },
  });

  return templates.map(formatTemplate);
}

export async function updateTemplate(
  groupId:    string,
  templateId: string,
  userId:     string,
  data: Partial<{
    description: string;
    amount:      number;
    category:    string;
    splitType:   string;
    frequency:   string;
    nextRunDate: string;
    isActive:    boolean;
  }>
): Promise<RecurringTemplate> {
  await assertAdmin(groupId, userId);

  const existing = await prisma.recurringTemplate.findFirst({
    where: { id: templateId, groupId },
  });
  if (!existing) throw new NotFoundError('Recurring template');

  const template = await prisma.recurringTemplate.update({
    where: { id: templateId },
    data:  {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount      !== undefined && { amount:      data.amount }),
      ...(data.category    !== undefined && { category:    data.category as any }),
      ...(data.splitType   !== undefined && { splitType:   data.splitType as any }),
      ...(data.frequency   !== undefined && { frequency:   data.frequency as any }),
      ...(data.nextRunDate !== undefined && { nextRunDate: new Date(data.nextRunDate) }),
      ...(data.isActive    !== undefined && { isActive:    data.isActive }),
    },
  });

  return formatTemplate(template);
}

export async function deleteTemplate(
  groupId:    string,
  templateId: string,
  userId:     string
): Promise<void> {
  await assertAdmin(groupId, userId);

  const existing = await prisma.recurringTemplate.findFirst({
    where: { id: templateId, groupId },
  });
  if (!existing) throw new NotFoundError('Recurring template');

  await prisma.recurringTemplate.delete({ where: { id: templateId } });
}
