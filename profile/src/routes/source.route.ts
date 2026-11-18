import express, { Router } from 'express';
import { sourceService } from '../services/source.service';
import { transferJobService } from '../services/transfer-job.service';
import { importJobService } from '../services/import-job.service';
import { param } from '../utils/guard';
import { AppError, handle, json, requireString } from '../utils/http';
import { validateFolder } from '../utils/system';
import { previewImportFolder, readImportFile } from '../services/import-preview.service';

export function registerSourceRoutes(): Router {
  const router = express.Router();

  router.get(
    '/sources',
    handle(async (_req, res) => {
      await sourceService.reconcile();
      json(res, 200, await sourceService.list());
    }),
  );
  router.post(
    '/sources',
    handle(async (req, res) => json(res, 201, await sourceService.create(req.body ?? {}))),
  );
  router.post(
    '/sources/import',
    handle(async (req, res) => json(res, 201, await sourceService.importExisting(req.body ?? {}))),
  );
  router.post(
    '/sources/sync',
    handle(async (req, res) => {
      const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
      json(res, 200, await sourceService.syncLocal(sourceId));
    }),
  );
  router.get(
    '/sources/:id',
    handle(async (req, res) => json(res, 200, await sourceService.get(param(req.params.id)))),
  );
  router.post(
    '/sources/:id/sync',
    handle(async (req, res) => json(res, 200, await sourceService.sync(param(req.params.id)))),
  );
  router.put(
    '/sources/:id',
    handle(async (req, res) =>
      json(res, 200, await sourceService.update(param(req.params.id), req.body ?? {})),
    ),
  );
  router.delete(
    '/sources/:id',
    handle(async (req, res) => {
      await sourceService.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    }),
  );

  router.post(
    '/system/validate-folder',
    handle(async (req, res) => json(res, 200, await validateFolder(requireString(req.body?.path, 'path')))),
  );

  router.post(
    '/system/preview-source',
    handle(async (req, res) => json(res, 200, await sourceService.preview({ path: requireString(req.body?.path, 'path') }))),
  );
  router.post(
    '/system/preview-import-folder',
    handle(async (req, res) => json(res, 200, previewImportFolder(requireString(req.body?.path, 'path')))),
  );
  router.post(
    '/system/read-import-file',
    handle(async (req, res) => json(res, 200, readImportFile(requireString(req.body?.path, 'path')))),
  );

  router.post(
    '/profiles/transfer/jobs',
    handle(async (req, res) => {
      const { ids, targetId, mode, policy, policies } = req.body ?? {};
      if (!Array.isArray(ids) || ids.length === 0) throw new AppError('ids must be a non-empty array', 400);
      if (mode !== 'move' && mode !== 'duplicate') throw new AppError('mode must be move or duplicate', 400);
      json(
        res,
        202,
        transferJobService.start({
          ids,
          targetId: requireString(targetId, 'targetId'),
          mode,
          policy: String(policy ?? ''),
          policies: policies && typeof policies === 'object' ? policies : undefined,
        }),
      );
    }),
  );
  router.get(
    '/profiles/transfer/jobs/:id',
    handle(async (req, res) => json(res, 200, transferJobService.get(param(req.params.id)))),
  );
  router.post(
    '/profiles/transfer/jobs/:id/cancel',
    handle(async (req, res) => json(res, 200, transferJobService.cancel(param(req.params.id)))),
  );

  router.post(
    '/profiles/import/jobs',
    handle(async (req, res) => {
      const { path: folderPath, targetId, folders } = req.body ?? {};
      if (!Array.isArray(folders) || folders.length === 0) throw new AppError('folders must be a non-empty array', 400);
      json(
        res,
        202,
        importJobService.start({
          path: requireString(folderPath, 'path'),
          targetId: requireString(targetId, 'targetId'),
          folders: folders.map(String),
        }),
      );
    }),
  );
  router.get(
    '/profiles/import/jobs/:id',
    handle(async (req, res) => json(res, 200, importJobService.get(param(req.params.id)))),
  );
  router.post(
    '/profiles/import/jobs/:id/cancel',
    handle(async (req, res) => json(res, 200, importJobService.cancel(param(req.params.id)))),
  );

  return router;
}