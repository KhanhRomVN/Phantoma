import { AppError } from '../../errors/app.error';
import type { AppContainer } from '../../bootstrap/container';
import { sendSuccess } from '../../utils/http-response.util';
import { param } from '../../utils/request.util';
import { asyncHandler } from '../middleware/async-handler.middleware';

export function createBrowserController({ browserFork, browserUpdate }: AppContainer) {
  return {
    listForks: asyncHandler(async (_req, res) => sendSuccess(res, await browserFork.list())),

    forkPath: asyncHandler(async (req, res) => {
      const exe = browserFork.findPath(param(req.params.id));
      if (!exe) throw new AppError('fork build not found', 404);
      sendSuccess(res, { path: exe });
    }),

    updateStatus: asyncHandler(async (_req, res) => sendSuccess(res, await browserUpdate.status())),

    checkUpdates: asyncHandler(async (_req, res) =>
      sendSuccess(res, await browserUpdate.status(true)),
    ),

    installUpdate: asyncHandler(async (req, res) => {
      const version = typeof req.body?.version === 'string' ? req.body.version : undefined;
      sendSuccess(res, await browserUpdate.install(param(req.params.id), version), 202);
    }),
  };
}
