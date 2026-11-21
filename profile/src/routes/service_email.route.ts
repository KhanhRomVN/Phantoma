import express, { Router } from 'express';
import { serviceEmailService } from '../services/service_email.service';
import { param } from '../utils/guard';
import { handle, json } from '../utils/http';

const BASE = '/profiles/:profileId/service-emails';

export function registerServiceEmailRoutes(): Router {
  const router = express.Router();

  router.get(
    BASE,
    handle(async (req, res) => json(res, 200, await serviceEmailService.list(param(req.params.profileId)))),
  );
  router.post(
    BASE,
    handle(async (req, res) =>
      json(res, 201, await serviceEmailService.create(param(req.params.profileId), req.body ?? {})),
    ),
  );
  router.put(
    `${BASE}/:id`,
    handle(async (req, res) =>
      json(
        res,
        200,
        await serviceEmailService.update(param(req.params.profileId), param(req.params.id), req.body ?? {}),
      ),
    ),
  );
  router.delete(
    `${BASE}/:id`,
    handle(async (req, res) => {
      await serviceEmailService.remove(param(req.params.profileId), param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );

  return router;
}