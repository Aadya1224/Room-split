import { prisma } from '../../shared/prisma';

export async function createFeedback(userId: string, rating: number | undefined, message: string) {
  return prisma.feedback.create({ data: { userId, rating, message } });
}
