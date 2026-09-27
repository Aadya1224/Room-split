import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UnauthorizedError } from './errors';

export interface JwtPayload {
  sub: string;   // userId
  email: string;
  iat?: number;
  exp?: number;
}

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL     = process.env.JWT_ACCESS_TTL  ?? '15m';
const REFRESH_TTL    = process.env.JWT_REFRESH_TTL ?? '30d';

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
}

/** Hash a token for safe DB storage */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Parse refresh token TTL string to milliseconds */
export function refreshTtlMs(): number {
  const ttl = REFRESH_TTL;
  const unit = ttl.slice(-1);
  const value = parseInt(ttl.slice(0, -1), 10);
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    default:  return 30 * 24 * 60 * 60 * 1000;
  }
}
