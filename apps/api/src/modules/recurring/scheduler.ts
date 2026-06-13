import cron from 'node-cron';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { prisma } from '../../shared/prisma';
import { createExpenseInTransaction } from '../expenses/expenses.service';
import { logger } from '../../shared/logger';

function advanceDate(date: Date, frequency: string): Date {
  switch (frequency) {
    case 'DAILY':   return addDays(date, 1);
    case 'WEEKLY':  return addWeeks(date, 1);
    case 'MONTHLY': return addMonths(date, 1);
    case 'YEARLY':  return addYears(date, 1);
    default:        return addMonths(date, 1);
  }
}

export async function runRecurringJob(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  logger.info({ today: today.toISOString() }, '⏰ Running recurring expense job');

  const duTemplates = await prisma.recurringTemplate.findMany({
    where: { isActive: true, nextRunDate: { lte: today } },
    include: { group: { include: { members: { select: { userId: true } } } } },
  });

  if (!duTemplates.length) { logger.info('No recurring expenses due today'); return; }

  logger.info({ count: duTemplates.length }, 'Processing due recurring templates');

  for (const template of duTemplates) {
    try {
      const alreadyExists = await prisma.expense.findFirst({
        where: {
          recurringId: template.id,
          expenseDate: { gte: today, lt: addDays(today, 1) },
          isDeleted: false,
        },
      });

      if (alreadyExists) {
        logger.info({ templateId: template.id }, 'Already generated for today — skipping');
        continue;
      }

      const memberIds = template.group.members.map((m: { userId: string }) => m.userId);
      const paidById  = memberIds[0];

      await prisma.$transaction(async (tx) => {
        await createExpenseInTransaction(tx, {
          groupId:     template.groupId,
          paidById,
          amount:      template.amount.toNumber(),
          description: template.description,
          category:    template.category,
          splitType:   template.splitType,
          expenseDate: today,
          recurringId: template.id,
          memberIds,
        });
        await tx.recurringTemplate.update({
          where: { id: template.id },
          data:  { nextRunDate: advanceDate(template.nextRunDate, template.frequency) },
        });
      });

      logger.info({ templateId: template.id, description: template.description }, '✅ Recurring expense generated');
    } catch (err) {
      logger.error({ err, templateId: template.id }, '❌ Failed to generate recurring expense');
    }
  }
}

export function startScheduler(): void {
  cron.schedule('1 0 * * *', async () => { await runRecurringJob(); });
  logger.info('📅 Recurring expense scheduler started (runs daily at 00:01)');
}
