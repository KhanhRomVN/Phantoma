import express, { Router } from 'express';
import {
  browsingEntryService,
  deviceActivityService,
  emailService,
  footprintService,
  scriptRunService,
} from '../services/email.service';
import { sourceService } from '../services/source.service';
import {
  checkDomainSession,
  checkGoogleLogin,
  fingerprintHistory,
  getFolderInfo,
  listExecutables,
  listSavedLogins,
  parseBrowserKind,
  countPasswordReuse,
  passwords,
  readAvatar,
  readExtensionState,
  readHistory,
} from '../utils/browser-folder';
import { param } from '../utils/guard';
import { AppError, handle, json, requireString } from '../utils/http';
import { getDeviceFingerprint } from '../utils/system';

// ASSUMED: URL paths keep the /profiles prefix because the renderer (profile-api.service.ts) still calls it
const isFull = (v: unknown): boolean => v === 'true' || v === '1';

interface ChildService {
  list: (emailId: string) => Promise<unknown>;
  get: (id: string) => Promise<unknown>;
  create: (emailId: string, input: Record<string, any>) => Promise<unknown>;
  update: (id: string, input: Record<string, any>) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
}

function mountChild(router: Router, collection: string, service: ChildService): void {
  router.get(
    `/profiles/:profileId/${collection}`,
    handle(async (req, res) => json(res, 200, await service.list(param(req.params.profileId)))),
  );
  router.post(
    `/profiles/:profileId/${collection}`,
    handle(async (req, res) =>
      json(res, 201, await service.create(param(req.params.profileId), req.body ?? {})),
    ),
  );
  router.get(
    `/${collection}/:id`,
    handle(async (req, res) => json(res, 200, await service.get(param(req.params.id)))),
  );
  router.put(
    `/${collection}/:id`,
    handle(async (req, res) =>
      json(res, 200, await service.update(param(req.params.id), req.body ?? {})),
    ),
  );
  router.delete(
    `/${collection}/:id`,
    handle(async (req, res) => {
      await service.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );
}

async function requireEmail(id: string): Promise<string> {
  await emailService.get(id);
  return id;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function mountEmails(router: Router): void {
  router.get(
    '/profiles',
    handle(async (req, res) => {
      const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
      await sourceService.reconcile();
      json(res, 200, await emailService.list(sourceId, isFull(req.query.full)));
    }),
  );
  router.post(
    '/profiles',
    handle(async (req, res) => json(res, 201, await emailService.create(req.body ?? {}))),
  );
  router.post(
    '/profiles/bulk',
    handle(async (req, res) => {
      const items = req.body?.profiles;
      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('profiles must be a non-empty array', 400);
      }
      json(res, 201, await emailService.createMany(items));
    }),
  );
  router.post(
    '/profiles/bulk-delete',
    handle(async (req, res) => {
      const ids = req.body?.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('ids must be a non-empty array', 400);
      }
      json(res, 200, { deleted: await emailService.removeMany(ids) });
    }),
  );
  router.post(
    '/profiles/bulk-update',
    handle(async (req, res) => {
      const { ids, where, patch } = req.body ?? {};
      const hasIds = Array.isArray(ids) && ids.length > 0;
      const hasWhere = typeof where?.group === 'string';
      if (!hasIds && !hasWhere) throw new AppError('ids or where.group is required', 400);
      if (!patch || typeof patch !== 'object') throw new AppError('patch is required', 400);
      json(res, 200, {
        updated: await emailService.bulkUpdate({
          ids: hasIds ? ids : undefined,
          where: hasWhere ? where : undefined,
          patch,
        }),
      });
    }),
  );
  router.post(
    '/profiles/transfer',
    handle(async (req, res) => {
      const { ids, targetId, mode, policy, policies } = req.body ?? {};
      if (!Array.isArray(ids) || ids.length === 0)
        throw new AppError('ids must be a non-empty array', 400);
      if (mode !== 'move' && mode !== 'duplicate')
        throw new AppError('mode must be move or duplicate', 400);
      json(
        res,
        200,
        await emailService.transfer({
          ids,
          targetId: requireString(targetId, 'targetId'),
          mode,
          policy: String(policy ?? ''),
          policies: policies && typeof policies === 'object' ? policies : undefined,
        }),
      );
    }),
  );
  router.post(
    '/profiles/transfer/preview',
    handle(async (req, res) => {
      const { ids, targetId } = req.body ?? {};
      if (!Array.isArray(ids) || ids.length === 0)
        throw new AppError('ids must be a non-empty array', 400);
      json(res, 200, await emailService.previewTransfer(ids, requireString(targetId, 'targetId')));
    }),
  );
  router.get(
    '/profiles/:id',
    handle(async (req, res) =>
      json(res, 200, await emailService.get(param(req.params.id), isFull(req.query.full))),
    ),
  );
  router.put(
    '/profiles/:id',
    handle(async (req, res) => {
      json(res, 200, await emailService.update(param(req.params.id), req.body ?? {}));
    }),
  );
  router.delete(
    '/profiles/:id',
    handle(async (req, res) => {
      if (!(await emailService.remove(param(req.params.id))))
        throw new AppError('email not found', 404);
      json(res, 200, { deleted: true });
    }),
  );
  router.post(
    '/profiles/:id/open-folder',
    handle(async (req, res) => json(res, 200, await emailService.openFolder(param(req.params.id)))),
  );
}

function mountChildren(router: Router): void {
  mountChild(router, 'footprints', footprintService);
  mountChild(router, 'scripts', scriptRunService);
  mountChild(router, 'devices', deviceActivityService);
  mountChild(router, 'activity', browsingEntryService);

  router.get(
    '/profiles/:profileId/browsing',
    handle(async (req, res) => {
      const from = req.query.from !== undefined ? Number(req.query.from) : undefined;
      const to = req.query.to !== undefined ? Number(req.query.to) : undefined;
      if ((from !== undefined && Number.isNaN(from)) || (to !== undefined && Number.isNaN(to))) {
        throw new AppError('from/to must be unix ms timestamps', 400);
      }
      json(res, 200, await browsingEntryService.listInRange(param(req.params.profileId), from, to));
    }),
  );
  router.delete(
    '/profiles/:profileId/browsing',
    handle(async (req, res) =>
      json(res, 200, { deleted: await browsingEntryService.clear(param(req.params.profileId)) }),
    ),
  );
}

function mountBrowser(router: Router): void {
  router.get(
    '/browser/executables',
    handle((_req, res) => json(res, 200, listExecutables())),
  );
  router.get(
    '/system/device-fingerprint',
    handle(async (_req, res) => json(res, 200, await getDeviceFingerprint())),
  );

  router.get(
    '/profiles/:id/folder',
    handle(async (req, res) =>
      json(res, 200, getFolderInfo(await requireEmail(param(req.params.id)))),
    ),
  );
  router.get(
    '/profiles/:id/avatar',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      json(res, 200, { avatar: readAvatar(id, parseBrowserKind(req.query.browser)) });
    }),
  );
  router.get(
    '/profiles/:id/google-login',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      json(res, 200, checkGoogleLogin(id, parseBrowserKind(req.query.browser)));
    }),
  );
  router.get(
    '/profiles/:id/domain-session',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      const domain = requireString(req.query.domain, 'domain');
      json(res, 200, checkDomainSession(id, parseBrowserKind(req.query.browser), domain));
    }),
  );
  router.get(
    '/profiles/:id/saved-logins',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      json(res, 200, listSavedLogins(id, parseBrowserKind(req.query.browser)));
    }),
  );
  router.get(
    '/profiles/:id/extension-state',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      json(res, 200, readExtensionState(id, parseBrowserKind(req.query.browser)));
    }),
  );
  router.get(
    '/profiles/:id/history',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      const date = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date();
      if (Number.isNaN(date.getTime())) throw new AppError('invalid date', 400);
      const from = startOfDay(date);
      json(res, 200, readHistory(id, from, from + 24 * 60 * 60 * 1000));
    }),
  );

  router.post(
    '/passwords/reuse',
    handle(async (req, res) => {
      const password = requireString(req.body?.password, 'password');
      const ids = (await emailService.list()).map((p: { id: string }) => p.id);
      json(res, 200, { count: countPasswordReuse(ids, password) });
    }),
  );
  router.get(
    '/profiles/:id/passwords',
    handle(async (req, res) =>
      json(res, 200, passwords.list(await requireEmail(param(req.params.id)))),
    ),
  );
  router.post(
    '/profiles/:id/passwords',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      const url = requireString(req.body?.url, 'url');
      const password = requireString(req.body?.password, 'password');
      json(res, 201, passwords.add(id, { url, username: req.body?.username, password }));
    }),
  );
  router.put(
    '/profiles/:id/passwords/:passwordId',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      const url = requireString(req.body?.url, 'url');
      const password = requireString(req.body?.password, 'password');
      const ok = passwords.update(id, param(req.params.passwordId), {
        url,
        username: req.body?.username,
        password,
      });
      if (!ok) throw new AppError('password not found', 404);
      json(res, 200, { updated: true });
    }),
  );
  router.delete(
    '/profiles/:id/passwords/:passwordId',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      if (!passwords.remove(id, param(req.params.passwordId))) {
        throw new AppError('password not found', 404);
      }
      json(res, 200, { deleted: true });
    }),
  );

  router.get(
    '/profiles/:id/fingerprint-history',
    handle(async (req, res) =>
      json(res, 200, fingerprintHistory.list(await requireEmail(param(req.params.id)))),
    ),
  );
  router.delete(
    '/profiles/:id/fingerprint-history/:entryId',
    handle(async (req, res) => {
      const id = await requireEmail(param(req.params.id));
      if (!fingerprintHistory.remove(id, param(req.params.entryId))) {
        throw new AppError('fingerprint history entry not found', 404);
      }
      json(res, 200, { deleted: true });
    }),
  );
}

export function registerEmailRoutes(): Router {
  const router = express.Router();
  mountEmails(router);
  mountChildren(router);
  mountBrowser(router);
  return router;
}
