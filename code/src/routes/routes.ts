import { Router } from 'express';
import { registerProjectRoutes } from './project.route';
import { registerGroupRoutes } from './group.route';
import { registerScopeRoutes } from './scope.route';
import { registerSessionRoutes } from './session.route';
import { registerTaskRoutes } from './task.route';
import { registerFsRoutes } from './fs.route';
import { registerGitRoutes } from './git.route';
import { registerSearchRoutes } from './search.route';
import { registerPrRoutes } from './pull-request.route';

export function registerRoutes(): Router {
  const router = Router();
  router.use(registerProjectRoutes());
  router.use(registerGroupRoutes());
  router.use(registerScopeRoutes());
  router.use(registerSessionRoutes());
  router.use(registerTaskRoutes());
  router.use(registerFsRoutes());
  router.use(registerGitRoutes());
  router.use(registerSearchRoutes());
  router.use(registerPrRoutes());
  return router;
}