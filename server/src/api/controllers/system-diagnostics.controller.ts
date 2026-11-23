/**
 * Controller cho các tab "Health": logs, alerts, security.
 */

import type { AppContainer } from '../../bootstrap/container';
import { LOG_LIMIT_DEFAULT, LOG_LIMIT_MAX } from '../../constants';
import { AppError } from '../../errors/app.error';
import { sendSuccess } from '../../utils/http-response.util';
import { param, queryEnum, queryInt, queryString } from '../../utils/request.util';
import { asyncHandler } from '../middleware/async-handler.middleware';

export function createSystemDiagnosticsController(c: AppContainer) {
  return {
    logs: asyncHandler(async (req, res) => {
      const since = queryInt(req.query.since, { fallback: -1, min: -1 });
      sendSuccess(
        res,
        await c.logs.read({
          limit: queryInt(req.query.limit, {
            fallback: LOG_LIMIT_DEFAULT,
            min: 1,
            max: LOG_LIMIT_MAX,
          }),
          level: queryEnum(req.query.level, ['info', 'warn', 'error', 'debug'] as const),
          query: queryString(req.query.query),
          since: since >= 0 ? since : undefined,
        }),
      );
    }),

    alerts: asyncHandler(async (_req, res) => sendSuccess(res, await c.alerts.snapshot())),

    setAlertRule: asyncHandler(async (req, res) => {
      if (typeof req.body?.enabled !== 'boolean') {
        throw new AppError('body must be { "enabled": boolean }', 400);
      }
      sendSuccess(res, c.alerts.setRuleEnabled(param(req.params.id), req.body.enabled));
    }),

    security: asyncHandler(async (req, res) =>
      sendSuccess(res, await c.security.report(queryString(req.query.refresh) === 'true')),
    ),
  };
}
