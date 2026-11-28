import { Request, Response, RequestHandler } from 'express';

export const handle =
  (fn: (req: Request, res: Response) => void | Promise<void>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };