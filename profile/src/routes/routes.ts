import express, { Router } from 'express';
import { registerBrowserRunRoutes } from './browser-run.route';
import { registerBrowserUpdateRoutes } from './browser-update.route';
import { registerEmailRoutes } from './email.route';
import { registerQueryRoutes } from './query.route';
import { registerServiceEmailRoutes } from './service_email.route';
import { registerServiceRoutes } from './service.route';
import { registerSessionRoutes } from './session.route';
import { registerSourceRoutes } from './source.route';

export function registerRoutes(): Router {
  const router = express.Router();
  router.use(registerSourceRoutes());
  router.use(registerEmailRoutes());
  router.use(registerServiceRoutes());
  router.use(registerQueryRoutes());
  router.use(registerServiceEmailRoutes());
  router.use(registerSessionRoutes());
  router.use(registerBrowserRunRoutes());
  router.use(registerBrowserUpdateRoutes());
  return router;
}