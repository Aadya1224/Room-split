import crypto from 'crypto';
import { prisma } from '../../shared/prisma';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../../shared/errors';
import type { Group } from '@roomsplit/types';

const groupInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
} as const;

function formatGroup(g: any): Group {
  return {
    id: g.id, name: g.name, inviteCode: g.inviteCode,
    createdBy: g.createdBy, createdAt: g.createdAt.toISOString(),
    members: g.members.map((m: any) => ({
      id: m.id, userId: m.userId, groupId: m.groupId, role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: { id: m.user.id, name: m.user.name, email: m.user.email, avatarUrl: m.user.avatarUrl, createdAt: m.user.createdAt.toISOString() },
    })),
  };
}

async function assertMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!m) throw new ForbiddenError('You are not a member of this group');
  return m;
}

async function assertAdmin(groupId: string, userId: string) {
  const m = await assertMember(groupId, userId);
  if (m.role !== 'ADMIN') throw new ForbiddenError('Only admins can perform this action');
  return m;
}

export async function createGroup(userId: string, name: string): Promise<Group> {
  const group = await prisma.group.create({
    data: { name, createdBy: userId, members: { create: { userId, role: 'ADMIN' } } },
    include: groupInclude,
  });
  return formatGroup(group);
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { include: groupInclude } },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map((m: any) => formatGroup(m.group));
}

export async function getGroup(groupId: string, userId: string): Promise<Group> {
  await assertMember(groupId, userId);
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: groupInclude });
  if (!group) throw new NotFoundError('Group');
  return formatGroup(group);
}

export async function updateGroup(groupId: string, userId: string, data: { name?: string }): Promise<Group> {
  await assertAdmin(groupId, userId);
  const group = await prisma.group.update({ where: { id: groupId }, data, include: groupInclude });
  return formatGroup(group);
}

export async function deleteGroup(groupId: string, userId: string): Promise<void> {
  await assertAdmin(groupId, userId);
  await prisma.group.delete({ where: { id: groupId } });
}

export async function regenerateInviteCode(groupId: string, userId: string): Promise<string> {
  await assertAdmin(groupId, userId);
  const newCode = crypto.randomBytes(12).toString('base64url');
  await prisma.group.update({ where: { id: groupId }, data: { inviteCode: newCode } });
  return newCode;
}

export async function joinByInviteCode(userId: string, inviteCode: string): Promise<Group> {
  const group = await prisma.group.findUnique({ where: { inviteCode }, include: groupInclude });
  if (!group) throw new NotFoundError('Invite link is invalid or expired');

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing) throw new ConflictError('You are already a member of this group');

  await prisma.groupMember.create({ data: { groupId: group.id, userId, role: 'MEMBER' } });
  const updated = await prisma.group.findUnique({ where: { id: group.id }, include: groupInclude });
  return formatGroup(updated!);
}

export async function removeMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
  const requester = await assertMember(groupId, requesterId);
  if (requesterId !== targetUserId && requester.role !== 'ADMIN') {
    throw new ForbiddenError('Only admins can remove other members');
  }
  const target = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
  if (!target) throw new NotFoundError('Member');
  if (target.role === 'ADMIN') {
    const adminCount = await prisma.groupMember.count({ where: { groupId, role: 'ADMIN' } });
    if (adminCount <= 1) throw new AppError('Cannot remove the last admin', 400);
  }
  await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: targetUserId } } });
}

export async function promoteMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
  await assertAdmin(groupId, requesterId);
  const target = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
  if (!target) throw new NotFoundError('Member');
  await prisma.groupMember.update({ where: { groupId_userId: { groupId, userId: targetUserId } }, data: { role: 'ADMIN' } });
}
