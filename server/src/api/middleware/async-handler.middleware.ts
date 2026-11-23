import type { Request, RequestHandler, Response } from 'express';

/** Bọc handler async: lỗi (throw / reject) được chuyển sang error-handler middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response) => void | Promise<void>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
