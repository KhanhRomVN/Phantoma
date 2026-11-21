import express, { Router } from 'express';
import { checkService } from '../services/check.service';
import { proxyService } from '../services/proxy.service';
import { vpnService } from '../services/vpn.service';
import { AppError, handle, json, param, requireString } from '../utils/http';

function idList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new AppError('ids must be a non-empty array', 400);
  return value.map(String);
}

export function registerProxyRoutes(): Router {
  const router = express.Router();

  router.get(
    '/proxies',
    handle((req, res) => {
      const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
      json(res, 200, [...proxyService.list({ sourceId }), ...vpnService.proxies(sourceId)]);
    }),
  );
  router.get('/proxies/events', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    const onUpdate = (proxy: unknown): void => {
      res.write(`data: ${JSON.stringify(proxy)}\n\n`);
    };
    checkService.events.on('update', onUpdate);
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      checkService.events.off('update', onUpdate);
    });
  });
  router.get(
    '/proxies/keys',
    handle((_req, res) => json(res, 200, proxyService.keys())),
  );
  router.post(
    '/proxies',
    handle((req, res) => json(res, 201, proxyService.create(req.body ?? {}))),
  );
  router.post(
    '/proxies/import',
    handle((req, res) => {
      const items = req.body?.items;
      if (!Array.isArray(items) || items.length === 0) throw new AppError('items must be a non-empty array', 400);
      json(res, 201, proxyService.createMany(requireString(req.body?.sourceId, 'sourceId'), items));
    }),
  );
  router.post(
    '/proxies/test',
    handle(async (req, res) => {
      const ids = idList(req.body?.ids);
      const live = ids.filter((id) => id.startsWith('vpn:'));
      const stored = ids.filter((id) => !id.startsWith('vpn:'));
      const [a, b] = await Promise.all([checkService.testMany(stored), vpnService.testProxies(live)]);
      json(res, 200, [...a, ...b]);
    }),
  );
  router.post(
    '/proxies/bulk-delete',
    handle((req, res) => json(res, 200, { deleted: proxyService.removeMany(req.body?.ids) })),
  );

  router.get(
    '/proxies/:id',
    handle((req, res) => {
      const id = param(req.params.id);
      const live = id.startsWith('vpn:') ? vpnService.proxy(id) : null;
      json(res, 200, live ?? proxyService.get(id));
    }),
  );
  router.put(
    '/proxies/:id',
    handle((req, res) => json(res, 200, proxyService.update(param(req.params.id), req.body ?? {}))),
  );
  router.delete(
    '/proxies/:id',
    handle((req, res) => {
      proxyService.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );
  router.post(
    '/proxies/:id/test',
    handle(async (req, res) => json(res, 200, await checkService.test(param(req.params.id)))),
  );
  return router;
}