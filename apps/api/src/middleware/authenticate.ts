import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../shared/jwt';
import { UnauthorizedError } from '../shared/errors';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No bearer token provided');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
