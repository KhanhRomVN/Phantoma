import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { fail } from '../http/envelope';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function requireToken(token: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!token || req.method === 'OPTIONS') {
      next();
      return;
    }
    const header = req.headers.authorization ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!safeEqual(provided, token)) {
      fail(res, 401, 'Unauthorized');
      return;
    }
    next();
  };
}