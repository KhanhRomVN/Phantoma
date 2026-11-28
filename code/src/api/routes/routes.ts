import { Router } from 'express';
import { ApiControllers } from '../controllers/controller-set';
import { registerProjectRoutes } from './project.route';
import { registerGroupRoutes } from './group.route';
import { registerScopeRoutes } from './scope.route';
import { registerSessionRoutes } from './session.route';
import { registerTaskRoutes } from './task.route';
import { registerFsRoutes } from './fs.route';
import { registerGitRoutes } from './git.route';
import { registerSearchRoutes } from './search.route';
import { registerPrRoutes } from './pull-request.route';

export function registerRoutes(controllers: ApiControllers): Router {
  const router = Router();
  router.use(registerProjectRoutes(controllers.project));
  router.use(registerGroupRoutes(controllers.group));
  router.use(registerScopeRoutes(controllers.scope));
  router.use(registerSessionRoutes(controllers.session));
  router.use(registerTaskRoutes(controllers.task));
  router.use(registerFsRoutes(controllers.fs));
  router.use(registerGitRoutes(controllers.git));
  router.use(registerSearchRoutes(controllers.search));
  router.use(registerPrRoutes(controllers.pullRequest));
  return router;
}