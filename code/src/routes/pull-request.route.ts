import express, { Router } from 'express';
import { prService } from '../services/pull-request/pull-request.service';
import { param, safePath } from '../utils/guard';
import { handle, json } from '../utils/http';

const root = (value: unknown): string => safePath(value, 'root', { withinProject: true });
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export function registerPrRoutes(): Router {
  const router = express.Router();

  router.get(
    '/pr/status',
    handle(async (req, res) => {
      json(res, 200, await prService.status(root(req.query.root)));
    }),
  );

  router.post(
    '/pr/login-token',
    handle(async (req, res) => {
      json(res, 200, await prService.loginToken(root(req.body?.root), req.body?.token));
    }),
  );

  router.post(
    '/pr/login-web',
    handle(async (req, res) => {
      json(res, 200, await prService.loginWeb(root(req.body?.root)));
    }),
  );

  router.post(
    '/pr/login-web/cancel',
    handle((_req, res) => {
      json(res, 200, prService.cancelLoginWeb());
    }),
  );

  router.get(
    '/pr/list',
    handle(async (req, res) => {
      json(res, 200, await prService.list(root(req.query.root), text(req.query.state), Number(req.query.limit) || undefined));
    }),
  );

  router.post(
    '/pr',
    handle(async (req, res) => {
      const { title, body, base, head, draft, push } = req.body ?? {};
      json(res, 200, await prService.create(root(req.body?.root), { title, body, base, head, draft, push }));
    }),
  );

  router.get(
    '/pr/:number',
    handle(async (req, res) => {
      json(res, 200, await prService.view(root(req.query.root), Number(param(req.params.number))));
    }),
  );

  router.get(
    '/pr/:number/diff',
    handle(async (req, res) => {
      json(res, 200, await prService.diff(root(req.query.root), Number(param(req.params.number))));
    }),
  );

  router.post(
    '/pr/:number/merge',
    handle(async (req, res) => {
      const n = Number(param(req.params.number));
      json(res, 200, await prService.merge(root(req.body?.root), n, text(req.body?.method), req.body?.deleteBranch === true));
    }),
  );

  router.post(
    '/pr/:number/close',
    handle(async (req, res) => {
      json(res, 200, await prService.close(root(req.body?.root), Number(param(req.params.number)), text(req.body?.comment)));
    }),
  );

  router.post(
    '/pr/:number/reopen',
    handle(async (req, res) => {
      json(res, 200, await prService.reopen(root(req.body?.root), Number(param(req.params.number))));
    }),
  );

  router.post(
    '/pr/:number/ready',
    handle(async (req, res) => {
      json(res, 200, await prService.ready(root(req.body?.root), Number(param(req.params.number))));
    }),
  );

  router.post(
    '/pr/:number/comment',
    handle(async (req, res) => {
      json(res, 200, await prService.comment(root(req.body?.root), Number(param(req.params.number)), text(req.body?.body)));
    }),
  );

  router.post(
    '/pr/:number/review',
    handle(async (req, res) => {
      const n = Number(param(req.params.number));
      json(res, 200, await prService.review(root(req.body?.root), n, text(req.body?.action) ?? '', text(req.body?.body)));
    }),
  );

  return router;
}