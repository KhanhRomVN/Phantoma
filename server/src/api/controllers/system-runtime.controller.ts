/**
 * Controller cho các tab "Runtime": processes, services, containers, ports.
 */

import type { AppContainer } from '../../bootstrap/container';
import { PROCESS_LIMIT_DEFAULT, PROCESS_LIMIT_MAX, SERVICE_ACTIONS } from '../../constants';
import { AppError } from '../../errors/app.error';
import type { ServiceStatus } from '../../types/system.type';
import { sendSuccess } from '../../utils/http-response.util';
import { param, queryEnum, queryInt, queryString } from '../../utils/request.util';
import { asyncHandler } from '../middleware/async-handler.middleware';

export function createSystemRuntimeController(c: AppContainer) {
  return {
    processes: asyncHandler(async (req, res) => {
      const list = await c.processes.list({
        sort: queryEnum(req.query.sort, ['cpu', 'mem', 'pid'] as const) ?? 'cpu',
        query: queryString(req.query.query),
        limit: queryInt(req.query.limit, {
          fallback: PROCESS_LIMIT_DEFAULT,
          min: 1,
          max: PROCESS_LIMIT_MAX,
        }),
      });
      sendSuccess(res, list);
    }),

    services: asyncHandler(async (req, res) => {
      const status = queryEnum<ServiceStatus>(req.query.status, ['running', 'stopped', 'failed']);
      sendSuccess(
        res,
        await c.serviceManager.list({ query: queryString(req.query.query), status }),
      );
    }),

    controlService: asyncHandler(async (req, res) => {
      const action = queryEnum(param(req.params.action), SERVICE_ACTIONS);
      if (!action) throw new AppError(`action must be one of: ${SERVICE_ACTIONS.join(', ')}`, 400);
      const name = param(req.params.name);
      sendSuccess(res, { name, action, service: await c.serviceManager.control(name, action) });
    }),

    containers: asyncHandler(async (_req, res) => sendSuccess(res, await c.docker.list())),

    ports: asyncHandler(async (req, res) =>
      sendSuccess(res, await c.ports.list(queryString(req.query.query))),
    ),
  };
}
