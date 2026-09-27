import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshTtlMs,
} from '../../shared/jwt';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../shared/errors';
import type { RegisterBody, LoginBody, AuthResponse, UserPublic } from '@roomsplit/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPublicUser(user: { id: string; name: string; email: string; avatarUrl: string | null; createdAt: Date }): UserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

function issueTokens(userId: string, email: string) {
  const accessToken  = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId, email });
  return { accessToken, refreshToken };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function register(body: RegisterBody): Promise<AuthResponse & { refreshToken: string }> {
  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      name: body.name.trim(),
      passwordHash,
    },
  });

  const { accessToken, refreshToken } = issueTokens(user.id, user.email);

  // Store hashed refresh token
  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export async function login(body: LoginBody): Promise<AuthResponse & { refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const { accessToken, refreshToken } = issueTokens(user.id, user.email);

  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export async function refresh(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(oldRefreshToken);
  const tokenHash = hashToken(oldRefreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.userId !== payload.sub) {
    throw new UnauthorizedError('Refresh token not recognised');
  }
  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { tokenHash } });
    throw new UnauthorizedError('Refresh token expired');
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { tokenHash } });

  const { accessToken, refreshToken: newRefreshToken } = issueTokens(payload.sub, payload.email);

  await prisma.refreshToken.create({
    data: {
      userId:    payload.sub,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function getMe(userId: string): Promise<UserPublic> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  return toPublicUser(user);
}

export async function updateProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string }
): Promise<UserPublic> {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return toPublicUser(user);
}
