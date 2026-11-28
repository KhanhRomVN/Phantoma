import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type {
  ChildHandlers,
  ProfileActivityController,
} from '../controllers/profile-activity.controller';

function mountChild(router: Router, collection: string, h: ChildHandlers): void {
  router.get(`/profiles/:profileId/${collection}`, handle(h.list));
  router.post(`/profiles/:profileId/${collection}`, handle(h.create));
  router.get(`/${collection}/:id`, handle(h.get));
  router.put(`/${collection}/:id`, handle(h.update));
  router.delete(`/${collection}/:id`, handle(h.remove));
}

export function createProfileActivityRoutes(c: ProfileActivityController): Router {
  const router = express.Router();

  mountChild(router, 'footprints', c.footprints);
  mountChild(router, 'scripts', c.scripts);
  mountChild(router, 'devices', c.devices);
  mountChild(router, 'activity', c.activity);

  router.get('/profiles/:profileId/browsing', handle(c.listBrowsing));
  router.delete('/profiles/:profileId/browsing', handle(c.clearBrowsing));

  return router;
}