import { Request, RequestHandler, Response } from 'express';

export const handle =
  (fn: (req: Request, res: Response) => void | Promise<void>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

export const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? v[0] : (v ?? '');