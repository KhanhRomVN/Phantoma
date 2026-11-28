import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { ProfilesController } from '../controllers/profiles.controller';

// ASSUMED: URL paths keep the /profiles prefix because the renderer (profile-api.service.ts) still calls it
export function createProfilesRoutes(c: ProfilesController): Router {
  const router = express.Router();

  router.get('/profiles', handle(c.list));
  router.post('/profiles', handle(c.create));
  router.post('/profiles/bulk', handle(c.createMany));
  router.post('/profiles/bulk-delete', handle(c.removeMany));
  router.post('/profiles/bulk-update', handle(c.bulkUpdate));
  router.post('/profiles/transfer', handle(c.transfer));
  router.post('/profiles/transfer/preview', handle(c.previewTransfer));
  router.get('/profiles/:id', handle(c.get));
  router.put('/profiles/:id', handle(c.update));
  router.delete('/profiles/:id', handle(c.remove));
  router.post('/profiles/:id/open-folder', handle(c.openFolder));

  return router;
}