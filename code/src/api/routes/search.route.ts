import express, { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerSearchRoutes(c: SearchController): Router {
  const router = express.Router();

  router.get('/search/stream', handle(c.stream));
  router.post('/search/cancel', handle(c.cancel));

  return router;
}