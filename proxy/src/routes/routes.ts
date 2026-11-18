import express, { Router } from 'express';
import { registerProxyRoutes } from './proxy.route';
import { registerSourceRoutes } from './source.route';
import { registerVpnRoutes } from './vpn.route';
import { registerWarpRoutes } from './warp.route';

export function registerRoutes(): Router {
  const router = express.Router();
  router.use(registerSourceRoutes());
  router.use(registerProxyRoutes());
  router.use(registerVpnRoutes());
  router.use(registerWarpRoutes());
  return router;
}