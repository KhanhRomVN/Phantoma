import express, { Router } from 'express';
import { sessionService } from '../services/session.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

const BASE = '/profiles/:profileId/sessions';

export function registerSessionRoutes(): Router {
  const router = express.Router();

  router.get(
    BASE,
    handle(async (req, res) => json(res, 200, await sessionService.list(param(req.params.profileId)))),
  );
  router.get(
    `${BASE}/:id`,
    handle(async (req, res) =>
      json(res, 200, await sessionService.get(param(req.params.profileId), param(req.params.id))),
    ),
  );
  router.post(
    BASE,
    handle(async (req, res) =>
      json(res, 201, await sessionService.start(param(req.params.profileId), req.body ?? {})),
    ),
  );
  router.put(
    `${BASE}/:id`,
    handle(async (req, res) =>
      json(
        res,
        200,
        await sessionService.update(param(req.params.profileId), param(req.params.id), req.body ?? {}),
      ),
    ),
  );
  router.post(
    `${BASE}/:id/end`,
    handle(async (req, res) =>
      json(res, 200, await sessionService.end(param(req.params.profileId), param(req.params.id))),
    ),
  );
  router.delete(
    `${BASE}/:id`,
    handle(async (req, res) => {
      await sessionService.remove(param(req.params.profileId), param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );

  return router;
}