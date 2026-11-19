import express, { Router } from 'express';
import { vpnService } from '../services/vpn.service';
import { handle, json, param } from '../utils/http';

export function registerVpnRoutes(): Router {
  const router = express.Router();

  router.get(
    '/vpn/providers',
    handle((_req, res) => json(res, 200, vpnService.providers())),
  );
  router.get(
    '/vpn/accounts',
    handle((_req, res) => json(res, 200, vpnService.list())),
  );
  router.post(
    '/vpn/accounts',
    handle((req, res) => json(res, 201, vpnService.create(req.body ?? {}))),
  );
  router.get(
    '/vpn/accounts/:id',
    handle((req, res) => json(res, 200, vpnService.get(param(req.params.id)))),
  );
  router.put(
    '/vpn/accounts/:id',
    handle((req, res) => json(res, 200, vpnService.update(param(req.params.id), req.body ?? {}))),
  );
  router.delete(
    '/vpn/accounts/:id',
    handle((req, res) => {
      vpnService.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );
  router.post(
    '/vpn/accounts/:id/activate',
    handle(async (req, res) => json(res, 200, await vpnService.activate(param(req.params.id), req.body ?? {}))),
  );
  router.post(
    '/vpn/accounts/:id/start',
    handle(async (req, res) => json(res, 200, await vpnService.start(param(req.params.id), req.body ?? {}))),
  );
  router.post(
    '/vpn/accounts/:id/stop',
    handle((req, res) => json(res, 200, vpnService.stop(param(req.params.id)))),
  );

  return router;
}