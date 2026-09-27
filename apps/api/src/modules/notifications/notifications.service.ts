import { prisma } from '../../shared/prisma';

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
}

export async function markRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function createNotification(userId: string, title: string, message: string, type = 'INFO') {
  return prisma.notification.create({ data: { userId, title, message, type } });
}
