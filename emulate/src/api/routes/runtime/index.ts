/**
 * Runtime router — aggregates every /runtime/* sub-router.
 */

import { Router } from 'express';
import { createRuntimeProcessRoutes } from './runtime-process.routes';
import { createCdpRoutes } from './cdp.routes';
import { createEbpfRoutes } from './ebpf.routes';
import { createMobileRoutes } from './mobile.routes';

export function createRuntimeRoutes(): Router {
  const router = Router();

  router.use('/mobile', createMobileRoutes());
  router.use(createRuntimeProcessRoutes());
  router.use(createCdpRoutes());
  router.use(createEbpfRoutes());

  return router;
}
