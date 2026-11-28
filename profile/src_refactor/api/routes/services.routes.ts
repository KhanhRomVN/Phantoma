import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { ServicesController } from '../controllers/services.controller';

export function createServicesRoutes(c: ServicesController): Router {
  const router = express.Router();

  router.get('/services', handle(c.list));
  router.post('/services', handle(c.create));
  router.get('/services/:id', handle(c.get));
  router.put('/services/:id', handle(c.update));
  router.delete('/services/:id', handle(c.remove));

  return router;
}