import express, { Router } from 'express';
import { PullRequestController } from '../controllers/pull-request.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerPrRoutes(c: PullRequestController): Router {
  const router = express.Router();

  router.get('/pr/status', handle(c.status));
  router.post('/pr/login-token', handle(c.loginToken));
  router.post('/pr/login-web', handle(c.loginWeb));
  router.post('/pr/login-web/cancel', handle(c.cancelLoginWeb));
  router.get('/pr/list', handle(c.list));
  router.post('/pr', handle(c.create));
  router.get('/pr/:number', handle(c.view));
  router.get('/pr/:number/diff', handle(c.diff));
  router.post('/pr/:number/merge', handle(c.merge));
  router.post('/pr/:number/close', handle(c.close));
  router.post('/pr/:number/reopen', handle(c.reopen));
  router.post('/pr/:number/ready', handle(c.ready));
  router.post('/pr/:number/comment', handle(c.comment));
  router.post('/pr/:number/review', handle(c.review));

  return router;
}