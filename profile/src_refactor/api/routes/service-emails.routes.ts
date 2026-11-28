import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { ServiceEmailsController } from '../controllers/service-emails.controller';

const BASE = '/profiles/:profileId/service-emails';

export function createServiceEmailsRoutes(c: ServiceEmailsController): Router {
  const router = express.Router();

  router.get(BASE, handle(c.list));
  router.post(BASE, handle(c.create));
  router.put(`${BASE}/:id`, handle(c.update));
  router.delete(`${BASE}/:id`, handle(c.remove));

  return router;
}