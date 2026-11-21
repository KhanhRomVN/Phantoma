/**
 * ------------------------------------------------------------------
 * Async Handler
 * ------------------------------------------------------------------
 * Wraps a (possibly async) route handler so any thrown error or rejected
 * promise is forwarded to the global error-handler middleware via next().
 * Removes the repetitive try/catch → next(err) boilerplate from controllers.
 * ------------------------------------------------------------------
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

type Handler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

export const asyncHandler =
  (handler: Handler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
