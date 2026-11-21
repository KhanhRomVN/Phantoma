/**
 * ------------------------------------------------------------------
 * Proxy Routes (mounted at the application root)
 * ------------------------------------------------------------------
 *   POST   /sessions                  Create a proxy session
 *   DELETE /sessions/:id              Stop a session
 *   POST   /sessions/stop-all         Stop every session
 *   POST   /sessions/:id/intercept    Toggle intercept mode
 *   POST   /breakpoints/rules         Set breakpoint rules
 *   POST   /breakpoints/resolve       Resolve a pending breakpoint
 *   POST   /requests/:id/forward      Forward a paused request
 *   POST   /requests/:id/drop         Drop a paused request
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { proxyController } from '../controllers/proxy.controller';

export function createProxyRoutes(): Router {
  const router = Router();

  // Sessions
  router.post('/sessions', proxyController.createSession);
  router.post('/sessions/stop-all', proxyController.stopAllSessions);
  router.delete('/sessions/:id', proxyController.stopSession);
  router.post('/sessions/:id/intercept', proxyController.setIntercept);

  // Breakpoints
  router.post('/breakpoints/rules', proxyController.setBreakpointRules);
  router.post('/breakpoints/resolve', proxyController.resolveBreakpoint);

  // Paused requests (intercept mode)
  router.post('/requests/:id/forward', proxyController.forwardRequest);
  router.post('/requests/:id/drop', proxyController.dropRequest);

  return router;
}
